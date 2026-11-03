/**
 * Search Console の手動エクスポート（CSVのフォルダ）を2期間そろえて比較する、純粋関数中心のライブラリ。
 *
 * 原則：
 *  - 比較条件（期間の長さ・連続性・検索タイプ・国・デバイス・ブランド除外・集計単位）がそろわないときは、比較を拒否する。
 *    確認できない条件は「未確認」と明示する（そろっていると仮定しない）。
 *  - GSCのCSVは行数に上限がある（画面からのエクスポートは1,000行）。上限に達した表は「全件ではない」と扱い、
 *    片方の期間にしか無い行を「新規」「消えた」と断定しない。
 *  - 匿名化クエリはCSVに含まれない。デバイス別の合計との差（カバー率）を出し、全件として扱わない。
 *  - 数値は読み取ったCSVの値だけ。補完・推定・架空の値は作らない。
 */
import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { decodeBuffer, detectDelimiter, readGscExport } from "./seo-agency.mjs";
import { parseCsv } from "./gsc-weekly-report.mjs";

/** GSC画面のエクスポートの行数上限（画面の仕様。変わる可能性があるので、定数にして明示する） */
export const GSC_UI_ROW_CAP = 1000;
export const SAMPLE_MARKER = "SAMPLE.txt";

const FILE_NAMES = {
  queries: ["クエリ.csv", "queries.csv", "Queries.csv"],
  pages: ["ページ.csv", "pages.csv", "Pages.csv"],
  pairs: ["pairs.csv", "クエリ×ページ.csv"],
  devices: ["デバイス.csv", "devices.csv", "Devices.csv"],
  countries: ["国.csv", "countries.csv", "Countries.csv"],
  filters: ["フィルタ.csv", "filters.csv", "Filters.csv"],
};

const ymd = (d) => d.toISOString().slice(0, 10);
export const isoDay = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) throw new Error(`日付は YYYY-MM-DD で指定してください: ${s}`);
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || ymd(d) !== s) throw new Error(`存在しない日付です: ${s}`);
  return d;
};
export const daysBetween = (from, to) => Math.round((isoDay(to) - isoDay(from)) / 86_400_000) + 1;
export const addDay = (s, n) => ymd(new Date(isoDay(s).getTime() + n * 86_400_000));

/* ------------------------------------------------------------------ *
 * 条件の読み取り（フィルタ.csv と meta.json）
 * ------------------------------------------------------------------ */

/** 検索タイプの表記を正規化。分からなければ null（未確認） */
export function normalizeSearchType(v) {
  const s = String(v ?? "").normalize("NFKC").toLowerCase();
  if (!s) return null;
  if (/ウェブ|web/.test(s)) return "web";
  if (/画像|image/.test(s)) return "image";
  if (/動画|video/.test(s)) return "video";
  if (/ニュース|news/.test(s)) return "news";
  if (/discover/.test(s)) return "discover";
  return s;
}

/** 「過去 28 日間」→ 28、絶対日付（2026/10/01 - 2026/10/28 など）→ from/to。読めなければ両方 null */
export function parseDateText(text) {
  const s = String(text ?? "").normalize("NFKC");
  const abs = [...s.matchAll(/(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})/g)].map((m) => `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`);
  if (abs.length >= 2) return { from: abs[0], to: abs[1], relativeDays: null };
  const rel = /過去\s*(\d+)\s*日|last\s*(\d+)\s*days/i.exec(s);
  if (rel) return { from: null, to: null, relativeDays: Number(rel[1] ?? rel[2]) };
  const months = /過去\s*(\d+)\s*(か|ヶ|ケ)?月|last\s*(\d+)\s*months/i.exec(s);
  if (months) return { from: null, to: null, relativeDays: null, months: Number(months[1] ?? months[3]) };
  return { from: null, to: null, relativeDays: null };
}

/** フィルタ.csv（2列：フィルタ,値）→ 条件 */
export function parseFilters(text) {
  const out = { searchType: null, dateText: null, country: null, device: null, other: [] };
  if (!text) return out;
  const rows = parseCsv(String(text).replace(/^﻿/, ""), { delimiter: detectDelimiter(text) });
  for (const [k, v] of rows.slice(1)) {
    const key = String(k ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");
    if (/検索タイプ|searchtype/.test(key)) out.searchType = String(v ?? "").trim();
    else if (/日付|date/.test(key)) out.dateText = String(v ?? "").trim();
    else if (/^国|country/.test(key)) out.country = String(v ?? "").trim();
    else if (/デバイス|device/.test(key)) out.device = String(v ?? "").trim();
    else if (k) out.other.push(`${k}=${v}`);
  }
  return out;
}

/**
 * エクスポートの条件を1つにまとめる。優先順位：meta.json（手で書いた申告） > フィルタ.csv。
 * 日付は、絶対日付が分かるときだけ from/to を持つ（相対表記「過去28日間」だけでは期間を確定しない）。
 * country / device が null のときは「絞り込みなし（全体）」ではなく「未確認」。フィルタ.csv は絞り込んだときだけ行が出る
 * ため、フィルタ.csv が存在して国・デバイスの行が無い場合は「絞り込みなし」と読む（assumedAll で区別して表示する）。
 */
export function resolveConditions({ filters, meta = {}, hasFiltersFile }) {
  const dt = parseDateText(filters?.dateText);
  const from = meta.from ?? dt.from;
  const to = meta.to ?? dt.to;
  const days = from && to ? daysBetween(from, to) : dt.relativeDays;
  const assume = (declared, parsed) => declared !== undefined ? { value: declared, source: "meta.json" } : parsed ? { value: parsed, source: "フィルタ.csv" } : hasFiltersFile ? { value: "all", source: "フィルタ.csv に行が無い＝絞り込みなし（仮定）", assumedAll: true } : { value: null, source: "未確認" };
  return {
    from: from ?? null, to: to ?? null, days: days ?? null,
    dateText: filters?.dateText ?? null,
    searchType: normalizeSearchType(meta.searchType ?? filters?.searchType),
    country: assume(meta.country, filters?.country),
    device: assume(meta.device, filters?.device),
    brandFiltered: meta.brandFiltered ?? null,
    pagesNonbrandConfirmed: meta.pagesNonbrandConfirmed ?? null,
    note: meta.note ?? null,
  };
}

/* ------------------------------------------------------------------ *
 * フォルダの読み込み
 * ------------------------------------------------------------------ */

async function readFirst(dir, names) {
  for (const n of names) {
    try { return { name: n, text: decodeBuffer(await readFile(join(dir, n))) }; } catch { /* 次の名前 */ }
  }
  return null;
}

/** デバイス別（または国別）の表の合計。カバー率の分母に使う */
export function sumTotals(text) {
  if (!text) return null;
  const rows = parseCsv(String(text).replace(/^﻿/, ""), { delimiter: detectDelimiter(text) });
  const h = rows[0]?.map((x) => String(x).normalize("NFKC").toLowerCase());
  const iC = h?.findIndex((x) => /クリック|click/.test(x)), iI = h?.findIndex((x) => /表示|impression/.test(x));
  if (!h || iC < 0 || iI < 0) return null;
  let clicks = 0, impressions = 0;
  for (const r of rows.slice(1)) {
    const c = Number(String(r[iC]).replace(/,/g, "")), i = Number(String(r[iI]).replace(/,/g, ""));
    if (Number.isFinite(c) && Number.isFinite(i)) { clicks += c; impressions += i; }
  }
  return { clicks, impressions };
}

/** エクスポートのフォルダを読む。無いファイルは null（補わない） */
export async function readExportDir(dir, { brand = "ossalt" } = {}) {
  const root = resolve(dir);
  await stat(root);
  const sample = await stat(join(root, SAMPLE_MARKER)).then(() => true, () => false);
  let meta = {};
  try { meta = JSON.parse(await readFile(join(root, "meta.json"), "utf8")); } catch { /* 任意 */ }
  const files = {};
  for (const [k, names] of Object.entries(FILE_NAMES)) files[k] = await readFirst(root, names);
  const filters = files.filters ? parseFilters(files.filters.text) : null;
  const conditions = resolveConditions({ filters, meta, hasFiltersFile: !!files.filters });
  const parse = (k, kind) => (files[k] ? readGscExport(files[k].text, kind, { brand }) : null);
  const queries = parse("queries", "query"), pages = parse("pages", "page"), pairs = parse("pairs", "pair");
  const totals = sumTotals(files.devices?.text) ?? sumTotals(files.countries?.text);
  const rawCount = (k) => (files[k] ? parseCsv(files[k].text.replace(/^﻿/, ""), { delimiter: detectDelimiter(files[k].text) }).length - 1 : null);
  return {
    dir: root, sample, conditions, totals,
    queries, pages, pairs,
    rawRows: { queries: rawCount("queries"), pages: rawCount("pages"), pairs: rawCount("pairs") },
    present: Object.fromEntries(Object.entries(files).map(([k, v]) => [k, v?.name ?? null])),
  };
}

/** 行数が上限に達した表は、全件ではないとみなす（上限ちょうど、または上限以上） */
export function capState(rawRows, cap = GSC_UI_ROW_CAP) {
  return { capped: rawRows != null && rawRows >= cap, rows: rawRows, cap };
}

/** CSVに含まれる行の合計 ÷ 全体の合計。匿名化クエリ・上限・ブランド除外で 1 未満になる */
export function coverage(rows, totals) {
  if (!rows || !totals) return null;
  const clicks = rows.reduce((s, r) => s + r.clicks, 0), impressions = rows.reduce((s, r) => s + r.impressions, 0);
  return {
    clicks, impressions,
    clickShare: totals.clicks ? clicks / totals.clicks : null,
    impressionShare: totals.impressions ? impressions / totals.impressions : null,
  };
}

/* ------------------------------------------------------------------ *
 * 比較可能性
 * ------------------------------------------------------------------ */

/**
 * 2期間が比較できるかを判定する。errors があれば比較しない。warnings は結果に付けて表示する。
 *  errors：期間の長さが違う／重複する／検索タイプ・国・デバイスが違う／必須の表が無い
 *  warnings：期間が連続していない（空きがある）、確認できない条件、行数上限、サンプル（架空）データ
 */
export function checkComparable(cur, prev, { kind = "queries" } = {}) {
  const errors = [], warnings = [], unverified = [];
  const c = cur.conditions, p = prev.conditions;
  if (cur.sample || prev.sample) warnings.push("サンプル（架空）データです。実測値ではありません。");
  if (!cur[kind] || !prev[kind]) errors.push(`${kind === "queries" ? "クエリ別" : kind === "pages" ? "ページ別" : "クエリ×ページ"}の表が、両方の期間にそろっていません。`);

  // 期間
  if (c.from && c.to && p.from && p.to) {
    if (c.days !== p.days) errors.push(`期間の長さが違います（直近 ${c.days}日 / 前 ${p.days}日）。`);
    if (p.to >= c.from) errors.push(`期間が重なっています（前の期間の終了 ${p.to} ≥ 直近の開始 ${c.from}）。`);
    else if (addDay(p.to, 1) !== c.from) warnings.push(`期間が連続していません（前の期間の終了 ${p.to}、直近の開始 ${c.from}）。季節性・曜日構成の違いに注意。`);
  } else {
    unverified.push("期間（日付）：エクスポートに絶対日付がありません。meta.json（from/to）または --cur-from/--cur-to などで指定してください。連続性・重複を検証できていません。");
    if (c.days && p.days && c.days !== p.days) errors.push(`期間の長さが違います（直近 ${c.days}日 / 前 ${p.days}日）。`);
  }
  // 検索タイプ・国・デバイス
  if (c.searchType == null || p.searchType == null) unverified.push("検索タイプ：どちらかで確認できません。");
  else if (c.searchType !== p.searchType) errors.push(`検索タイプが違います（${c.searchType} / ${p.searchType}）。`);
  for (const [label, key] of [["国", "country"], ["デバイス", "device"]]) {
    const a = c[key], b = p[key];
    if (a.value == null || b.value == null) unverified.push(`${label}：どちらかで確認できません。`);
    else if (a.value !== b.value) errors.push(`${label}の絞り込みが違います（${a.value} / ${b.value}）。`);
    else if (a.assumedAll && b.assumedAll) unverified.push(`${label}：両方とも「絞り込みなし」と仮定しています（フィルタ.csv に行が無いため）。`);
  }
  // ブランド除外
  if (c.brandFiltered == null || p.brandFiltered == null) unverified.push("ブランド検索の除外：どちらかで申告がありません（meta.json の brandFiltered）。");
  else if (c.brandFiltered !== p.brandFiltered) errors.push("ブランド検索の除外の有無が、期間で違います。");
  // 行数上限
  for (const [label, o] of [["直近", cur], ["前", prev]]) {
    const cs = capState(o.rawRows[kind]);
    if (cs.capped) warnings.push(`${label}の期間の表は ${cs.rows} 行で、画面エクスポートの上限（${cs.cap}行）に達しています。全件ではありません。`);
  }
  return { ok: errors.length === 0, errors, warnings, unverified };
}

/* ------------------------------------------------------------------ *
 * 比較
 * ------------------------------------------------------------------ */

export const LOW_SAMPLE_IMPRESSIONS = 30;

const val = (r) => (r ? { clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position } : null);

/**
 * 行ごとの差分。キーは label（クエリ別ならクエリ、ページ別ならURL、クエリ×ページなら「クエリ → URL」）。
 * status:
 *  - both：両期間にある
 *  - cur-only / prev-only：片方にだけある。上限に達していない表のときだけ「新たに出た／出なくなった」と読める
 *  - unverifiable：片方にだけあるが、表が上限に達している（上限の外にいるだけかもしれない）
 * 順位の差（dPosition、負＝改善）は、両期間とも表示回数が LOW_SAMPLE_IMPRESSIONS 以上のときだけ出す（lowSample で区別）。
 */
export function compareRows(curRows, prevRows, { curCapped = false, prevCapped = false } = {}) {
  const prevMap = new Map(prevRows.map((r) => [r.label, r]));
  const curMap = new Map(curRows.map((r) => [r.label, r]));
  const out = [];
  for (const [label, c] of curMap) {
    const p = prevMap.get(label);
    const base = { label, kind: c.kind, ...(c.query ? { query: c.query, page: c.page } : {}), cur: val(c), prev: val(p) };
    if (!p) { out.push({ ...base, status: prevCapped ? "unverifiable" : "cur-only" }); continue; }
    const lowSample = c.impressions < LOW_SAMPLE_IMPRESSIONS || p.impressions < LOW_SAMPLE_IMPRESSIONS;
    out.push({
      ...base, status: "both", lowSample,
      dClicks: c.clicks - p.clicks, dImpressions: c.impressions - p.impressions,
      dImpressionsRatio: p.impressions ? c.impressions / p.impressions - 1 : null,
      dCtr: c.ctr - p.ctr,
      dPosition: lowSample ? null : Number((c.position - p.position).toFixed(2)),
    });
  }
  for (const [label, p] of prevMap) {
    if (curMap.has(label)) continue;
    out.push({ label, kind: p.kind, ...(p.query ? { query: p.query, page: p.page } : {}), cur: null, prev: val(p), status: curCapped ? "unverifiable" : "prev-only" });
  }
  return out;
}

export function sumRows(rows) {
  const clicks = rows.reduce((s, r) => s + r.clicks, 0), impressions = rows.reduce((s, r) => s + r.impressions, 0);
  const posNum = rows.reduce((s, r) => s + r.position * r.impressions, 0);
  return { clicks, impressions, ctr: impressions ? clicks / impressions : 0, position: impressions ? posNum / impressions : null };
}

/** 2つのエクスポートを比較する（条件チェック込み）。errors があれば rows は空で、比較しない */
export function compareExports(cur, prev, { kind = "queries" } = {}) {
  const check = checkComparable(cur, prev, { kind });
  if (!check.ok) return { check, rows: [], totals: null, coverage: null };
  const curCapped = capState(cur.rawRows[kind]).capped, prevCapped = capState(prev.rawRows[kind]).capped;
  const rows = compareRows(cur[kind].rows, prev[kind].rows, { curCapped, prevCapped });
  return {
    check, rows,
    totals: { cur: cur.totals, prev: prev.totals },
    coverage: { cur: coverage(cur[kind].rows, cur.totals), prev: coverage(prev[kind].rows, prev.totals) },
    skipped: { cur: cur[kind].skipped, prev: prev[kind].skipped },
    brandExcluded: { cur: cur[kind].brandExcluded, prev: prev[kind].brandExcluded },
  };
}
