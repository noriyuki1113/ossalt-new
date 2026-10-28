import test from 'node:test';
import assert from 'node:assert/strict';
import { slugifyCompetitor as tsSlug } from '../src/lib/tools.ts';
import { slugifyCompetitor, splitCompareSlug, linkCandidates, toolRelations } from './seo-links.mjs';
import { extractPage } from './seo-audit-lib.mjs';

const html = (links = [], robots = 'index, follow') => `<html lang="ja"><head><title>t</title><meta name="robots" content="${robots}"></head><body><h1>h</h1>${links.map((l) => `<a href="${l}">x</a>`).join('')}</body></html>`;
const pages = (o) => new Map(Object.entries(o).map(([k, v]) => [k, extractPage(v)]));
const tools = [
  { id: 'a', name: 'A', primary_competitor: 'Notion', category: 'docs' },
  { id: 'b-c', name: 'B-C', primary_competitor: 'Notion', category: 'docs' },
  { id: 'z', name: 'Z', primary_competitor: 'Slack', also_competitors: ['Notion'], category: 'chat' },
];

test('slugifyCompetitorは src/lib/tools.ts と同じ結果を返す（規則の二重管理を検知する）', () => {
  for (const n of ['Notion', 'Google Analytics', 'マネーフォワード', '調整さん', 'Adobe Acrobat (OCR)', 'ChatGPT Plus', 'freee', 'Node.js']) assert.equal(slugifyCompetitor(n), tsSlug(n), n);
});

test('比較ページのslugは、両方が実在するidに分けられるときだけ分ける', () => {
  const ids = new Set(['a', 'b-c', 'z']);
  assert.deepEqual(splitCompareSlug('a-vs-b-c', ids), ['a', 'b-c']);
  assert.equal(splitCompareSlug('a-vs-nope', ids), null);
  assert.deepEqual(toolRelations(tools[2]).alternatives, ['slack', 'notion']);
});

test('代替ページへの候補：関連するのに未リンクの実在ページだけを、理由つきで返す', () => {
  const p = pages({
    '/alternatives/notion/': html(['/tools/a/']),
    '/tools/a/': html(['/alternatives/notion/']),        // すでにリンク済み → 候補に出ない
    '/tools/b-c/': html([]),                              // 未リンク → 候補
    '/tools/z/': html([]),                                // also_competitors で関連 → 候補
    '/compare/a-vs-b-c/': html([]),                       // 同じ代替どうしの比較 → 候補
    '/tools/gone/': html([], 'noindex'),                  // noindex は候補にしない
  });
  const r = linkCandidates({ target: '/alternatives/notion/', pages: p, tools });
  assert.deepEqual(r.candidates.map((c) => c.path).sort(), ['/compare/a-vs-b-c/', '/tools/b-c/', '/tools/z/']);
  assert.equal(r.inboundNow, 1);
  assert.ok(r.candidates.every((c) => c.reasons.length > 0));
});

test('存在しない対象・対応しない種類のパスは、推測せずエラーにする', () => {
  const p = pages({ '/tools/a/': html() });
  assert.throws(() => linkCandidates({ target: '/alternatives/none/', pages: p, tools }), /存在しません/);
  assert.throws(() => linkCandidates({ target: '/tools/a/x/', pages: pages({ '/tools/a/x/': html() }), tools }), /いずれか/);
});
