#!/usr/bin/env node
/**
 * OSSALT SEO Agency: 手動エクスポートの Search Console CSV を読む、読み取り専用の週次トリアージ。
 *
 * - 入力：クエリ別CSV、ページ別CSV、（あれば）クエリ×ページCSV。いずれも手元のファイルだけ。API・認証情報は使わない。
 * - クエリ集計とページ集計を、推測で結び付けない。URLとクエリの対応が分かるのは「クエリ×ページ」のCSVだけ。
 * - 入力が無いときは、数値を作らず「未取得」のレポートを出す。指定したファイルが読めないときは、安全に停止する。
 * - ビルド済みサイト（--site out）を渡すと、候補のページが転送ページ・noindexでないかを事実として照合する。
 * 将来 Search Console API を使う場合は、取得結果を readGscExport と同じ行の形（下の ExportRow）にそろえれば、
 * 以降の処理（採点・レポート）はそのまま使える。
 *
 * ExportRow: { label, kind: 'query'|'page'|'pair', query?, page?, clicks, impressions, ctr, position }
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from './gsc-weekly-report.mjs';
import { patternSummary, rankRows } from './seo-priority.mjs';

const normalize = (s) => String(s ?? '').normalize('NFKC').toLowerCase().trim().replace(/[\s_-]+/g, '');
const columns = {
  query: ['top queries', 'top search queries', 'query', 'queries', 'search query', '上位のクエリ', 'クエリ', '検索クエリ'],
  page: ['top pages', 'page', 'pages', 'url', '上位のページ', 'ページ'],
  clicks: ['clicks', 'クリック数', 'クリック'],
  impressions: ['impressions', '表示回数', 'インプレッション'],
  ctr: ['ctr', 'クリック率'],
  position: ['position', 'average position', 'avg. position', '掲載順位', '平均掲載順位'],
};
const findIndex = (headers, aliases) => headers.findIndex((h) => aliases.some((x) => normalize(h) === normalize(x)));
export const SITE_HOSTS = ['ossalt.jp', 'www.ossalt.jp'];

/** ファイルのバイト列を文字列にする。UTF-8（BOMあり・なし）とUTF-16LE（Excelの「Unicodeテキスト」）に対応 */
export function decodeBuffer(buf) {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return buf.subarray(2).toString('utf16le');
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    const swapped = Buffer.from(buf.subarray(2)); swapped.swap16(); return swapped.toString('utf16le');
  }
  return buf.toString('utf8');
}
/** 先頭の行から区切り文字を決める（カンマ・タブ・セミコロン）。引用符の外だけを数える */
export function detectDelimiter(text) {
  const first = String(text).replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0] ?? '';
  const count = (d) => { let n = 0, q = false; for (const c of first) { if (c === '"') q = !q; else if (c === d && !q) n++; } return n; };
  const best = [',', '\t', ';'].map((d) => [d, count(d)]).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : ',';
}

function number(value, label) {
  const n = Number(String(value ?? '').normalize('NFKC').replace(/[,\s\u00a0]/g, ''));
  if (value == null || String(value).trim() === '' || !Number.isFinite(n) || n < 0) throw new Error('Invalid ' + label);
  return n;
}
function rate(value, clicks, impressions) {
  if (value == null || String(value).trim() === '') return impressions ? clicks / impressions : 0;
  const raw = String(value).normalize('NFKC').trim();
  const n = number(raw.replace(/%$/, ''), 'CTR');
  const v = raw.endsWith('%') ? n / 100 : n;
  if (v > 1) throw new Error('Invalid CTR');
  return v;
}
const escapeCell = (s) => String(s).replace(/[|]/g, '\\|').replace(/[\r\n]/g, ' ').replace(/</g, '&lt;').slice(0, 220);
const format = (n) => new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 }).format(n);
const isBrand = (text, brand) => !!brand && String(text).normalize('NFKC').toLocaleLowerCase().includes(brand.normalize('NFKC').toLocaleLowerCase());
const validOssaltUrl = (label) => {
  const url = new URL(label);
  return url.protocol === 'https:' && SITE_HOSTS.includes(url.hostname);
};

/**
 * GSCのCSVを行に直す。kind: 'query' | 'page' | 'pair'（クエリ列とページ列の両方があるCSV）。
 * 数値が不正・欠損の行は読み飛ばして skipped に数える（値を補わない）。
 */
export function readGscExport(input, kind, { brand = 'ossalt' } = {}) {
  if (!['page', 'query', 'pair'].includes(kind)) throw new Error('kind must be page, query or pair');
  const text = String(input).replace(/^\uFEFF/, '');
  const rows = parseCsv(text, { delimiter: detectDelimiter(text) });
  if (rows.length < 2) throw new Error(kind + ': GSC CSV needs a header and rows');
  const headers = rows[0];
  const idx = Object.fromEntries(Object.entries(columns).map(([key, aliases]) => [key, findIndex(headers, aliases)]));
  const required = kind === 'pair' ? ['query', 'page', 'clicks', 'impressions', 'position'] : [kind, 'clicks', 'impressions', 'position'];
  for (const r of required) if (idx[r] < 0) throw new Error(kind + ': missing GSC column ' + r);
  const parsed = [];
  let skipped = 0, brandExcluded = 0;
  for (const row of rows.slice(1)) {
    const query = idx.query >= 0 ? String(row[idx.query] ?? '').trim() : '';
    const page = idx.page >= 0 ? String(row[idx.page] ?? '').trim() : '';
    const label = kind === 'pair' ? query && page ? `${query} → ${page}` : '' : kind === 'query' ? query : page;
    if (!label) { skipped++; continue; }
    // ページだけのCSVは、行からブランド検索を見分けられない（GSC画面のフィルタで除く）
    if ((kind === 'query' || kind === 'pair') && isBrand(query, brand)) { brandExcluded++; continue; }
    try {
      const clicks = number(row[idx.clicks], 'clicks');
      const impressions = number(row[idx.impressions], 'impressions');
      const position = number(row[idx.position], 'position');
      const ctr = rate(idx.ctr < 0 ? undefined : row[idx.ctr], clicks, impressions);
      if (position < 1 || clicks > impressions || impressions === 0) { skipped++; continue; }
      if (kind !== 'query' && !validOssaltUrl(page)) { skipped++; continue; }
      parsed.push({ label, kind, ...(kind === 'pair' ? { query, page } : {}), clicks, impressions, ctr, position });
    } catch { skipped++; }
  }
  return { kind, rows: parsed, examined: rows.length - 1, skipped, brandExcluded };
}

/** 互換用：行の候補だけを返す（採点は seo-priority.mjs） */
export function rankCandidates(exportData, limit = 5, opts = {}) {
  return rankRows(exportData.rows, { limit, ...opts }).items;
}

/* ------------------------------------------------------------------ *
 * ビルド済みサイト（out/）との照合
 * ------------------------------------------------------------------ */

/** out/ のHTMLから、パスごとの { refresh, noindex } を返す関数を作る。読めなければ null（照合しない） */
export async function loadSiteState(dir) {
  try {
    const { loadSite } = await import('./seo-audit-lib.mjs');
    const site = await loadSite(resolve(dir));
    if (!site.pages.size) return null;
    return (path) => {
      const p = site.pages.get(path);
      return p ? { exists: true, refresh: p.refresh ?? null, noindex: !!p.noindex } : { exists: false, refresh: null, noindex: false };
    };
  } catch { return null; }
}

/* ------------------------------------------------------------------ *
 * レポート
 * ------------------------------------------------------------------ */

function candidateTable(result, { showQuery = false } = {}) {
  const head = showQuery ? ['順位', '対象', '表示', 'クリック', 'CTR', '平均順位', '施策案・根拠'] : ['順位', '対象', '表示', 'クリック', 'CTR', '平均順位', '施策案・根拠'];
  const lines = ['| ' + head.join(' | ') + ' |', '| ---: | --- | ---: | ---: | ---: | ---: | --- |'];
  result.items.forEach((r, i) => {
    const facts = r.factors.map((f) => `${f.name}（${f.kind}）`).join('、');
    lines.push('| ' + [
      i + 1, escapeCell(r.label), format(r.impressions), format(r.clicks), (r.ctr * 100).toFixed(2) + '%', r.position.toFixed(1),
      escapeCell(`${r.actionLabel}｜${r.reason}｜${facts}${r.blocked ? `｜**注意：${r.blocked}のため、このページの改善は対象外**` : ''}`),
    ].join(' | ') + ' |');
  });
  if (!result.items.length) lines.push('| — | 基準に合う候補なし | — | — | — | — | 実際のデータを確認 |');
  return lines.join('\n');
}

export function renderNoDataReport({ generatedAt = new Date().toISOString().slice(0, 10), period } = {}) {
  return [
    '# OSSALT SEO Agency — 週次レポート（Search Console データ：未取得）', '',
    '- 生成日: ' + escapeCell(generatedAt),
    '- 集計期間: ' + escapeCell(period || '指定なし'),
    '- 検索データ: **未取得**（CSVが指定されていません）', '',
    '検索の表示回数・クリック・順位は、実測の入力がないため、ここには載せていません。推測や過去の数字で埋めません。', '',
    '## 取得の手順', '',
    '1. Search Console → 検索パフォーマンス → 検索の種類「ウェブ」→ 直近3か月。',
    '2. クエリのフィルタでブランド検索（`ossalt`）を除外し、**同じ条件で** 「クエリ」と「ページ」をそれぞれエクスポート（CSV）。',
    '3. `agency/data/queries.csv` と `agency/data/pages.csv` に置く（.gitignore済み。リポジトリには入れない）。',
    '4. `node scripts/seo-agency.mjs --queries agency/data/queries.csv --pages agency/data/pages.csv --period "期間（Web・非ブランド）" --pages-nonbrand-confirmed --site out --out agency/reports/weekly.md`',
    '', 'クエリとURLの対応が必要な評価には、GSCの「クエリ」と「ページ」を両方の完全一致で絞ったデータが必要です。',
    '', '## それまでにできること（データ不要）', '',
    '- `npm run build` のあと `node scripts/seo-audit.mjs` で、テクニカルSEOと内部リンクの事実を確認する（Technician / Linker）。',
    '- `agency/LEDGER.md` の確認期限は `node scripts/seo-ledger.mjs due` で確認する（Analyst）。', '',
  ].join('\n');
}

export function renderAgencyReport({
  queries, pages, pairs = null, period, brand = 'ossalt', pagesNonbrandConfirmed = false, siteState = null,
  generatedAt = new Date().toISOString().slice(0, 10),
}) {
  const q = rankRows(queries.rows, { limit: 5 });
  const p = rankRows(pages.rows, { limit: 5, siteState });
  const pr = pairs ? rankRows(pairs.rows, { limit: 5, siteState }) : null;
  const summary = patternSummary(queries.rows);
  const L = [
    '# OSSALT SEO Agency — 週次レポート', '',
    '- 生成日: ' + escapeCell(generatedAt),
    '- 集計期間（入力値・未検証）: ' + escapeCell(period || '指定なし'),
    '- ブランド除外語: ' + escapeCell(brand),
    '- ページCSVの非ブランドフィルタ: ' + (pagesNonbrandConfirmed ? 'ユーザーがGSC画面で適用したと申告（CSV単体では検証不可）' : '**未確認：ブランド検索を含む可能性あり**'),
    '- クエリ: ' + queries.examined + '行 / 読み飛ばし' + queries.skipped + '行 / ブランド除外' + queries.brandExcluded + '行',
    '- ページ: ' + pages.examined + '行 / 読み飛ばし' + pages.skipped + '行',
    '- クエリ×ページ: ' + (pairs ? pairs.examined + '行 / 読み飛ばし' + pairs.skipped + '行 / ブランド除外' + pairs.brandExcluded + '行' : '**未取得**（URLとクエリの対応は、この週は評価できない）'),
    '- ビルド済みサイトとの照合: ' + (siteState ? 'あり（転送ページ・noindexのページを候補から外す）' : 'なし（--site out を渡すと、転送ページ・noindexのページを検出できる）'),
    '',
    '> 点数の根拠は各行の「実測」「仮説」の区分で見分けられます。**実測**はCSV・ビルド結果の数値、**仮説**はOSSALT側の分類・重みで、需要や成果の証明ではありません。',
    '> クエリ集計とページ集計は別々の候補リストです。平均順位は集計の平均で、個別のクエリとURLの対応は示しません。', '',
  ];
  if (pr) L.push('## Strategist — クエリ×ページ（URLとクエリの対応が実測できる候補）', '', candidateTable(pr), '');
  L.push('## Strategist — 非ブランド検索（クエリ集計）', '', candidateTable(q), '',
    '## Strategist — ページ別の改善検討候補（ページ集計）', '', candidateTable(p), '',
    '## 検索パターンの内訳（手元のデータの分類。需要の判定ではない）', '',
    '| パターン | クエリ数 | 表示 | クリック |', '| --- | ---: | ---: | ---: |',
    ...summary.map((s) => `| ${escapeCell(s.label)} | ${s.queries} | ${format(s.impressions)} | ${format(s.clicks)} |`), '',
    '## Writer / Linker — 承認前の調査', '',
    '1. 対象候補のGSCでクエリとページを**両方完全一致**に絞り、実測値・対象国・デバイス・検索タイプを記録する。クエリとページを別々に集計した値で、順位を評価しない。',
    '2. 該当市場で現在の検索結果を読み、既存のOSSALTページと検索意図を比較する（取得日時を記録）。',
    '3. ライセンスや機能、OSSの更新状況を公式資料で検証し、独自価値があるときだけ BRIEF を埋める。',
    '4. 存在する関連URLから自然な内部リンクを提案する（`node scripts/seo-audit.mjs` のリンク元の数を参照）。', '',
    '## Technician / Analyst — release gate', '',
    '- 本番コンテンツやindex設定は、このレポートでは変更しない。必要ならPRを作り、オーナー承認後に公開。',
    '- sitemap / canonical / noindex / ビルド / 表示 / 一次情報を検証し、根拠を記録。',
    '- 公開したら `node scripts/seo-ledger.mjs add …` で記録する。28日後の兆候・約90日後の方向性を比較（Googleの固定ルールではない）。',
    '- クリックと表示回数をコンバージョンや売上と混同しない。変換データが無ければ「未計測」。', '');
  return L.join('\n');
}

function argumentsFrom(argv) {
  const opts = { brand: 'ossalt', pagesNonbrandConfirmed: false };
  const flags = { '--queries': 'queries', '--pages': 'pages', '--pairs': 'pairs', '--period': 'period', '--brand': 'brand', '--out': 'out', '--site': 'site' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--pages-nonbrand-confirmed') { opts.pagesNonbrandConfirmed = true; continue; }
    if (!flags[argv[i]] || !argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('Invalid argument: ' + argv[i]);
    opts[flags[argv[i]]] = argv[++i];
  }
  if (!opts.brand.trim()) throw new Error('Brand cannot be empty');
  if (!!opts.queries !== !!opts.pages) throw new Error('--queries と --pages は両方指定してください（片方だけでは、クエリとページの候補を比べられません）。agency/README.md を参照');
  return opts;
}

async function readText(path) {
  try { return decodeBuffer(await readFile(resolve(path))); }
  catch (e) { throw new Error(`ファイルを読めません: ${path}（${e.code ?? e.message}）。ファイルの場所を確認してください。値は補いません`); }
}

async function main() {
  const opts = argumentsFrom(process.argv.slice(2));
  let markdown;
  if (!opts.queries) markdown = renderNoDataReport({ period: opts.period });
  else {
    const [queryCsv, pageCsv, pairCsv] = await Promise.all([readText(opts.queries), readText(opts.pages), opts.pairs ? readText(opts.pairs) : null]);
    markdown = renderAgencyReport({
      queries: readGscExport(queryCsv, 'query', { brand: opts.brand }),
      pages: readGscExport(pageCsv, 'page'),
      pairs: pairCsv ? readGscExport(pairCsv, 'pair', { brand: opts.brand }) : null,
      period: opts.period, brand: opts.brand, pagesNonbrandConfirmed: opts.pagesNonbrandConfirmed,
      siteState: opts.site ? await loadSiteState(opts.site) : null,
    });
  }
  if (opts.out) {
    await mkdir(dirname(resolve(opts.out)), { recursive: true });
    await writeFile(resolve(opts.out), markdown, 'utf8');
    console.log('SEOレポートを保存: ' + opts.out + (opts.queries ? '' : '（検索データ未取得）'));
  } else console.log(markdown);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]))
  main().catch((e) => { console.error('SEO Agency: ' + e.message); process.exitCode = 1; });
