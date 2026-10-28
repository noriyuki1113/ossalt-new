import test from 'node:test';
import assert from 'node:assert/strict';
import { readGscExport, decodeBuffer, detectDelimiter, renderAgencyReport, renderNoDataReport, rankCandidates } from './seo-agency.mjs';
import { classifyQuery, rankRows, ctrMedianByBand, bandOf, patternSummary } from './seo-priority.mjs';

test('BOM・引用符・改行・全角数字・欠損値のあるCSVを読める', () => {
  const csv = '﻿"上位のクエリ","クリック数","表示回数","CTR","掲載順位"\r\n' +
    '"notion, 代替","1,234","12,345","10.00%","3.5"\r\n' +
    '"複数行\nのクエリ",5,６００,"0.83%",8\r\n' +   // 全角数字・引用符内の改行
    '"欠損",,300,1%,5\r\n' +                          // clicksが空 → 読み飛ばし（0にしない）
    ',1,100,1%,5\r\n';                                // クエリが空
  const r = readGscExport(csv, 'query');
  assert.equal(r.rows.length, 2);
  assert.equal(r.rows[0].label, 'notion, 代替');
  assert.equal(r.rows[0].clicks, 1234);
  assert.equal(r.rows[1].impressions, 600);
  assert.equal(r.skipped, 2);
});

test('英語ヘッダー・タブ区切り・セミコロン区切りも読める', () => {
  assert.equal(detectDelimiter('Query\tClicks\tImpressions\tCTR\tPosition'), '\t');
  assert.equal(detectDelimiter('"a,b";c;d'), ';');
  const tsv = 'Query\tClicks\tImpressions\tCTR\tPosition\nnotion alternative\t3\t300\t1%\t7.2';
  assert.equal(readGscExport(tsv, 'query').rows[0].position, 7.2);
});

test('UTF-16LE（BOMあり）のファイルを文字列にできる', () => {
  const buf = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('クエリ,クリック数\n', 'utf16le')]);
  assert.equal(decodeBuffer(buf), 'クエリ,クリック数\n');
  assert.equal(decodeBuffer(Buffer.from('﻿abc', 'utf8')).replace(/^﻿/, ''), 'abc');
});

test('クエリ×ページのCSVは、URLとクエリの対応を保ち、ブランド検索と他サイトのURLを除く', () => {
  const csv = [
    'クエリ,ページ,クリック数,表示回数,CTR,掲載順位',
    'notion 代替,https://ossalt.jp/alternatives/notion/,5,500,1%,9',
    'ossalt notion,https://ossalt.jp/alternatives/notion/,50,60,83%,1',
    'notion 代替,https://other.example/x/,5,500,1%,9',
  ].join('\n');
  const r = readGscExport(csv, 'pair');
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].query, 'notion 代替');
  assert.equal(r.rows[0].page, 'https://ossalt.jp/alternatives/notion/');
  assert.equal(r.brandExcluded, 1);
  assert.equal(r.skipped, 1);
  assert.throws(() => readGscExport('クエリ,クリック数,表示回数,掲載順位\na,1,2,3', 'pair'), /missing GSC column page/);
});

test('不正な値（CTR>100%、クリック>表示、順位0）は補わず読み飛ばす', () => {
  const csv = 'Query,Clicks,Impressions,CTR,Position\na,1,100,150%,5\nb,200,100,1%,5\nc,1,100,1%,0\nd,1,100,1%,5';
  const r = readGscExport(csv, 'query');
  assert.deepEqual(r.rows.map((x) => x.label), ['d']);
  assert.equal(r.skipped, 3);
});

test('検索パターンの分類（分類であって需要の判定ではない）', () => {
  assert.equal(classifyQuery('n8n vs activepieces').id, 'vs');
  assert.equal(classifyQuery('Notion 代替').id, 'alternative');
  assert.equal(classifyQuery('slack オープンソース').id, 'opensource');
  assert.equal(classifyQuery('mattermost セルフホスト').id, 'selfhost');
  assert.equal(classifyQuery('AGPL 商用利用').id, 'license');
  assert.equal(classifyQuery('immich docker 導入').id, 'install');
  assert.equal(classifyQuery('天気').id, 'other');
});

test('CTRの比較は入力データ内の同じ順位帯の中央値だけを使い、行が少ない帯は比べない', () => {
  const rows = Array.from({ length: 6 }, (_, i) => ({ position: 2, impressions: 100, ctr: 0.1 + i * 0.01 }));
  const bands = ctrMedianByBand(rows);
  assert.equal(bandOf(2), '1-3');
  assert.ok(Math.abs(bands['1-3'] - 0.125) < 1e-9);
  assert.equal(bands['4-7'], null);
});

test('採点：各係数に実測／仮説の区分が付き、転送ページ・noindexは対象外になる', () => {
  const rows = [
    { label: 'notion 代替 → page', kind: 'pair', query: 'notion 代替', page: 'https://ossalt.jp/alternatives/notion/', clicks: 5, impressions: 900, ctr: 0.0055, position: 9 },
    { label: 'moved', kind: 'pair', query: 'chef 代替', page: 'https://ossalt.jp/alternatives/chef/', clicks: 5, impressions: 900, ctr: 0.0055, position: 9 },
  ];
  const state = (p) => (p === '/alternatives/chef/' ? { refresh: '/alternatives/', noindex: false } : { refresh: null, noindex: false });
  const { items } = rankRows(rows, { siteState: state });
  const top = items[0];
  assert.equal(top.query, 'notion 代替');
  assert.ok(top.factors.every((f) => f.kind === '実測' || f.kind === '仮説'));
  assert.ok(top.factors.some((f) => f.kind === '実測') && top.factors.some((f) => f.kind === '仮説'));
  const moved = items.find((i) => i.query === 'chef 代替');
  assert.equal(moved.score, 0);
  assert.match(moved.blocked, /転送ページ/);
  assert.ok(items.indexOf(top) < items.indexOf(moved));
});

test('同じ入力からは同じ順位（再現可能）', () => {
  const rows = Array.from({ length: 30 }, (_, i) => ({ label: `q${i}`, kind: 'query', clicks: i, impressions: 100 + i * 13, ctr: 0.01, position: 5 + (i % 15) }));
  assert.deepEqual(rankRows(rows, { limit: 10 }).items.map((x) => x.label), rankRows([...rows].reverse(), { limit: 10 }).items.map((x) => x.label));
});

test('データ未取得のレポートは、数値を載せず、取得手順を示す', () => {
  const md = renderNoDataReport({ generatedAt: '2026-10-27' });
  assert.match(md, /未取得/);
  assert.doesNotMatch(md, /\d+\s*クリック|表示回数\s*[:：]\s*\d/);
  assert.match(md, /agency\/data\/queries\.csv/);
});

test('週次レポート：クエリ×ページが無いときは「未取得」と明記し、パターンの内訳を出す', () => {
  const q = readGscExport('Query,Clicks,Impressions,CTR,Position\nnotion 代替,5,900,0.5%,9\nn8n vs x,1,300,0.3%,6', 'query');
  const p = readGscExport('Page,Clicks,Impressions,CTR,Position\nhttps://ossalt.jp/alternatives/notion/,5,900,0.5%,9', 'page');
  const md = renderAgencyReport({ queries: q, pages: p, generatedAt: '2026-10-27' });
  assert.match(md, /クエリ×ページ: \*\*未取得\*\*/);
  assert.match(md, /検索パターンの内訳/);
  assert.match(md, /実測/);
  assert.ok(patternSummary(q.rows).length >= 2);
  assert.equal(rankCandidates(q, 1).length, 1);
});

import { readDaily, classifyPageUrls } from './seo-agency.mjs';
import { resolveMinImpressions } from './seo-priority.mjs';

test('日付別CSV（日本語の見出し）を、7日ごとの週の合計にする。端数の日は週に含めない', () => {
  const lines = ['日付,クリック数,表示回数,CTR,掲載順位'];
  for (let d = 1; d <= 16; d++) lines.push(`2026-10-${String(d).padStart(2, '0')},${d},${d * 10},1%,10`);
  const r = readDaily(lines.join('\n'));
  assert.equal(r.days.length, 16);
  assert.equal(r.weeks.length, 2);
  assert.equal(r.weeks[0].impressions, (1 + 2 + 3 + 4 + 5 + 6 + 7) * 10);
  assert.equal(r.weeks[1].from, '2026-10-08');
  assert.throws(() => readDaily('クエリ,クリック数\na,1'), /missing GSC column/);
});

test('表示回数のしきい値：小さなサイトでは下げ、その理由を残す。指定も受け付ける', () => {
  const small = [{ impressions: 3000 }];
  assert.equal(resolveMinImpressions(small).value, 30);
  assert.match(resolveMinImpressions(small).reason, /小さなサイト/);
  assert.equal(resolveMinImpressions([{ impressions: 80_000 }]).value, 100);
  assert.equal(resolveMinImpressions(small, '15').value, 15);
  assert.throws(() => resolveMinImpressions(small, '0'), /1以上/);
});

test('GSCのURLを、現在のページ・転送ページ・存在しないページに分け、末尾スラッシュ無しを別に数える', () => {
  const state = (p) => ({
    '/a/': { exists: true, refresh: null, noindex: false },
    '/old/': { exists: true, refresh: '/a/', noindex: false },
  }[p] ?? { exists: false, refresh: null, noindex: false });
  const row = (url, impressions) => ({ label: url, impressions, clicks: 1, position: 5 });
  const g = classifyPageUrls([row('https://ossalt.jp/a/', 10), row('https://ossalt.jp/old', 5), row('https://ossalt.jp/gone', 2), row('https://ossalt.jp/a', 1)], state);
  assert.equal(g.live.length, 2);
  assert.deepEqual(g.redirect.map((x) => x.slash), [false]);
  assert.equal(g.missing[0].path, '/gone');
  assert.equal(g.live.filter((x) => !x.slash).length, 1);
});
