#!/usr/bin/env node
/**
 * 検索表示の前後比較（2026-11-25 以降の再分析）の道具。読み取り専用。サイト・設定・データは変更しない。
 * 手順と推奨の期間は docs/gsc-comparison-plan.md。
 *
 *   register   画面のエクスポート（または API の取得結果）を、条件つきで保管する
 *              node scripts/seo-baseline.mjs register --export <フォルダ> --label <名前> --from YYYY-MM-DD --to YYYY-MM-DD --property sc-domain:ossalt.jp
 *   compare    保管した2つを、同じ条件で比べる（日別・ページ別・クエリ別・インデックス登録・サイトの構造・期間中の変更）
 *              node scripts/seo-baseline.mjs compare --before <保管名> --after <保管名> [--index-before <フォルダ> --index-after <フォルダ>]
 *                [--site-before <site-*.json> --site-after <site-*.json>] [--inspect-before <json> --inspect-after <json>] [--out reports/seo/baseline/compare.md]
 *   daily      1つの日別の系列を、2つの同じ長さの期間に分けて比べる（ページ別・クエリ別は比べない）
 *              node scripts/seo-baseline.mjs daily --export <フォルダ> --a 2026-10-26..2026-11-08 --b 2026-11-09..2026-11-22
 *   site-snapshot  ビルド結果（out/）の構造を記録する（index対象・サイトマップ・title・canonical など）
 *              node scripts/seo-baseline.mjs site-snapshot --out-dir out --label baseline-20261106
 *
 * 保管先：agency/data/baselines/<名前>/（Git管理外）。レポート：reports/seo/ ・ agency/reports/ ・ reports/private/ のみ（Search Console の数値を含むため）。
 * 標準出力には、件数と日付だけを出し、Search Console の数値は出さない。
 */
import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readExportDir } from "./gsc-compare-lib.mjs";
import {
  buildBaselineMeta, buildSiteSnapshot, compareExportPair, conditionProblems, compareIndex, compareWindows, diffSiteSnapshots, pageFacts,
  readDailyFromDir, readIndexExport, renderComparison, summarizeInspections,
} from "./seo-baseline-lib.mjs";

const ROOT = process.cwd();
export const BASELINE_DIR = "agency/data/baselines";
export const OUT_OK = /^(reports\/(seo|quality|private)|agency\/reports)\//;

export function guardOut(path) {
  const rel = resolve(path).replace(resolve(".") + "/", "");
  if (!OUT_OK.test(rel)) throw new Error("出力には Search Console の数値が入ります。reports/seo/・reports/quality/・reports/private/・agency/reports/ のいずれか（Git管理外）を指定してください");
  return resolve(path);
}
export function guardLabel(label) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,60}$/.test(label ?? "")) throw new Error("--label は英数字・.・_・- の1〜61文字（先頭は英数字）");
  return label;
}
function flags(argv, allowed) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    if (!allowed.includes(argv[i]) || argv[i + 1] == null || argv[i + 1].startsWith("--")) throw new Error(`不正な引数: ${argv[i]}`);
    o[argv[i].slice(2)] = argv[++i];
  }
  return o;
}
const range = (s, name) => {
  const m = /^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/.exec(s ?? "");
  if (!m) throw new Error(`${name} は YYYY-MM-DD..YYYY-MM-DD の形で指定してください`);
  return { from: m[1], to: m[2] };
};

async function register(o) {
  if (!o.export || !o.label || !o.from || !o.to) throw new Error("--export・--label・--from・--to が必要です");
  const label = guardLabel(o.label);
  const dest = resolve(ROOT, BASELINE_DIR, label);
  if (await stat(dest).then(() => true, () => false)) throw new Error(`すでに保管されています（${BASELINE_DIR}/${label}）。上書きしません。別の名前にしてください`);
  const daily = await readDailyFromDir(resolve(o.export));
  const { meta, warnings } = buildBaselineMeta({
    from: o.from, to: o.to, property: o.property, daily, label,
    conditions: o["brand-filtered"] != null ? { brandFiltered: o["brand-filtered"] === "true" } : {},
    registeredOn: new Date().toISOString().slice(0, 10), note: o.note ?? null,
  });
  await mkdir(dirname(dest), { recursive: true });
  await cp(resolve(o.export), dest, { recursive: true, errorOnExist: true, force: false });
  await writeFile(join(dest, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
  const files = (await readdir(dest)).filter((n) => /\.csv$/i.test(n));
  console.log(`保管：${BASELINE_DIR}/${label}／期間 ${meta.from}〜${meta.to}／プロパティ ${meta.property ?? "未記録"}／CSV ${files.length}ファイル／日別 ${daily ? `${daily.rows.length}日（${daily.file}）` : "なし"}`);
  for (const w of warnings) console.log(`注意：${w}`);
}

async function load(label) {
  const dir = resolve(ROOT, BASELINE_DIR, guardLabel(label));
  const meta = JSON.parse(await readFile(join(dir, "meta.json"), "utf8"));
  const exp = await readExportDir(dir);
  const daily = await readDailyFromDir(dir);
  return { dir, meta, exp, daily };
}

function changelogBetween(from, to) {
  try {
    const out = execFileSync("git", ["log", "origin/claude/ossalt-jp-setup-deploy-tsv3x8", "--first-parent", `--since=${from} 00:00 +0900`, `--until=${to} 23:59 +0900`, "--date=format:%m/%d", "--pretty=%cd %s"], { cwd: ROOT, encoding: "utf8" });
    return out.split("\n").filter((l) => l && !/(日次更新|プレビュー画像|候補|SNS投稿|月次レポート|解説の点検)/.test(l)).map((l) => l.slice(0, 140));
  } catch { return []; }
}

async function compare(o) {
  if (!o.before || !o.after) throw new Error("--before と --after（保管名）が必要です");
  const B = await load(o.before), A = await load(o.after);
  const warn = [];
  const cond = conditionProblems(B.meta, A.meta);
  let daily = null, tables = null;
  if (cond.length) {
    daily = { ok: false, errors: cond, warnings: [], a: null, b: null, daily: [] };
    const refused = { check: { ok: false, errors: cond, warnings: [], unverified: [] } };
    tables = { pages: refused, queries: refused };
  } else {
    if (B.daily && A.daily) {
      const rows = [...B.daily.rows, ...A.daily.rows.filter((r) => !B.daily.rows.some((x) => x.date === r.date))].sort((x, y) => x.date.localeCompare(y.date));
      daily = compareWindows(rows, { from: B.meta.from, to: B.meta.to }, { from: A.meta.from, to: A.meta.to });
    } else warn.push("日別の表が、前か後で見つかりません。");
    tables = compareExportPair(B.exp, A.exp);
  }
  const index = o["index-before"] || o["index-after"] ? compareIndex(await readIndexExport(o["index-before"] && resolve(o["index-before"])), await readIndexExport(o["index-after"] && resolve(o["index-after"]))) : null;
  let inspections = null;
  if (o["inspect-after"]) {
    try { inspections = summarizeInspections(JSON.parse(await readFile(resolve(o["inspect-after"]), "utf8"))); } catch { warn.push("URL検査の結果（--inspect-after）を読めません。"); }
  }
  let site = null;
  if (o["site-before"] && o["site-after"]) {
    try { site = diffSiteSnapshots(JSON.parse(await readFile(resolve(o["site-before"]), "utf8")), JSON.parse(await readFile(resolve(o["site-after"]), "utf8"))); } catch { warn.push("サイトの構造の記録を読めません。"); }
  }
  const md = renderComparison({
    meta: { before: B.meta, after: A.meta }, daily, tables, index, inspections, site,
    changelog: changelogBetween(B.meta.from, A.meta.to), generatedAt: new Date().toISOString(),
  });
  const out = guardOut(o.out ?? "reports/seo/baseline/compare.md");
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, md);
  console.log(`比較を ${out.replace(resolve(".") + "/", "")} に出力しました（数値を含むため、コミットしないでください）`);
  for (const w of warn) console.log(`注意：${w}`);
  const bad = [daily && !daily.ok ? "日別" : null, ...["pages", "queries"].filter((k) => !tables[k].check.ok)].filter(Boolean);
  if (bad.length) console.log(`比較できなかった項目：${bad.join("・")}（理由はレポートの該当の節）`);
}

async function dailyCmd(o) {
  if (!o.export || !o.a || !o.b) throw new Error("--export・--a・--b が必要です");
  const d = await readDailyFromDir(resolve(o.export));
  if (!d) throw new Error("日別の表が見つかりません");
  const a = range(o.a, "--a"), b = range(o.b, "--b");
  const daily = compareWindows(d.rows, a, b);
  const md = renderComparison({ meta: { before: { ...a, searchType: "web", country: "all", device: "all", brandFiltered: false, property: "（同じエクスポート）" }, after: { ...b, searchType: "web", country: "all", device: "all", brandFiltered: false, property: "（同じエクスポート）" } }, daily, tables: null, index: null, inspections: null, site: null, changelog: changelogBetween(a.from, b.to), generatedAt: new Date().toISOString() });
  const out = guardOut(o.out ?? "reports/seo/baseline/daily.md");
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, md);
  console.log(`日別の比較を ${out.replace(resolve(".") + "/", "")} に出力しました${daily.ok ? "" : "（比較できませんでした。理由はレポート）"}`);
}

async function walk(dir, base = dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === "_next") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p, base)));
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

export async function snapshotFromOut(outDir) {
  const pages = new Map();
  for (const f of await walk(outDir)) {
    const rel = "/" + f.slice(outDir.length + 1).replace(/\\/g, "/");
    const url = rel === "/index.html" ? "/" : rel.endsWith("/index.html") ? rel.slice(0, -10) : rel;
    pages.set(url, pageFacts(await readFile(f, "utf8")));
  }
  let sitemap = [];
  try { sitemap = [...(await readFile(join(outDir, "sitemap.xml"), "utf8")).matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1].replace("https://ossalt.jp", "") || "/"); } catch { /* サイトマップが無ければ空 */ }
  return { pages, sitemap };
}

async function siteSnapshot(o) {
  if (!o["out-dir"] || !o.label) throw new Error("--out-dir と --label が必要です");
  const label = guardLabel(o.label);
  const { pages, sitemap } = await snapshotFromOut(resolve(o["out-dir"]));
  if (pages.size < 10) throw new Error("ビルド結果が小さすぎます。先に npm run build を実行してください");
  const snap = buildSiteSnapshot(pages, sitemap, { label, builtAt: new Date().toISOString() });
  const out = guardOut(o.out ?? `reports/seo/baseline/site-${label}.json`);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(snap) + "\n");
  console.log(`サイトの構造を記録：${out.replace(resolve(".") + "/", "")}／ページ ${snap.total.pages}・index対象 ${snap.total.indexable}・サイトマップ ${snap.total.sitemap}・noindex ${snap.total.noindex}・転送 ${snap.total.redirect}`);
}

async function main(argv) {
  const [cmd, ...rest] = argv;
  const common = ["--export", "--label", "--from", "--to", "--property", "--brand-filtered", "--before", "--after", "--index-before", "--index-after", "--site-before", "--site-after", "--inspect-before", "--inspect-after", "--out", "--a", "--b", "--out-dir", "--note"];
  const o = flags(rest, common);
  if (cmd === "register") return register(o);
  if (cmd === "compare") return compare(o);
  if (cmd === "daily") return dailyCmd(o);
  if (cmd === "site-snapshot") return siteSnapshot(o);
  throw new Error("使い方: register | compare | daily | site-snapshot（docs/gsc-comparison-plan.md を参照）");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main(process.argv.slice(2)).catch((e) => { console.error(`エラー: ${e.message}`); process.exitCode = 1; });
}
