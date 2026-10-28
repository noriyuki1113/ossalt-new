#!/usr/bin/env node
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const metrics = {
  clicks: ['clicks', 'クリック数', 'クリック'],
  impressions: ['impressions', '表示回数', 'インプレッション'],
  ctr: ['ctr', 'クリック率'],
  position: ['position', 'average position', 'avg. position', '掲載順位', '平均掲載順位'],
};
const pageHeaders = ['top pages', 'page', 'pages', 'url', '上位のページ', 'ページ'];
const queryHeaders = ['top queries', 'top search queries', 'query', 'queries', 'search query', '上位のクエリ', 'クエリ', '検索クエリ'];
const norm = (s) => String(s ?? '').normalize('NFKC').toLowerCase().trim().replace(/[\s_-]+/g, '');
const findColumn = (headers, aliases) => headers.findIndex((h) => aliases.some((a) => norm(h) === norm(a)));

export function parseCsv(input, { delimiter = ',' } = {}) {
  const s = String(input).replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') {
      if (quoted && s[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === delimiter && !quoted) {
      row.push(cell); cell = '';
    } else if ((ch === '\r' || ch === '\n') && !quoted) {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (quoted) throw new Error('CSVの引用符が閉じられていません');
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

function parseNumber(value, field) {
  const s = String(value ?? '').trim().replace(/[\s,\u00A0]/g, '');
  if (!s) throw new Error(`${field}が空です`);
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${field}が数値ではありません: ${value}`);
  return n;
}
function parseCtr(value, clicks, impressions) {
  if (value == null || String(value).trim() === '') return impressions ? clicks / impressions : 0;
  const s = String(value).trim();
  const n = parseNumber(s.replace(/%$/, ''), 'CTR');
  const rate = s.endsWith('%') ? n / 100 : n;
  if (rate > 1) throw new Error(`CTRが範囲外です: ${s}`);
  return rate;
}

export function analyzeCsv(csv, { top = 5 } = {}) {
  const rows = parseCsv(csv);
  if (rows.length < 2) throw new Error('ヘッダーとデータ行を含むGSCのCSVが必要です');
  const headers = rows[0];
  const ix = Object.fromEntries(Object.entries(metrics).map(([key, aliases]) => [key, findColumn(headers, aliases)]));
  if (ix.clicks < 0 || ix.impressions < 0 || ix.position < 0)
    throw new Error('GSCのクリック数・表示回数・掲載順位の列が必要です');
  const pIdx = findColumn(headers, pageHeaders);
  const qIdx = findColumn(headers, queryHeaders);
  const kind = pIdx >= 0 ? 'page' : qIdx >= 0 ? 'query' : 'unknown';
  const labelIdx = pIdx >= 0 ? pIdx : qIdx >= 0 ? qIdx : headers.findIndex((_, i) => !Object.values(ix).includes(i));
  if (labelIdx < 0) throw new Error('対象ページまたは検索クエリの列を特定できません');
  let skipped = 0;
  const findings = [];
  for (const line of rows.slice(1)) {
    try {
      const label = (line[labelIdx] ?? '').trim();
      if (!label) { skipped++; continue; }
      const clicks = parseNumber(line[ix.clicks], 'クリック数');
      const impressions = parseNumber(line[ix.impressions], '表示回数');
      const position = parseNumber(line[ix.position], '掲載順位');
      const ctr = parseCtr(ix.ctr >= 0 ? line[ix.ctr] : null, clicks, impressions);
      if (impressions === 0) continue;
      let action;
      let recommendation;
      if (impressions >= 100 && position >= 1 && position <= 10 && ctr < 0.02) {
        action = 'CTRの改善候補';
        recommendation = '検索意図とページ内容を照合し、タイトル・説明文の改善を検討する';
      } else if (impressions >= 100 && position > 10 && position <= 30) {
        action = 'コンテンツの強化候補';
        recommendation = '関連する比較情報・独自データ・内部リンクの不足を確認する';
      } else if (impressions >= 50 && clicks === 0) {
        action = '検索意図の確認候補';
        recommendation = '検索意図とのずれとインデックス・表示状況を確認する';
      } else continue;
      const weight = action === 'CTRの改善候補' ? 1.3 : action === 'コンテンツの強化候補' ? 1 : 0.6;
      const priority = impressions * weight;
      findings.push({ label, kind, clicks, impressions, ctr, position, action, recommendation, priority });
    } catch { skipped++; }
  }
  findings.sort((a, b) => b.priority - a.priority || b.impressions - a.impressions || a.label.localeCompare(b.label));
  return { kind, examined: rows.length - 1, skipped, totalCandidates: findings.length, findings: findings.slice(0, Math.max(1, Math.min(50, top))) };
}

const safeCell = (s) => String(s).replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ').replace(/</g, '&lt;').slice(0, 220);
const fmt = (n) => new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 }).format(n);

export function renderMarkdown(report, { period = 'CSVの対象期間（未指定）', source = 'GSC CSV' } = {}) {
  const type = report.kind === 'page' ? 'ページ別' : report.kind === 'query' ? 'クエリ別' : '項目別';
  const lines = [
    '# OSSALT｜週間SEOアクションプラン', '',
    `- データ: ${safeCell(source)}（${type}）`,
    `- 集計期間: ${safeCell(period)}`,
    `- 読み取った行数: ${fmt(report.examined)} / 除外行: ${fmt(report.skipped)}`,
    `- 改善候補: ${fmt(report.totalCandidates)}件（上位${report.findings.length}件を表示）`, '',
    '※ 順位・CTRはCSVの実測値です。改善候補の優先順位は独自の簡易ルールであり、流入増加を保証しません。',
    '※ クエリ別CSVだけでは、改善対象のURLは特定できません。ページ別データと照合してください。', '',
    '| 優先 | 対象 | 表示 | クリック | CTR | 平均順位 | 改善案 |',
    '| ---: | --- | ---: | ---: | ---: | ---: | --- |',
  ];
  report.findings.forEach((r, i) => lines.push(`| ${i + 1} | ${safeCell(r.label)} | ${fmt(r.impressions)} | ${fmt(r.clicks)} | ${(r.ctr * 100).toFixed(1)}% | ${r.position.toFixed(1)} | ${r.action}: ${r.recommendation} |`));
  if (!report.findings.length) lines.push('| — | 条件に合う候補なし | — | — | — | — | 実測値・対象期間を確認する |');
  lines.push('', '## 実施ルール', '', '1. Search Consoleのページ／クエリデータと実ページを照合する。', '2. 事実・ライセンス・製品仕様を公式情報で検証する。', '3. 変更はGitHub PRでレビューし、承認してから公開する。', '4. 公開日を記録して、28日以上の変化を同じ条件で比較する。', '');
  return lines.join('\n');
}

function cliArgs(args) {
  const out = { top: 5 };
  for (let i = 0; i < args.length; i++) {
    if (['--input', '--out', '--period', '--top'].includes(args[i]) && args[i + 1]) {
      out[({ '--input': 'input', '--out': 'out', '--period': 'period', '--top': 'top' })[args[i]]] = args[++i];
    } else throw new Error(`不明な引数: ${args[i]}`);
  }
  if (!out.input) throw new Error('--input にGSCのCSVファイルを指定してください');
  if (!Number.isInteger(Number(out.top)) || Number(out.top) < 1 || Number(out.top) > 50) throw new Error('--top は1〜50の整数を指定してください');
  return out;
}

async function main() {
  const args = cliArgs(process.argv.slice(2));
  const csv = await readFile(resolve(args.input), 'utf8');
  const analysis = analyzeCsv(csv, { top: Number(args.top) });
  const md = renderMarkdown(analysis, { period: args.period, source: args.input });
  if (args.out) {
    await mkdir(dirname(resolve(args.out)), { recursive: true });
    await writeFile(resolve(args.out), md, 'utf8');
    console.log(`作成しました: ${args.out}`);
  } else console.log(md);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((err) => { console.error(`GSCレポート生成失敗: ${err.message}`); process.exitCode = 1; });
}
