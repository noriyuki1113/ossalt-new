import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const env = {
  ADMIN_TOKEN: 'test-admin-token',
  PUBLISH_ENABLED: 'false',
  BLUESKY_HANDLE: 'ossalt.bsky.social',
  DB: {
    prepare(sql) {
      return {
        bind(...params) { return this; },
        async run() { throw new Error('Unexpected DB write'); },
        async first() { return null; },
        async all() { return { results: [] }; }
      };
    }
  }
};
const send = (path, method = 'GET', data, token = 'test-admin-token') =>
  worker.fetch(new Request('https://unit.test' + path, {
    method,
    headers: {
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(data ? { 'Content-Type': 'application/json' } : {})
    },
    ...(data ? { body: JSON.stringify(data) } : {})
  }), env);

test('health has no secrets and publisher is disabled initially', async () => {
  const result = await send('/health', 'GET', null, null);
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { service: 'ossalt-bluesky', enabled: false });
});
test('queue and audit endpoints require bearer secret', async () => {
  const result = await send('/posts', 'GET', null, null);
  assert.equal(result.status, 401);
  const queue = await send('/queue', 'POST', { day_jst: '2027-01-01', text: 'Hi https://ossalt.jp/' }, 'wrong');
  assert.equal(queue.status, 401);
});
test('no arbitrary routing and no posting without credentials', async () => {
  const result = await send('/other');
  assert.equal(result.status, 404);
  const scheduled = await worker.scheduled({}, env, { waitUntil(p) { this.promise = p; } });
  assert.equal(scheduled, undefined);
});
test('invalid and past date are rejected before DB write', async () => {
  assert.equal((await send('/queue', 'POST', { day_jst: '2026-02-30', text: 'Read https://ossalt.jp/' })).status, 400);
  assert.equal((await send('/queue', 'POST', { day_jst: '2020-01-01', text: 'Read https://ossalt.jp/' })).status, 409);
});
test('body validation prevents excess links and overly long posts', async () => {
  const day_jst = '2030-01-01';
  assert.equal((await send('/queue', 'POST', { day_jst, text: 'x'.repeat(301) + ' https://ossalt.jp/' })).status, 400);
  assert.equal((await send('/queue', 'POST', { day_jst, text: 'https://ossalt.jp/ https://other.example/' })).status, 400);
  assert.equal((await send('/queue', 'POST', { day_jst, text: 'Not a relevant link https://other.example/' })).status, 400);
});
