#!/usr/bin/env node
/**
 * OSSALT SEO Agency: read-only, evidence-based weekly GSC triage.
 * Use manually exported Queries and Pages CSV with the same Web/date/query filters.
 * Does NOT infer query-to-page matches, publish changes, or access private accounts.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from './gsc-weekly-report.mjs';

const normalize = (s) => String(s ?? '').normalize('NFKC').toLowerCase().trim().replace(/[\\s_-]+/g, '');
const columns = {
  query: ['top queries', 'top search queries', 'query', 'queries', 'search query', '上位のクエリ', 'クエリ', '検索クエリ'],
  page: ['top pages', 'page', 'pages', 'url', '上位のページ', 'ページ'],
  clicks: ['clicks', 'クリック数', 'クリック'],
  impressions: ['impressions', '表示回数', 'インプレッション'],
  ctr: ['ctr', 'クリック率'],
  position: ['position', 'average position', 'avg. position', '掲載順位', '平均掲載順位'],
};
const findIndex = (headers, aliases) => headers.findIndex((h) => aliases.some((x) => normalize(h) === normalize(x)));

function number(value, label) {
  const n = Number(String(value ?? '').replace(/[,\\s\\u00a0]/g, ''));
  if (value == null || String(value).trim() === '' || !Number.isFinite(n) || n < 0)
    throw new Error('Invalid ' + label);
  return n;
}
function rate(value, clicks, impressions) {
  if (value == null || String(value).trim() === '') return impressions ? clicks / impressions : 0;
  const raw = String(value).trim();
  const n = number(raw.replace(/%$/, ''), 'CTR');
  const v = raw.endsWith('%') ? n / 100 : n;
  if (v > 1) throw new Error('Invalid CTR');
  return v;
}
const escapeCell = (s) => String(s).replace(/[|]/g, '\\|').replace(/[\\r\\n]/g, ' ').replace(/</g, '&lt;').slice(0, 220);
const format = (n) => new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 }).format(n);

export function readGscExport(input, kind, { brand = 'ossalt' } = {}) {
  if (!['page', 'query'].includes(kind)) throw new Error('kind must be page or query');
  const rows = parseCsv(input);
  if (rows.length < 2) throw new Error(kind + ': GSC CSV needs a header and rows');
  const headers = rows[0];
  const idx = Object.fromEntries(Object.entries(columns).map(([key, aliases]) => [key, findIndex(headers, aliases)]));
  for (const required of [kind, 'clicks', 'impressions', 'position'])
    if (idx[required] < 0) throw new Error(kind + ': missing GSC column ' + required);
  const parsed = [];
  let skipped = 0, brandExcluded = 0;
  for (const row of rows.slice(1)) {
    const label = String(row[idx[kind]] ?? '').trim();
    if (!label) { skipped++; continue; }
    // Query exports can be independently brand-filtered; page exports cannot.
    if (kind === 'query' && brand && label.toLocaleLowerCase().includes(brand.toLocaleLowerCase())) {
      brandExcluded++; continue;
    }
    try {
      const clicks = number(row[idx.clicks], 'clicks');
      const impressions = number(row[idx.impressions], 'impressions');
      const position = number(row[idx.position], 'position');
      const ctr = rate(idx.ctr < 0 ? undefined : row[idx.ctr], clicks, impressions);
      if (position < 1 || clicks > impressions || impressions === 0) { skipped++; continue; }
      if (kind === 'page') {
        const url = new URL(label);
        if (url.protocol !== 'https:' || !['ossalt.jp', 'www.ossalt.jp'].includes(url.hostname)) {
          skipped++; continue;
        }
      }
      parsed.push({ label, kind, clicks, impressions, ctr, position });
    } catch { skipped++; }
  }
  return { kind, rows: parsed, examined: rows.length - 1, skipped, brandExcluded };
}

export function rankCandidates(exportData, limit = 5) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error('limit must be 1..50');
  return exportData.rows.flatMap((r) => {
    if (r.impressions < 100) return [];
    let reason, priority;
    if (r.position >= 5 && r.position <= 20) {
      reason = '順位5〜20位：検索意図・内部リンク・内容を検証';
      priority = r.impressions * 1.2;
    } else if (r.position < 5 && r.ctr < 0.02) {
      reason = '上位表示かつCTR低め：実際の検索結果とタイトルを検証';
      priority = r.impressions;
    } else if (r.position > 20 && r.position <= 40 && r.impressions >= 500) {
      reason = '表示機会は多いが順位が遠い：勝てる検索意図か調査';
      priority = r.impressions * 0.5;
    } else return [];
    // Paths are a business relevance hint, NOT a claim of conversions.
    const money = r.kind === 'page' && /\\/(alternatives|compare|licenses)\\//.test(r.label);
    return [{ ...r, reason, score: priority * (money ? 1.15 : 1) }];
  }).sort((a, b) => b.score - a.score || b.impressions - a.impressions || a.label.localeCompare(b.label)).slice(0, limit);
}

function table(items) {
  const lines = ['| 対象 | 表示 | クリック | CTR | 平均順位 | 次に確認すること |',
    '| --- | ---: | ---: | ---: | ---: | --- |'];
  for (const r of items) lines.push('| ' + [
    escapeCell(r.label), format(r.impressions), format(r.clicks),
    (r.ctr * 100).toFixed(2) + '%', r.position.toFixed(1), escapeCell(r.reason)
  ].join(' | ') + ' |');
  if (!items.length) lines.push('| 基準に合う候補なし | — | — | — | — | 実際のデータを確認 |');
  return lines.join('\\n');
}

export function renderAgencyReport({ queries, pages, period, brand = 'ossalt', pagesNonbrandConfirmed = false, generatedAt = new Date().toISOString().slice(0, 10) }) {
  const queryCandidates = rankCandidates(queries);
  const pageCandidates = rankCandidates(pages);
  return [
    '# OSSALT SEO Agency — weekly triage', '',
    '- 生成日: ' + escapeCell(generatedAt),
    '- 集計期間（入力値・未検証）: ' + escapeCell(period || '指定なし'),
    '- ブランド除外語: ' + escapeCell(brand),
    '- ページCSVの非ブランドフィルタ: ' + (pagesNonbrandConfirmed ? 'ユーザーがGSC画面で適用したと申告（CSV単体では検証不可）' : '**未確認：ブランド検索を含む可能性あり**'),
    '- クエリ: ' + queries.examined + '行 / 読み飛ばし' + queries.skipped + '行 / ブランド除外' + queries.brandExcluded + '行',
    '- ページ: ' + pages.examined + '行 / 読み飛ばし' + pages.skipped + '行', '',
    '> これはページ集計とクエリ集計の別々の候補リストです。順位は集計平均であり、個別クエリとURLの対応やSEO施策の効果は証明しません。', '',
    '## Strategist — 非ブランド検索の検討候補', '',
    table(queryCandidates), '',
    '## Strategist — ページ別の改善検討候補', '',
    table(pageCandidates), '',
    '## Writer / Linker — 承認前の調査', '',
    '1. 対象候補のGSCでクエリとページを**両方完全一致**に絞り、実測値・対象国・デバイス・検索タイプを記録する。',
    '2. 該当市場で現在の検索結果を読み、既存のOSSALTページと検索意図を比較する。',
    '3. ライセンスや機能、OSSの更新状況を公式資料で検証し、独自価値があるときだけBRIEF_TEMPLATE.mdを埋める。',
    '4. 存在する関連URLから自然な内部リンクを提案する（数合わせはしない）。', '',
    '## Technician / Analyst — release gate', '',
    '- 本番コンテンツやindex設定の自動変更なし。必要ならPRを作り、オーナー承認後に公開。',
    '- sitemap / canonical / noindex / ビルド / 表示 / 一次情報を検証し、根拠を記録。',
    '- agency/LEDGER.mdに公開日と変更前データを記録。28日後の兆候・約90日後の方向性を比較（Googleの固定ルールではない）。',
    '- クリックと表示回数をコンバージョンや売上と混同しない。変換データが無ければ「未計測」。', ''
  ].join('\\n');
}

function argumentsFrom(argv) {
  const opts = { brand: 'ossalt', pagesNonbrandConfirmed: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--pages-nonbrand-confirmed') { opts.pagesNonbrandConfirmed = true; continue; }
    const flags = { '--queries': 'queries', '--pages': 'pages', '--period': 'period', '--brand': 'brand', '--out': 'out' };
    if (!flags[argv[i]] || !argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('Invalid argument: ' + argv[i]);
    opts[flags[argv[i]]] = argv[++i];
  }
  if (!opts.queries || !opts.pages) throw new Error('Both --queries and --pages are required. See agency/README.md');
  if (!opts.brand.trim()) throw new Error('Brand cannot be empty');
  return opts;
}

async function main() {
  const opts = argumentsFrom(process.argv.slice(2));
  const [queryCsv, pageCsv] = await Promise.all([readFile(resolve(opts.queries), 'utf8'), readFile(resolve(opts.pages), 'utf8')]);
  const markdown = renderAgencyReport({
    queries: readGscExport(queryCsv, 'query', { brand: opts.brand }),
    pages: readGscExport(pageCsv, 'page'),
    period: opts.period, brand: opts.brand, pagesNonbrandConfirmed: opts.pagesNonbrandConfirmed,
  });
  if (opts.out) {
    await mkdir(dirname(resolve(opts.out)), { recursive: true });
    await writeFile(resolve(opts.out), markdown, 'utf8');
    console.log('SEO候補レポートを保存: ' + opts.out);
  } else console.log(markdown);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]))
  main().catch((e) => { console.error('SEO Agency: ' + e.message); process.exitCode = 1; });
