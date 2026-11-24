// Zero-dependency Bluesky publisher. D1 is the source of truth; never blindly retry.
const PDS = 'https://bsky.social';
const COLLECTION = 'app.bsky.feed.post';
const HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const encoder = new TextEncoder();

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: HEADERS });
}
function authorized(request, env) {
  const value = request.headers.get('authorization');
  return !!env.ADMIN_TOKEN && value === `Bearer ${env.ADMIN_TOKEN}`;
}
function validDay(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '')) return false;
  const date = new Date(`${day}T03:15:00.000Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().startsWith(day);
}
function postTime(day) { return `${day}T03:15:00.000Z`; }
function recordKey(day) { return `ossalt${day.replaceAll('-', '')}`; }
function facets(body) {
  const hits = [];
  for (const match of body.matchAll(/https:\/\/[^\s<>]+/g)) {
    const url = match[0].replace(/[.,!?、。]+$/, '');
    const offset = match.index;
    hits.push({
      index: {
        byteStart: encoder.encode(body.slice(0, offset)).length,
        byteEnd: encoder.encode(body.slice(0, offset) + url).length
      },
      features: [{ $type: 'app.bsky.richtext.facet#link', uri: url }]
    });
  }
  return hits;
}
async function xrpc(path, method, payload, token, pds = PDS) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${pds}/xrpc/${path}`, {
    method, headers,
    ...(method === 'POST' ? { body: JSON.stringify(payload) } : {}),
    signal: AbortSignal.timeout(15000)
  });
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = { message: raw.slice(0, 300) }; }
  if (!response.ok) throw new Error(`Bluesky HTTP ${response.status}: ${String(data.message || data.error || 'unknown').slice(0, 300)}`);
  return data;
}
async function session(env) {
  if (!env.BSKY_APP_PASSWORD || !env.BLUESKY_HANDLE) throw new Error('Bluesky credentials missing');
  const auth = await xrpc('com.atproto.server.createSession', 'POST', {
    identifier: env.BLUESKY_HANDLE, password: env.BSKY_APP_PASSWORD
  });
  if (!auth.accessJwt || !auth.did) throw new Error('Invalid Bluesky session response');
  return auth;
}
async function remoteRecord(auth, rkey) {
  const url = new URL(`${PDS}/xrpc/com.atproto.repo.getRecord`);
  url.searchParams.set('repo', auth.did);
  url.searchParams.set('collection', COLLECTION);
  url.searchParams.set('rkey', rkey);
  const response = await fetch(url.toString(), {
    headers: { authorization: `Bearer ${auth.accessJwt}` },
    signal: AbortSignal.timeout(15000)
  });
  if (response.status === 404) return null;
  const body = await response.json();
  if (!response.ok) throw new Error(`getRecord HTTP ${response.status}: ${String(body.message || body.error || 'unknown').slice(0, 300)}`);
  return body;
}
async function markPublished(env, row, result, did) {
  if (!result?.uri || !result?.cid) throw new Error('Record verification incomplete');
  const url = `https://bsky.app/profile/${did}/post/${row.rkey}`;
  await env.DB.prepare(
    "UPDATE posts SET state='published', uri=?, cid=?, public_url=?, error=NULL, updated_at=datetime('now') WHERE id=? AND state IN ('publishing','needs_review')"
  ).bind(result.uri, result.cid, url, row.id).run();
}
async function publish(env, row) {
  // CAS claim prevents parallel cron invocations from submitting twice.
  const claim = await env.DB.prepare(
    "UPDATE posts SET state='publishing', updated_at=datetime('now') WHERE id=? AND state='approved'"
  ).bind(row.id).run();
  if (claim.meta?.changes !== 1) return;
  try {
    const auth = await session(env);
    // Deterministic rkey enables reconciliation even if createRecord times out.
    const existing = await remoteRecord(auth, row.rkey);
    if (existing) {
      await markPublished(env, row, existing, auth.did);
      return;
    }
    const result = await xrpc('com.atproto.repo.createRecord', 'POST', {
      repo: auth.did, collection: COLLECTION, rkey: row.rkey,
      record: {
        $type: COLLECTION, text: row.body, createdAt: new Date().toISOString(),
        langs: ['ja'], facets: facets(row.body)
      }
    }, auth.accessJwt);
    // Verify publicly addressable record, not merely API submission.
    const verified = await remoteRecord(auth, row.rkey);
    if (!verified || verified.uri !== result.uri) throw new Error('Post submitted but verification did not match');
    await markPublished(env, row, verified, auth.did);
  } catch (error) {
    // Never automatically retry an uncertain publication outcome.
    await env.DB.prepare(
      "UPDATE posts SET state='needs_review', error=?, updated_at=datetime('now') WHERE id=? AND state='publishing'"
    ).bind(String(error?.message || error).slice(0, 500), row.id).run();
    console.error('Bluesky publisher requires manual review', row.day_jst, String(error?.message || error));
  }
}
async function runDue(env) {
  if (env.PUBLISH_ENABLED !== 'true') return;
  const now = Date.now();
  // Stale appointments must not be published late.
  await env.DB.prepare(
    "UPDATE posts SET state='needs_review', error='Scheduled time expired; no late publication', updated_at=datetime('now') WHERE state='approved' AND scheduled_at < ?"
  ).bind(new Date(now - 30 * 60 * 1000).toISOString()).run();
  const { results } = await env.DB.prepare(
    "SELECT * FROM posts WHERE state='approved' AND scheduled_at <= ? ORDER BY scheduled_at LIMIT 5"
  ).bind(new Date(now).toISOString()).all();
  for (const row of results) await publish(env, row);
}
export default {
  async scheduled(_event, env, ctx) { ctx.waitUntil(runDue(env)); },
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/health' && request.method === 'GET') return json({ service: 'ossalt-bluesky', enabled: env.PUBLISH_ENABLED === 'true' });
    if (!authorized(request, env)) return json({ error: 'Unauthorized' }, 401);
    if (path === '/posts' && request.method === 'GET') {
      const { results } = await env.DB.prepare(
        'SELECT id,day_jst,scheduled_at,state,uri,public_url,error,created_at,updated_at FROM posts ORDER BY id DESC LIMIT 50'
      ).all();
      return json({ posts: results });
    }
    if (path === '/queue' && request.method === 'POST') {
      let input;
      try { input = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
      const day = input?.day_jst, body = input?.text;
      if (!validDay(day)) return json({ error: 'day_jst must be a valid YYYY-MM-DD' }, 400);
      if (typeof body !== 'string' || !body.trim() || [...body].length > 300 || encoder.encode(body).length > 3000)
        return json({ error: 'Bluesky text must be 1-300 Unicode codepoints' }, 400);
      if ((body.match(/https?:\/\//g) || []).length > 1 || !body.includes('https://ossalt.jp/'))
        return json({ error: 'Exactly one ossalt.jp URL is required' }, 400);
      if (Date.parse(postTime(day)) <= Date.now())
        return json({ error: 'Scheduled time is in the past' }, 409);
      try {
        await env.DB.prepare(
          "INSERT INTO posts(day_jst,scheduled_at,body,rkey,state) VALUES (?,?,?,?,'approved')"
        ).bind(day, postTime(day), body, recordKey(day)).run();
      } catch (error) {
        if (String(error).includes('UNIQUE')) return json({ error: 'A post already exists for this day; no overwrite' }, 409);
        throw error;
      }
      return json({ day_jst: day, scheduled_at: postTime(day), state: 'approved' }, 201);
    }
    if (path === '/reconcile' && request.method === 'POST') {
      let input;
      try { input = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
      if (!validDay(input?.day_jst)) return json({ error: 'Invalid day' }, 400);
      const row = await env.DB.prepare('SELECT * FROM posts WHERE day_jst=?').bind(input.day_jst).first();
      if (!row) return json({ error: 'Post not found' }, 404);
      if (row.state === 'published') return json({ state: row.state, public_url: row.public_url });
      // Reconcile never creates a new post: a missing record remains a manual decision.
      try {
        const auth = await session(env);
        const found = await remoteRecord(auth, row.rkey);
        if (found) {
          await markPublished(env, row, found, auth.did);
          return json({ state: 'published', uri: found.uri });
        }
        return json({ state: row.state, record: 'not_found', action: 'manual_review_required' });
      } catch (error) {
        return json({ state: row.state, error: String(error?.message || error) }, 502);
      }
    }
    return json({ error: 'Not found' }, 404);
  }
};
