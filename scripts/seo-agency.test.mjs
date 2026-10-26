import test from 'node:test';
import assert from 'node:assert/strict';
import { readGscExport, rankCandidates, renderAgencyReport } from './seo-agency.mjs';

const queriesCsv = [
  'Top queries,Clicks,Impressions,CTR,Position',
  'OSSALT,150,200,75%,1',
  'notion alternative,10,1200,0.83%,8.5',
  'n8n vs activepieces,1,450,0.22%,3.2',
  'bad data,invalid,300,0%,9',
].join('\n');
const pagesCsv = [
  '上位のページ,クリック数,表示回数,CTR,掲載順位',
  'https://ossalt.jp/alternatives/notion/,20,1500,1.33%,12',
  'https://ossalt.jp/compare/n8n-activepieces/,1,250,0.4%,3',
  'https://evil.example/other/,20,1000,2%,10',
].join('\n');

test('brand searches are excluded from query rows but not silently from page exports', () => {
  const result = readGscExport(queriesCsv, 'query');
  assert.equal(result.brandExcluded, 1);
  assert.equal(result.skipped, 1);
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].label, 'notion alternative');
});

test('page export validates OSSALT URLs and supports Japanese GSC columns', () => {
  const result = readGscExport(pagesCsv, 'page');
  assert.equal(result.rows.length, 2);
  assert.equal(result.skipped, 1);
  assert.equal(rankCandidates(result).length, 2);
  assert.equal(rankCandidates(result)[0].label, 'https://ossalt.jp/alternatives/notion/');
});

test('report distinguishes page and query aggregates and labels unverified page brand filter', () => {
  const report = renderAgencyReport({
    queries: readGscExport(queriesCsv, 'query'),
    pages: readGscExport(pagesCsv, 'page'),
    period: '2026-07 to 2026-09',
    generatedAt: '2026-10-27'
  });
  assert.match(report, /未確認：ブランド検索/);
  assert.match(report, /クエリとページを/);
  assert.match(report, /notion alternative/);
  assert.doesNotMatch(report, /OSSALT \|/);
  assert.match(report, /2026-10-27/);
});

test('reports explicit confirmation without pretending it was independently verified', () => {
  const report = renderAgencyReport({
    queries: readGscExport(queriesCsv, 'query'),
    pages: readGscExport(pagesCsv, 'page'),
    pagesNonbrandConfirmed: true
  });
  assert.match(report, /ユーザーがGSC画面で適用したと申告/);
  assert.match(report, /CSV単体では検証不可/);
});

test('invalid CSV metrics and missing dimension fail without inventing measurements', () => {
  assert.throws(() => readGscExport('Top queries,Clicks\nx,1', 'query'), /missing GSC column/);
  assert.equal(readGscExport('Top pages,Clicks,Impressions,Position\n/a,1,2,3', 'page').skipped, 1);
  assert.throws(() => rankCandidates({ rows: [] }, 0), /limit must/);
});

test('one CSV with positions but no eligible impressions has no invented quick win', () => {
  const input = 'Top queries,Clicks,Impressions,Position\nrare free crm,0,12,8';
  const candidates = rankCandidates(readGscExport(input, 'query'));
  assert.deepEqual(candidates, []);
});
