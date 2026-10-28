import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { parseKey, buildAssertion, getAccessToken, queryAll, rowsToCsv, dateRange, fetchAll, ROW_LIMIT } from './gsc-api-fetch.mjs';
import { parseCsv } from './gsc-weekly-report.mjs';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const key = { type: 'service_account', client_email: 'x@example.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) };
const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });

test('parseKey rejects non service-account JSON without echoing content', () => {
  assert.throws(() => parseKey('not json'), /JSON/);
  assert.throws(() => parseKey('{"type":"authorized_user"}'), /サービスアカウント/);
  assert.equal(parseKey(JSON.stringify(key)).client_email, key.client_email);
});

test('buildAssertion is a verifiable RS256 JWT with read-only scope', () => {
  const jwt = buildAssertion(key, 1000);
  const [h, c, s] = jwt.split('.');
  assert.equal(JSON.parse(Buffer.from(h, 'base64url')).alg, 'RS256');
  const claim = JSON.parse(Buffer.from(c, 'base64url'));
  assert.equal(claim.scope, 'https://www.googleapis.com/auth/webmasters.readonly');
  assert.equal(claim.exp - claim.iat, 3600);
  assert.ok(createVerify('RSA-SHA256').update(`${h}.${c}`).verify(publicKey, s, 'base64url'));
});

test('getAccessToken surfaces failures without leaking the response body', async () => {
  assert.equal(await getAccessToken(key, async () => json({ access_token: 'tok' })), 'tok');
  await assert.rejects(getAccessToken(key, async () => json({ error: 'secret-detail' }, 400)), (e) => /HTTP 400/.test(e.message) && !/secret-detail/.test(e.message));
});

test('queryAll pages until a short batch and sends read-only query', async () => {
  const calls = [];
  const full = Array.from({ length: ROW_LIMIT }, (_, i) => ({ keys: [`q${i}`], clicks: 1, impressions: 2, ctr: 0.5, position: 3 }));
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body); calls.push({ url, body, auth: init.headers.authorization });
    return json({ rows: body.startRow === 0 ? full : [{ keys: ['last'], clicks: 0, impressions: 1, ctr: 0, position: 9 }] });
  };
  const rows = await queryAll({ token: 't', site: 'sc-domain:ossalt.jp', startDate: '2026-10-01', endDate: '2026-10-28', dimensions: ['query'], fetchImpl });
  assert.equal(rows.length, ROW_LIMIT + 1);
  assert.deepEqual(calls.map((c) => c.body.startRow), [0, ROW_LIMIT]);
  assert.ok(calls[0].url.includes(encodeURIComponent('sc-domain:ossalt.jp')));
  assert.equal(calls[0].auth, 'Bearer t');
});

test('queryAll explains 403 as a permission/site-format problem', async () => {
  await assert.rejects(queryAll({ token: 't', site: 's', startDate: 'a', endDate: 'b', dimensions: ['query'], fetchImpl: async () => json({}, 403) }), /権限/);
});

test('rowsToCsv round-trips commas, quotes and Japanese through parseCsv', () => {
  const csv = rowsToCsv('pair', [{ keys: ['a, "b" ノーション', 'https://ossalt.jp/x/'], clicks: 1, impressions: 20, ctr: 0.05, position: 7.5 }]);
  const rows = parseCsv(csv);
  assert.deepEqual(rows[0], ['query', 'page', 'clicks', 'impressions', 'ctr', 'position']);
  assert.equal(rows[1][0], 'a, "b" ノーション');
  assert.equal(rows[1][3], '20');
});

test('dateRange ends 3 days before today and spans N days', () => {
  assert.deepEqual(dateRange(28, new Date('2026-10-30T00:00:00Z')), { startDate: '2026-09-30', endDate: '2026-10-27' });
});

test('fetchAll queries query, page and pair dimensions', async () => {
  const dims = [];
  const fetchImpl = async (url, init) => {
    if (url.includes('oauth2')) return json({ access_token: 't' });
    dims.push(JSON.parse(init.body).dimensions.join('+'));
    return json({ rows: [] });
  };
  const r = await fetchAll({ key, site: 's', fetchImpl, today: new Date('2026-10-30T00:00:00Z') });
  assert.deepEqual(dims, ['query', 'page', 'query+page']);
  assert.equal(r.range.endDate, '2026-10-27');
});

test('generated CSV is readable by seo-agency readGscExport (all three kinds)', async () => {
  const { readGscExport } = await import('./seo-agency.mjs');
  const q = readGscExport(rowsToCsv('query', [{ keys: ['notion 代替'], clicks: 1, impressions: 100, ctr: 0.01, position: 8 }]), 'query');
  const p = readGscExport(rowsToCsv('page', [{ keys: ['https://ossalt.jp/alternatives/notion/'], clicks: 1, impressions: 100, ctr: 0.01, position: 8 }]), 'page');
  const pr = readGscExport(rowsToCsv('pair', [{ keys: ['notion 代替', 'https://ossalt.jp/alternatives/notion/'], clicks: 1, impressions: 100, ctr: 0.01, position: 8 }]), 'pair');
  for (const r of [q, p, pr]) assert.equal((r.rows ?? r)[0].impressions, 100);
});
