import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { parseKey, buildAssertion, getAccessToken, queryAll, rowsToCsv, dateRange, fetchAll, ROW_LIMIT, listSites, resolveToken, apiMeta } from './gsc-api-fetch.mjs';
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

test('fetchAll queries query, page, pair, date and device dimensions', async () => {
  const dims = [];
  const fetchImpl = async (url, init) => {
    if (url.includes('oauth2')) return json({ access_token: 't' });
    dims.push(JSON.parse(init.body).dimensions.join('+'));
    return json({ rows: [] });
  };
  const r = await fetchAll({ key, site: 's', fetchImpl, today: new Date('2026-10-30T00:00:00Z') });
  assert.deepEqual(dims, ['query', 'page', 'query+page', 'date', 'device']);
  assert.equal(r.range.endDate, '2026-10-27');
});

test('generated CSV is readable by seo-agency readGscExport (all three kinds)', async () => {
  const { readGscExport } = await import('./seo-agency.mjs');
  const q = readGscExport(rowsToCsv('query', [{ keys: ['notion 代替'], clicks: 1, impressions: 100, ctr: 0.01, position: 8 }]), 'query');
  const p = readGscExport(rowsToCsv('page', [{ keys: ['https://ossalt.jp/alternatives/notion/'], clicks: 1, impressions: 100, ctr: 0.01, position: 8 }]), 'page');
  const pr = readGscExport(rowsToCsv('pair', [{ keys: ['notion 代替', 'https://ossalt.jp/alternatives/notion/'], clicks: 1, impressions: 100, ctr: 0.01, position: 8 }]), 'pair');
  for (const r of [q, p, pr]) assert.equal((r.rows ?? r)[0].impressions, 100);
});

test('resolveToken prefers the keyless short-lived token and never needs a key file', async () => {
  assert.equal(await resolveToken({ GSC_ACCESS_TOKEN: ' tok\n' }, async () => { throw new Error('no network'); }), 'tok');
  await assert.rejects(resolveToken({}), /GSC_ACCESS_TOKEN/);
});

test('listSites returns only url and permission, and explains 401 without the body', async () => {
  const sites = await listSites({ token: 't', fetchImpl: async () => json({ siteEntry: [{ siteUrl: 'sc-domain:ossalt.jp', permissionLevel: 'siteRestrictedUser', extra: 1 }] }) });
  assert.deepEqual(sites, [{ siteUrl: 'sc-domain:ossalt.jp', permissionLevel: 'siteRestrictedUser' }]);
  await assert.rejects(listSites({ token: 't', fetchImpl: async () => json({ error: 'secret' }, 401) }), (e) => /401/.test(e.message) && !/secret/.test(e.message));
});

test('fetchAll accepts a ready token without a key', async () => {
  const seen = [];
  await fetchAll({ token: 'abc', site: 'sc-domain:ossalt.jp', days: 7, fetchImpl: async (u, o) => { seen.push(o.headers.authorization); return json({ rows: [] }); } });
  assert.ok(seen.length === 5 && seen.every((h) => h === 'Bearer abc'));
});

test('apiMeta: 比較ツールが読む期間・条件・プロパティを明示する（互換のキーも残す）', () => {
  const m = apiMeta({ site: 'sc-domain:ossalt.jp', range: { startDate: '2026-10-26', endDate: '2026-11-22' }, counts: { query: 1 }, fetchedAt: 'x' });
  assert.equal(m.from, '2026-10-26'); assert.equal(m.to, '2026-11-22');
  assert.equal(m.property, 'sc-domain:ossalt.jp'); assert.equal(m.site, 'sc-domain:ossalt.jp');
  assert.equal(m.searchType, 'web'); assert.equal(m.country, 'all'); assert.equal(m.device, 'all'); assert.equal(m.brandFiltered, false);
  assert.equal(m.startDate, '2026-10-26');
});

test('rowsToCsv: date・device の表は、先頭の列名が date・device', () => {
  assert.match(rowsToCsv('date', [{ keys: ['2026-10-26'], clicks: 1, impressions: 10, ctr: 0.1, position: 5 }]), /^date,clicks,impressions,ctr,position\n2026-10-26,1,10,0.1,5\n$/);
  assert.match(rowsToCsv('device', [{ keys: ['MOBILE'], clicks: 1, impressions: 10, ctr: 0.1, position: 5 }]), /^device,/);
});
