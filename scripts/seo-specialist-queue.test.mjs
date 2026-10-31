import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildQueue, fixClassOf, measuringPaths, natureOf, renderQueue, MAX_LIMIT } from './seo-specialist-queue.mjs';

const page = (id, extra = {}) => ({
  id, name: id.toUpperCase(), url: `/tools/${id}/`, auditState: 'audited', grade: 'B', score: 80, archived: false,
  criteria: [{ id: 'U5', label: '導入・始め方の判断材料がある', status: 'fail' }], warnings: [], sources: [], fix: null, gsc: null, ...extra,
});
const gsc = (impressions, position, ctr = 2) => ({ clicks: Math.round((impressions * ctr) / 100), impressions, ctr, position });
const many = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));

test('検索実績が未確認のページは「暫定」で、信頼度を下げ、検索の項は0', () => {
  const r = buildQueue([page('a')], { today: '2026-10-31' });
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].provisional, true);
  assert.equal(r.items[0].search.status, '未確認');
  assert.equal(r.items[0].factors[0].value, 0);
  assert.ok(r.items[0].reliability <= 0.5);
});

test('上限は10件。11以上や0は拒否する', () => {
  const pages = many(15, (i) => page(`p${i}`, { gsc: gsc(100 + i, 8) }));
  assert.equal(buildQueue(pages, { limit: 10 }).items.length, 10);
  assert.throws(() => buildQueue(pages, { limit: 11 }));
  assert.throws(() => buildQueue(pages, { limit: 0 }));
  assert.equal(MAX_LIMIT, 10);
});

test('表示が多く順位が5〜20位のページが、表示のほとんど無いページより上に来る（同じ欠点なら）', () => {
  const base = many(8, (i) => page(`x${i}`, { gsc: gsc(40, 9) }));
  const r = buildQueue([...base, page('hot', { gsc: gsc(300, 8) }), page('cold', { gsc: gsc(2, 8) })], { today: '2026-10-31' });
  assert.equal(r.items[0].id, 'hot');
  const cold = r.items.find((i) => i.id === 'cold');
  assert.ok(!cold || cold.search.status === '対象外');
});

test('アーカイブ済み・欠点が無いページ・効果の測定中のページは候補にしない', () => {
  const ledger = { entries: [{ id: 1, date: '2026-10-28', url: 'https://ossalt.jp/tools/m/', check28: '2026-11-25', outcome28: null }] };
  const pages = [
    page('arch', { archived: true, warnings: ['archived'], gsc: gsc(200, 8) }),
    page('clean', { criteria: [], gsc: gsc(200, 8) }),
    page('m', { gsc: gsc(200, 8) }),
    page('ok', { gsc: gsc(200, 8) }),
  ];
  const r = buildQueue(pages, { ledger, today: '2026-10-31' });
  assert.deepEqual(r.items.map((i) => i.id), ['ok']);
  assert.equal(r.excluded.archived.length, 1);
  assert.equal(r.excluded.noDefect, 1);
  assert.deepEqual(r.excluded.measuring.map((m) => m.url), ['/tools/m/']);
});

test('28日の確認が済んだ変更は、測定中として外さない', () => {
  const ledger = { entries: [{ date: '2026-09-01', url: 'https://ossalt.jp/tools/z/', check28: '2026-09-29', outcome28: 'flat' }, { date: '2026-10-28', url: 'https://ossalt.jp/tools/y/', check28: '2026-11-25' }] };
  const m = measuringPaths(ledger, '2026-10-31');
  assert.ok(m.has('/tools/y/'));
  assert.ok(!m.has('/tools/z/'));
});

test('警告（ミラー・リンク切れ）は点数と別に、品質の項を押し上げる', () => {
  const plain = page('plain', { score: 57, gsc: gsc(100, 8) });
  const warned = page('warned', { score: 57, gsc: gsc(100, 8), warnings: ['mirror-source'], criteria: [{ id: 'R3', label: 'ミラーでない', status: 'fail' }] });
  const r = buildQueue([plain, warned], { today: '2026-10-31' });
  const q = (id) => r.items.find((i) => i.id === id).quality;
  assert.ok(q('warned') > q('plain'));
});

test('施策の分類：公式リンクの欠落（R2）はデータ、用語（license-term）は整合、解説なし（U1）は解説の追加', () => {
  assert.equal(fixClassOf(page('a', { criteria: [{ id: 'R2', status: 'fail' }] })).id, 'data');
  assert.equal(fixClassOf(page('a', { criteria: [], warnings: ['license-term'] })).id, 'wording');
  assert.equal(fixClassOf(page('a', { criteria: [{ id: 'U1', status: 'fail' }] })).id, 'guide');
  assert.equal(fixClassOf(page('a', { criteria: [{ id: 'C2', status: 'fail' }] })).id, 'summary');
});

test('入力を書き換えず、レポートに「仮説」「実測」の区分と、クエリと結び付けていない旨が出る', () => {
  const pages = [page('a', { gsc: gsc(120, 8) })];
  const snapshot = JSON.stringify(pages);
  const r = buildQueue(pages, { today: '2026-10-31' });
  assert.equal(JSON.stringify(pages), snapshot);
  const md = renderQueue(r, { auditId: 'x', gscSource: 'export-2026-10-28' });
  assert.match(md, /［実測］/);
  assert.match(md, /［仮説］/);
  assert.match(md, /クエリとは結び付けていない/);
  assert.match(md, /保証しません/);
});

test('共通の原因の性質：解説は個別、データは確認、index設定は承認事項', () => {
  assert.match(natureOf('crit:U5'), /解説/);
  assert.match(natureOf('crit:R3'), /オーナーの確認/);
  assert.match(natureOf('crit:S2'), /承認事項/);
  assert.match(natureOf('warn:mirror-source'), /警告/);
});
