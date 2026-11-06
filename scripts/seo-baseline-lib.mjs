/**
 * 検索表示の前後比較（2026-11-25 以降の再分析）の土台。純粋関数。読み取り専用で、サイト・設定・データは変えない。
 *
 * 比べるもの（すべて「同じ検索条件」で）：
 *  - 日別のクリック数・表示回数・CTR・平均掲載順位（日別の推移と、期間ごとの合計）
 *  - ページ別の表示回数、主要な検索クエリ（gsc-compare-lib の条件チェックを通ったものだけ）
 *  - インデックス登録状況（画面の「ページのインデックス登録」のエクスポート、または URL 検査 API。取得できた範囲だけ）
 *  - サイトの構造（index 対象の数・サイトマップ・title・canonical など。ビルド結果から）
 *
 * 守ること：
 *  - 条件（期間の長さ・検索タイプ・国・デバイス・ブランド除外・プロパティ）がそろわないものは、比較しない（理由を示す）
 *  - 欠けた日・取得できなかった表は、補わずに「未取得」「欠測」と書く。画面エクスポートの行数上限（1000行）に達した表は、全件として扱わない
 *  - 平均掲載順位は、日ごとの値を表示回数で重みづけした近似で、画面の値と一致しない場合がある（そのことを表示する）
 *  - 出力には Search Console の数値が入る。Git管理外の場所にだけ書く（CLI で強制する）
 */
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { parseCsv } from "./gsc-weekly-report.mjs";
import { addDay, compareExports, daysBetween, isoDay } from "./gsc-compare-lib.mjs";

/* ------------------------------------------------------------------ *
 * 日別の系列
 * ------------------------------------------------------------------ */

const num = (v) => {
  const s = String(v ?? "").replace(/[,\s]/g, "");
  if (s === "") return NaN;
  return s.endsWith("%") ? Number(s.slice(0, -1)) / 100 : Number(s);
};
const normDate = (v) => {
  const m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(String(v ?? "").trim());
  if (!m) return null;
  const s = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  try { isoDay(s); return s; } catch { return null; }
};
const headerIndex = (h, rx) => h.findIndex((x) => rx.test(String(x).normalize("NFKC").toLowerCase()));

/** 日別の表か（先頭の列が日付で、クリック・表示回数の列がある）。ファイル名は問わない（画面のエクスポートには名前が実際の中身と合わないものがある） */
export function isDailyCsv(text) {
  const rows = parseCsv(String(text).replace(/^﻿/, ""));
  const h = rows[0]?.map((x) => String(x).normalize("NFKC").toLowerCase().trim());
  return !!h && /^(日付|date)$/.test(h[0]) && headerIndex(h, /クリック|click/) > 0 && headerIndex(h, /表示|impression/) > 0;
}

/** 日別の CSV → { rows:[{date,clicks,impressions,ctr,position}], skipped } 。読めない行は数えるだけで、補わない */
export function parseDailyCsv(text) {
  const rows = parseCsv(String(text).replace(/^﻿/, ""));
  const h = (rows[0] ?? []).map((x) => String(x).normalize("NFKC").toLowerCase().trim());
  const iD = 0, iC = headerIndex(h, /クリック|click/), iI = headerIndex(h, /表示|impression/), iT = headerIndex(h, /ctr/), iP = headerIndex(h, /掲載順位|position/);
  if (!/^(日付|date)$/.test(h[0] ?? "") || iC < 0 || iI < 0) throw new Error("日別の表として読めません（先頭の列が日付で、クリック数・表示回数の列が必要です）");
  const out = []; let skipped = 0;
  const seen = new Set();
  for (const r of rows.slice(1)) {
    const date = normDate(r[iD]), clicks = num(r[iC]), impressions = num(r[iI]);
    if (!date || !Number.isFinite(clicks) || !Number.isFinite(impressions) || seen.has(date)) { skipped++; continue; }
    seen.add(date);
    const ctr = iT >= 0 && Number.isFinite(num(r[iT])) ? num(r[iT]) : (impressions ? clicks / impressions : 0);
    const position = iP >= 0 && Number.isFinite(num(r[iP])) ? num(r[iP]) : null;
    out.push({ date, clicks, impressions, ctr, position });
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return { rows: out, skipped };
}

/** フォルダの中から日別の表を探して読む（無ければ null） */
export async function readDailyFromDir(dir) {
  const names = (await readdir(dir)).filter((n) => /\.csv$/i.test(n)).sort((a, b) => (/^(dates?|日付)/i.test(a) ? -1 : 0) - (/^(dates?|日付)/i.test(b) ? -1 : 0));
  for (const n of names) {
    const text = await readFile(join(dir, n), "utf8");
    if (isDailyCsv(text)) return { file: n, ...parseDailyCsv(text) };
  }
  return null;
}

/** 期間の合計。順位は日ごとの値を表示回数で重みづけした近似。欠けた日を列挙する */
export function summarizeDaily(rows, from, to) {
  const days = daysBetween(from, to);
  if (days < 1) throw new Error(`期間が不正です（${from}〜${to}）`);
  const inRange = rows.filter((r) => r.date >= from && r.date <= to);
  const have = new Set(inRange.map((r) => r.date));
  const missing = [];
  for (let i = 0; i < days; i++) { const d = addDay(from, i); if (!have.has(d)) missing.push(d); }
  const clicks = inRange.reduce((s, r) => s + r.clicks, 0), impressions = inRange.reduce((s, r) => s + r.impressions, 0);
  const withPos = inRange.filter((r) => r.position != null && r.impressions > 0);
  const posW = withPos.reduce((s, r) => s + r.impressions, 0);
  return {
    from, to, days, daysWithData: inRange.length, missing,
    clicks, impressions, ctr: impressions ? clicks / impressions : null,
    position: posW ? withPos.reduce((s, r) => s + r.position * r.impressions, 0) / posW : null,
  };
}

const delta = (a, b) => (a == null || b == null ? null : b - a);
const ratio = (a, b) => (a == null || b == null || a === 0 ? null : b / a - 1);

/**
 * 同じ長さの2つの期間（A＝前、B＝後）を、日の位置（1日目・2日目…）で並べて比べる。
 * 長さが違う・重なっている場合は比較しない（errors）。欠測日・順位の近似は warnings に出す。
 */
export function compareWindows(rows, a, b) {
  const errors = [], warnings = [];
  const sa = summarizeDaily(rows, a.from, a.to), sb = summarizeDaily(rows, b.from, b.to);
  if (sa.days !== sb.days) errors.push(`期間の長さが違います（前 ${sa.days}日 / 後 ${sb.days}日）。同じ長さにそろえてください。`);
  if (a.to >= b.from) errors.push(`期間が重なっています（前の終了 ${a.to} ≥ 後の開始 ${b.from}）。`);
  else if (addDay(a.to, 1) !== b.from) warnings.push(`期間が連続していません（前の終了 ${a.to}、後の開始 ${b.from}）。曜日の構成と季節性の違いに注意してください。`);
  for (const [label, s] of [["前", sa], ["後", sb]]) {
    if (s.missing.length) warnings.push(`${label}の期間に、データの無い日が ${s.missing.length}日あります（${s.missing.slice(0, 5).join("・")}${s.missing.length > 5 ? "…" : ""}）。補っていません。`);
  }
  warnings.push("平均掲載順位は、日ごとの値を表示回数で重みづけした近似です。画面の値と一致しない場合があります。");
  if (errors.length) return { ok: false, errors, warnings, a: sa, b: sb, daily: [] };
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const daily = [];
  for (let i = 0; i < sa.days; i++) {
    const da = addDay(a.from, i), db = addDay(b.from, i);
    daily.push({ day: i + 1, a: { date: da, ...(byDate.get(da) ?? null) }, b: { date: db, ...(byDate.get(db) ?? null) }, aMissing: !byDate.has(da), bMissing: !byDate.has(db) });
  }
  return {
    ok: true, errors, warnings, a: sa, b: sb, daily,
    change: {
      clicks: delta(sa.clicks, sb.clicks), clicksRatio: ratio(sa.clicks, sb.clicks),
      impressions: delta(sa.impressions, sb.impressions), impressionsRatio: ratio(sa.impressions, sb.impressions),
      ctr: delta(sa.ctr, sb.ctr), position: delta(sa.position, sb.position),
    },
  };
}

/* ------------------------------------------------------------------ *
 * インデックス登録状況
 * ------------------------------------------------------------------ */

/**
 * 「ページのインデックス登録」の画面エクスポート（チャート.csv＝日付ごとの件数、表.csv＝理由ごとのページ数）を読む。
 * 列名は画面の表記のまま使う（意味を推測して付け替えない）。無ければ status: "未取得"。
 */
export async function readIndexExport(dir) {
  if (!dir) return { status: "未取得", reason: "インデックス登録のエクスポートが指定されていません" };
  let names;
  try { names = (await readdir(dir)).filter((n) => /\.csv$/i.test(n)); } catch { return { status: "未取得", reason: `フォルダを読めません（${dir}）` }; }
  let chart = null, table = null;
  for (const n of names) {
    const rows = parseCsv((await readFile(join(dir, n), "utf8")).replace(/^﻿/, ""));
    const h = (rows[0] ?? []).map((x) => String(x).trim());
    if (!h.length) continue;
    if (/^(日付|date)$/i.test(h[0]) && h.length >= 2 && !chart && !/クリック|click|表示回数|impression/i.test(h.join(","))) {
      chart = { file: n, columns: h.slice(1), rows: rows.slice(1).map((r) => ({ date: normDate(r[0]), values: h.slice(1).map((_, i) => num(r[i + 1])) })).filter((r) => r.date) };
    } else if (!table && h.some((x) => /理由|reason|状況|status/i.test(x)) && h.some((x) => /ページ|pages?|件/i.test(x))) {
      const iN = h.findIndex((x) => /ページ|pages?|件/i.test(x)), iR = h.findIndex((x) => /理由|reason|状況|status/i.test(x));
      table = { file: n, rows: rows.slice(1).map((r) => ({ reason: String(r[iR] ?? "").trim(), pages: num(r[iN]) })).filter((r) => r.reason && Number.isFinite(r.pages)) };
    }
  }
  if (!chart && !table) return { status: "未取得", reason: "チャート（日付ごとの件数）も理由の表も見つかりません" };
  return { status: "取得", chart, table };
}

/** 2つのインデックス登録のエクスポートの差（最後の日の値と、理由ごとのページ数）。どちらかが未取得なら、その旨だけ */
export function compareIndex(before, after) {
  if (before.status !== "取得" || after.status !== "取得") {
    return { status: "未取得", note: `前：${before.status === "取得" ? "取得" : before.reason}／後：${after.status === "取得" ? "取得" : after.reason}` };
  }
  const last = (c) => (c && c.rows.length ? c.rows[c.rows.length - 1] : null);
  const lb = last(before.chart), la = last(after.chart);
  const chart = lb && la ? before.chart.columns.map((name, i) => ({ name, beforeDate: lb.date, before: lb.values[i], afterDate: la.date, after: la.values[after.chart.columns.indexOf(name)] ?? null })) : [];
  const reasons = [];
  if (before.table && after.table) {
    const bm = new Map(before.table.rows.map((r) => [r.reason, r.pages])), am = new Map(after.table.rows.map((r) => [r.reason, r.pages]));
    for (const k of new Set([...bm.keys(), ...am.keys()])) reasons.push({ reason: k, before: bm.get(k) ?? null, after: am.get(k) ?? null, change: bm.has(k) && am.has(k) ? am.get(k) - bm.get(k) : null });
    reasons.sort((x, y) => Math.abs(y.change ?? y.after ?? y.before ?? 0) - Math.abs(x.change ?? x.after ?? x.before ?? 0));
  }
  return { status: "取得", chart, reasons };
}

/** URL 検査 API の結果（[{url, verdict, coverageState, ...}]）の集計。取得できなかった URL は数えて示す */
export function summarizeInspections(list) {
  const byState = new Map(), byVerdict = new Map(); let failed = 0;
  for (const x of list ?? []) {
    if (!x || x.error) { failed++; continue; }
    byState.set(x.coverageState ?? "不明", (byState.get(x.coverageState ?? "不明") ?? 0) + 1);
    byVerdict.set(x.verdict ?? "不明", (byVerdict.get(x.verdict ?? "不明") ?? 0) + 1);
  }
  return { total: (list ?? []).length, failed, byState: [...byState.entries()].sort((a, b) => b[1] - a[1]), byVerdict: [...byVerdict.entries()].sort((a, b) => b[1] - a[1]) };
}

/* ------------------------------------------------------------------ *
 * サイトの構造（ビルド結果の out/ から）
 * ------------------------------------------------------------------ */

const attr = (h, rx) => (rx.exec(h) ?? [null, null])[1];
const unesc = (s) => (s == null ? null : s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'"));

/** 1ページの HTML から、検索に関わる情報だけを取り出す */
export function pageFacts(html) {
  const h1 = (/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html) ?? [null, ""])[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return {
    title: unesc(attr(html, /<title>([\s\S]*?)<\/title>/)) ?? "",
    robots: attr(html, /<meta name="robots" content="([^"]*)"/),
    canonical: attr(html, /<link rel="canonical" href="([^"]*)"/),
    refresh: attr(html, /<meta http-equiv="refresh" content="([^"]*)"/),
    h1: unesc(h1),
  };
}

const family = (u) => u.split("/").filter(Boolean)[0] ?? "home";
export const isIndexable = (p) => !p.refresh && !(p.robots && /noindex/i.test(p.robots));

/** pages: Map(url → pageFacts)、sitemap: URL（パス）の配列 → サイトの構造の要約と、URL ごとの記録 */
export function buildSiteSnapshot(pages, sitemap, { label = "", builtAt = null } = {}) {
  const byFamily = {};
  const issues = { canonicalNotSelf: [], noTitle: [], noH1: [], sitemapNotIndexable: [], indexableNotInSitemap: [] };
  const sm = new Set(sitemap);
  const titles = new Map();
  for (const [u, p] of pages) {
    const f = (byFamily[family(u)] ??= { indexable: 0, noindex: 0, redirect: 0 });
    if (p.refresh) f.redirect++; else if (!isIndexable(p)) f.noindex++; else f.indexable++;
    if (!isIndexable(p)) continue;
    if (!/^\/(404|_not-found)/.test(u) && !u.endsWith(".html")) {
      const c = (p.canonical ?? "").replace(/^https?:\/\/[^/]+/, "") || null;
      if (c !== u) issues.canonicalNotSelf.push(u);
      if (!p.title.trim()) issues.noTitle.push(u);
      if (!p.h1) issues.noH1.push(u);
      if (!sm.has(u)) issues.indexableNotInSitemap.push(u);
      titles.set(p.title, (titles.get(p.title) ?? 0) + 1);
    }
  }
  for (const u of sm) { const p = pages.get(u); if (!p || !isIndexable(p)) issues.sitemapNotIndexable.push(u); }
  const total = { pages: pages.size, sitemap: sm.size, indexable: Object.values(byFamily).reduce((s, f) => s + f.indexable, 0), noindex: Object.values(byFamily).reduce((s, f) => s + f.noindex, 0), redirect: Object.values(byFamily).reduce((s, f) => s + f.redirect, 0) };
  return { label, builtAt, total, byFamily, duplicateTitles: [...titles.entries()].filter(([, n]) => n > 1).length, issues, pages: Object.fromEntries(pages) , sitemap: [...sm] };
}

/** 2つのサイト構造の差。件数と、title・canonical・noindex・転送・サイトマップの変化したURLの数と例 */
export function diffSiteSnapshots(a, b, { maxExamples = 8 } = {}) {
  const pa = a.pages, pb = b.pages;
  const keys = (pred) => Object.keys(pb).filter((u) => u in pa && pred(pa[u], pb[u]));
  const ex = (l) => l.slice(0, maxExamples);
  const titleChanged = keys((x, y) => x.title !== y.title), canonChanged = keys((x, y) => x.canonical !== y.canonical);
  const robotsChanged = keys((x, y) => (x.robots ?? null) !== (y.robots ?? null)), redirectChanged = keys((x, y) => (x.refresh ?? null) !== (y.refresh ?? null));
  const h1Changed = keys((x, y) => x.h1 !== y.h1);
  const sa = new Set(a.sitemap), sb = new Set(b.sitemap);
  return {
    total: { before: a.total, after: b.total },
    added: ex(Object.keys(pb).filter((u) => !(u in pa))), addedCount: Object.keys(pb).filter((u) => !(u in pa)).length,
    removed: ex(Object.keys(pa).filter((u) => !(u in pb))), removedCount: Object.keys(pa).filter((u) => !(u in pb)).length,
    title: { count: titleChanged.length, examples: ex(titleChanged) }, h1: { count: h1Changed.length, examples: ex(h1Changed) },
    canonical: { count: canonChanged.length, examples: ex(canonChanged) }, robots: { count: robotsChanged.length, examples: ex(robotsChanged) },
    redirect: { count: redirectChanged.length, examples: ex(redirectChanged) },
    sitemap: { added: [...sb].filter((u) => !sa.has(u)).length, removed: [...sa].filter((u) => !sb.has(u)).length },
    issues: Object.fromEntries(Object.keys(b.issues).map((k) => [k, { before: a.issues[k]?.length ?? null, after: b.issues[k].length }])),
  };
}

/* ------------------------------------------------------------------ *
 * 期間の比較の本体（ページ別＋クエリ別。日別は compareWindows）
 * ------------------------------------------------------------------ */

/** 2つのエクスポート（readExportDir の結果）を比べる。条件が合わなければ、表は比べない（理由つき） */
export function compareExportPair(before, after, { top = 10 } = {}) {
  const out = {};
  for (const kind of ["pages", "queries"]) {
    const r = compareExports(after, before, { kind }); // cur＝後、prev＝前
    const o = { check: r.check, coverage: r.coverage };
    if (r.check.ok) {
      const both = r.rows.filter((x) => x.status === "both" && !x.lowSample);
      o.topAfter = r.rows.filter((x) => x.cur).sort((x, y) => y.cur.impressions - x.cur.impressions).slice(0, top);
      o.gainers = [...both].sort((x, y) => y.dImpressions - x.dImpressions).slice(0, top);
      o.losers = [...both].sort((x, y) => x.dImpressions - y.dImpressions).slice(0, top);
      o.appeared = r.rows.filter((x) => x.status === "cur-only").length;
      o.disappeared = r.rows.filter((x) => x.status === "prev-only").length;
      o.unverifiable = r.rows.filter((x) => x.status === "unverifiable").length;
    }
    out[kind] = o;
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * 保管と条件の照合（baseline の登録）
 * ------------------------------------------------------------------ */

export const BASELINE_CONDITIONS = { searchType: "web", country: "all", device: "all", brandFiltered: false };

/**
 * 登録するエクスポートの meta.json を作る。期間は、日別の表が実際に持っている範囲と照らし合わせる。
 * データが指定の期間の途中から始まる場合（プロパティの追加前など）は、そのことを dataStartsOn に記録し、補わない。
 */
export function buildBaselineMeta({ from, to, property, daily, label, conditions = {}, registeredOn, note = null }) {
  isoDay(from); isoDay(to);
  if (to < from) throw new Error(`期間が不正です（${from}〜${to}）`);
  const warnings = [];
  const meta = { label, from, to, property: property ?? null, ...BASELINE_CONDITIONS, ...conditions, source: "csv-export", registeredOn, ...(note ? { note } : {}) };
  if (!property) warnings.push("プロパティが指定されていません（ドメイン `sc-domain:ossalt.jp` か URL プレフィックスか）。2期間で同じものを使ってください。");
  if (daily && daily.rows.length) {
    const min = daily.rows[0].date, max = daily.rows[daily.rows.length - 1].date;
    meta.dailyCoverage = { first: min, last: max, days: daily.rows.length };
    if (min > from) { meta.dataStartsOn = min; warnings.push(`日別のデータが ${min} から始まっています（指定の開始 ${from} より後）。それ以前は存在しないか、取得できていません。補っていません。`); }
    if (max < to) warnings.push(`日別のデータが ${max} で終わっています（指定の終了 ${to} より前）。`);
    if (min > to || max < from) throw new Error(`日別のデータの範囲（${min}〜${max}）が、指定の期間（${from}〜${to}）と重なりません`);
  } else warnings.push("日別の表が見つかりません。日別の推移は比べられません。");
  return { meta, warnings };
}

/** 前と後の条件の食い違い。1つでもあれば、数値の比較はしない（プロパティが未記録でも比較しない） */
export function conditionProblems(before, after) {
  const p = [];
  if (!before.property || !after.property) p.push("プロパティが、前か後で未記録です。同じプロパティだと確認できないため、比較しません（register の --property で記録してください）。");
  else if (before.property !== after.property) p.push(`プロパティが違います（${before.property} / ${after.property}）。別のプロパティの数値は比べられません。`);
  for (const [k, label] of [["searchType", "検索タイプ"], ["country", "国"], ["device", "デバイス"]]) {
    if (before[k] == null || after[k] == null) p.push(`${label}が、前か後で未記録です。`);
    else if (before[k] !== after[k]) p.push(`${label}が違います（${before[k]} / ${after[k]}）。`);
  }
  if (before.brandFiltered == null || after.brandFiltered == null) p.push("ブランド検索の除外の有無が、前か後で未記録です。");
  else if (before.brandFiltered !== after.brandFiltered) p.push("ブランド検索の除外の有無が、前と後で違います。");
  return p;
}

/* ------------------------------------------------------------------ *
 * レポートの文章（Markdown）
 * ------------------------------------------------------------------ */

const f0 = (n) => (n == null ? "—" : Number(n).toLocaleString("ja-JP"));
const fp = (n) => (n == null ? "—" : `${(n * 100).toFixed(2)}%`);
const f1 = (n) => (n == null ? "—" : Number(n).toFixed(1));
const sg = (n, d = 0) => (n == null ? "—" : `${n > 0 ? "+" : ""}${d ? n.toFixed(d) : f0(n)}`);
const sgp = (n) => (n == null ? "—" : `${n > 0 ? "+" : ""}${(n * 100).toFixed(1)}%`);
const esc = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");

export function renderComparison({ meta, daily, tables, index, inspections, site, changelog, generatedAt }) {
  const L = [
    "# 検索表示の前後比較（OSSALT）", "",
    "このファイルには Search Console の数値が含まれます。Git管理外の場所（reports/seo/ など）にだけ置き、コミット・PR・ログに載せないでください。", "",
    `生成：${generatedAt}`, "",
    "## 1. 比較の条件", "",
    "| 項目 | 前 | 後 |", "| --- | --- | --- |",
    `| 期間 | ${meta.before.from}〜${meta.before.to} | ${meta.after.from}〜${meta.after.to} |`,
    `| プロパティ | ${esc(meta.before.property ?? "未記録")} | ${esc(meta.after.property ?? "未記録")} |`,
    `| 検索タイプ／国／デバイス | ${meta.before.searchType}／${meta.before.country}／${meta.before.device} | ${meta.after.searchType}／${meta.after.country}／${meta.after.device} |`,
    `| ブランド検索の除外 | ${meta.before.brandFiltered === false ? "しない" : meta.before.brandFiltered ?? "未確認"} | ${meta.after.brandFiltered === false ? "しない" : meta.after.brandFiltered ?? "未確認"} |`, "",
  ];
  const problems = conditionProblems(meta.before, meta.after);
  if (problems.length) L.push("> **条件がそろっていないため、数値の比較をしていません。**", ...problems.map((p) => `> - ${p}`), "");

  L.push("## 2. 日別（クリック数・表示回数・CTR・平均掲載順位）", "");
  if (!daily) L.push("日別の表が見つからないため、比べていません（未取得）。", "");
  else if (!daily.ok) L.push("**比較しません。**", ...daily.errors.map((e) => `- ${e}`), "");
  else {
    L.push("| 期間 | 日数（データのある日） | クリック数 | 表示回数 | CTR | 平均掲載順位（近似） |", "| --- | --- | ---: | ---: | ---: | ---: |",
      `| 前 ${daily.a.from}〜${daily.a.to} | ${daily.a.days}（${daily.a.daysWithData}） | ${f0(daily.a.clicks)} | ${f0(daily.a.impressions)} | ${fp(daily.a.ctr)} | ${f1(daily.a.position)} |`,
      `| 後 ${daily.b.from}〜${daily.b.to} | ${daily.b.days}（${daily.b.daysWithData}） | ${f0(daily.b.clicks)} | ${f0(daily.b.impressions)} | ${fp(daily.b.ctr)} | ${f1(daily.b.position)} |`,
      `| 変化 | | ${sg(daily.change.clicks)}（${sgp(daily.change.clicksRatio)}） | ${sg(daily.change.impressions)}（${sgp(daily.change.impressionsRatio)}） | ${daily.change.ctr == null ? "—" : `${daily.change.ctr > 0 ? "+" : ""}${(daily.change.ctr * 100).toFixed(2)}pt`} | ${sg(daily.change.position, 1)} |`, "",
      "### 日の位置で並べた推移", "", "| 日 | 前の日付 | クリック | 表示 | CTR | 順位 | 後の日付 | クリック | 表示 | CTR | 順位 |", "| ---: | --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: |",
      ...daily.daily.map((d) => `| ${d.day} | ${d.a.date}${d.aMissing ? "（欠測）" : ""} | ${f0(d.a.clicks)} | ${f0(d.a.impressions)} | ${fp(d.a.ctr)} | ${f1(d.a.position)} | ${d.b.date}${d.bMissing ? "（欠測）" : ""} | ${f0(d.b.clicks)} | ${f0(d.b.impressions)} | ${fp(d.b.ctr)} | ${f1(d.b.position)} |`), "");
  }
  if (daily?.warnings?.length) L.push(...daily.warnings.map((w) => `- 注意：${w}`), "");

  for (const [kind, title, labelHead] of [["pages", "3. ページ別の検索表示回数", "ページ"], ["queries", "4. 主要な検索クエリ", "クエリ"]]) {
    L.push(`## ${title}`, "");
    const t = tables?.[kind];
    if (!t) { L.push("表が読めていないため、比べていません（未取得）。", ""); continue; }
    if (!t.check.ok) { L.push("**比較しません。**", ...t.check.errors.map((e) => `- ${e}`), ""); continue; }
    const row = (r) => `| ${esc(r.label)} | ${f0(r.prev?.impressions)} | ${f0(r.cur?.impressions)} | ${sg(r.dImpressions)} | ${f0(r.prev?.clicks)} → ${f0(r.cur?.clicks)} | ${f1(r.prev?.position)} → ${f1(r.cur?.position)} |`;
    const head = [`| ${labelHead} | 表示（前） | 表示（後） | 差 | クリック | 順位 |`, "| --- | ---: | ---: | ---: | --- | --- |"];
    L.push("### 後の期間の上位", "", ...head, ...t.topAfter.map(row), "", "### 表示回数が増えた上位（両期間とも表示が30回以上のもの）", "", ...head, ...t.gainers.map(row), "", "### 表示回数が減った上位（同上）", "", ...head, ...t.losers.map(row), "");
    L.push(`- 前だけにあった：${t.disappeared}件／後だけにあった：${t.appeared}件／上限などで判定できない：${t.unverifiable}件`);
    if (t.coverage?.cur?.impressionShare != null) L.push(`- 表の網羅率（デバイス別の合計に対する、表の表示回数の割合。匿名化されたクエリなどは含まれない）：前 ${fp(t.coverage.prev?.impressionShare)}／後 ${fp(t.coverage.cur?.impressionShare)}`);
    if (t.check.warnings.length) L.push(...t.check.warnings.map((w) => `- 注意：${w}`));
    if (t.check.unverified.length) L.push(...t.check.unverified.map((w) => `- 未確認：${w}`));
    L.push("");
  }

  L.push("## 5. インデックス登録状況（取得できた範囲）", "");
  if (!index || index.status !== "取得") L.push(`未取得${index?.note ? `（${index.note}）` : ""}。画面の「ページのインデックス登録」からエクスポートするか、URL検査 API の結果を指定してください。`, "");
  else {
    if (index.chart?.length) L.push("| 項目 | 前の最終日 | 値 | 後の最終日 | 値 |", "| --- | --- | ---: | --- | ---: |", ...index.chart.map((c) => `| ${esc(c.name)} | ${c.beforeDate} | ${f0(c.before)} | ${c.afterDate} | ${f0(c.after)} |`), "");
    if (index.reasons?.length) L.push("| 理由 | 前 | 後 | 差 |", "| --- | ---: | ---: | ---: |", ...index.reasons.slice(0, 15).map((r) => `| ${esc(r.reason)} | ${f0(r.before)} | ${f0(r.after)} | ${sg(r.change)} |`), "");
  }
  if (inspections) {
    L.push("### URL検査 API の結果（指定したURLだけ）", "", `- 検査したURL ${inspections.total}件（取得できなかったもの ${inspections.failed}件）`, ...inspections.byState.map(([k, n]) => `- ${esc(k)}：${n}件`), "");
  }

  L.push("## 6. サイトの構造の変化（ビルド結果）", "");
  if (!site) L.push("サイトの構造の記録（site-snapshot）が指定されていないため、比べていません。", "");
  else {
    const t = site.total;
    L.push("| 項目 | 前 | 後 |", "| --- | ---: | ---: |", `| ページ数 | ${f0(t.before.pages)} | ${f0(t.after.pages)} |`, `| index 対象 | ${f0(t.before.indexable)} | ${f0(t.after.indexable)} |`, `| noindex | ${f0(t.before.noindex)} | ${f0(t.after.noindex)} |`, `| 転送ページ | ${f0(t.before.redirect)} | ${f0(t.after.redirect)} |`, `| サイトマップのURL | ${f0(t.before.sitemap)} | ${f0(t.after.sitemap)} |`, "",
      `- 追加 ${site.addedCount}・削除 ${site.removedCount}／title の変更 ${site.title.count}・h1 の変更 ${site.h1.count}・canonical の変更 ${site.canonical.count}・robots の変更 ${site.robots.count}・転送の変更 ${site.redirect.count}／サイトマップ 追加 ${site.sitemap.added}・削除 ${site.sitemap.removed}`,
      ...Object.entries(site.issues).map(([k, v]) => `- 点検 ${k}：前 ${v.before ?? "—"} → 後 ${v.after}`));
    for (const [k, v] of [["title", site.title], ["canonical", site.canonical], ["robots", site.robots]]) if (v.count) L.push(`- ${k} が変わった例：${v.examples.join("、")}`);
    L.push("");
  }

  L.push("## 7. 期間中に既定ブランチへ入った変更（データの自動更新を除く）", "");
  if (!changelog?.length) L.push("記録がありません（git のログを指定しなかったか、該当なし）。", "");
  else L.push(...changelog.map((c) => `- ${c}`), "");

  L.push("## 読み方の注意", "",
    "- 表示回数・クリック数が小さいサイトでは、数十回の違いは偶然の範囲です。ページ別・クエリ別の順位の差は、表示が30回以上のものだけ出しています。",
    "- 変化の原因を、この表だけで断定しないでください。サイトの変更・検索結果の変動・季節性・Google側の変更が重なります（第7節は、同じ期間に入った変更の一覧です）。",
    "- 平均掲載順位は、日ごとの値を表示回数で重みづけした近似です。ページ別・クエリ別の順位は、画面の集計の値です。", "");
  return L.join("\n");
}
