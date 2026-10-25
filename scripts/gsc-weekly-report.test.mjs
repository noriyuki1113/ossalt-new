import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeCsv, parseCsv, renderMarkdown } from './gsc-weekly-report.mjs';

test('CRLF/BOM, quoted comma, escaped quotes and multiline cells', () => {
  const rows = parseCsv('\uFEFF"Top pages",Clicks,Impressions,CTR,Position\r\n"https://ossalt.jp/a,b",12,120,"1.5%",9\r\n"multi\n""line""",0,10,0%,40\r\n');
  assert.equal(rows[0][0], 'Top pages');
  assert.equal(rows[1][0], 'https://ossalt.jp/a,b');
  assert.equal(rows[2][0], 'multi\n"line"');
});

test('Japanese GSC page export produces grounded priority list', () => {
  const csv = '上位のページ,クリック数,表示回数,CTR,掲載順位\nhttps://ossalt.jp/alternatives/notion/,20,500,4%,15.2\nhttps://ossalt.jp/tools/n8n/,2,200,1%,5.0\nhttps://ossalt.jp/quiet/,80,100,80%,3.0\n';
  const result = analyzeCsv(csv);
  assert.equal(result.kind, 'page');
  assert.equal(result.examined, 3);
  assert.equal(result.totalCandidates, 2);
  assert.equal(result.findings[0].label, 'https://ossalt.jp/alternatives/notion/');
  assert.equal(result.findings[1].action, 'CTRの改善候補');
  assert.match(renderMarkdown(result), /500/);
});

test('query export cannot claim a specific page or create forecasts', () => {
  const r = analyzeCsv('Top queries,Clicks,Impressions,CTR,Position\n"Notion alternative",1,1000,0.1%,4\n');
  assert.equal(r.kind, 'query');
  assert.match(renderMarkdown(r), /クエリ別CSVだけでは、改善対象のURLは特定できません/);
  assert.doesNotMatch(renderMarkdown(r), /予測流入/);
});

test('reject malformed and missing columns rather than fabricating metrics', () => {
  assert.throws(() => analyzeCsv('Top pages,Clicks\n/a,10'), /表示回数/);
  assert.throws(() => parseCsv('"oops'), /引用符/);
});

test('invalid rows are counted, not ranked', () => {
  const r = analyzeCsv('Top pages,Clicks,Impressions,Position\n/a,1,not-a-number,2\n/b,0,120,22\n');
  assert.equal(r.skipped, 1);
  assert.equal(r.findings.length, 1);
});

test('CTR can be inferred from clicks/impressions when column is absent', () => {
  const r = analyzeCsv('Top pages,Clicks,Impressions,Position\n/a,1,200,6\n');
  assert.equal(r.findings[0].ctr, 0.005);
});
