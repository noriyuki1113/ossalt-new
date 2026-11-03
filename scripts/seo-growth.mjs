#!/usr/bin/env node
/**
 * SEO Growth Engine（手動実行・読み取り専用）。
 *
 *   node scripts/seo-growth.mjs rank   --cur <直近28日のフォルダ> [--prev <前28日のフォルダ>] [--site out] [--qi auto|<audit.json>] [--out reports/seo/growth/rank.md]
 *   node scripts/seo-growth.mjs effect --before <変更前の期間のフォルダ> --after <変更後の期間のフォルダ> [--ledger agency/ledger.json] [--out reports/seo/growth/effect.md]
 *   共通: --allow-sample（架空のサンプルデータを読む。レポートに「サンプル」と明示）
 *   期間の指定（フォルダに meta.json が無いとき）: --cur-from/--cur-to/--prev-from/--prev-to/--before-from/...  （YYYY-MM-DD）
 *
 * エクスポートのフォルダ：GSC画面の「エクスポート」で得たCSV一式（クエリ.csv・ページ.csv・デバイス.csv・フィルタ.csv）。
 * 出力は gitignore 済みの場所（reports/seo/）だけ。外部通信なし・認証情報なし。
 */
import { mkdir, writeFile, readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readExportDir, resolveConditions } from "./gsc-compare-lib.mjs";
import { loadSiteState } from "./seo-agency.mjs";
import { buildGrowth, renderGrowth, loadQiIndex } from "./seo-growth-lib.mjs";
import { evaluateEntry, renderEffect } from "./seo-effect-lib.mjs";

const OUT_OK = /(^|\/)(reports\/(seo|private|quality)|agency\/(data|reports))(\/|$)/;

function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const o = { cmd, allowSample: false };
  const flags = ["--cur", "--prev", "--before", "--after", "--site", "--qi", "--out", "--ledger", "--top", "--min-impressions",
    "--cur-from", "--cur-to", "--prev-from", "--prev-to", "--before-from", "--before-to", "--after-from", "--after-to"];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--allow-sample") { o.allowSample = true; continue; }
    if (!flags.includes(rest[i]) || rest[i + 1] == null || rest[i + 1].startsWith("--")) throw new Error(`不正な引数: ${rest[i]}`);
    o[rest[i].slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = rest[++i];
  }
  return o;
}

async function load(dir, o, prefix) {
  const exp = await readExportDir(dir);
  if (exp.sample && !o.allowSample) throw new Error(`${dir} は架空のサンプルデータです。実測として扱わないため、--allow-sample が無いと読み込みません。`);
  const from = o[`${prefix}From`], to = o[`${prefix}To`];
  if (from || to) {
    if (!(from && to)) throw new Error(`--${prefix}-from と --${prefix}-to は両方指定してください`);
    const meta = { from, to };
    exp.conditions = { ...exp.conditions, ...resolveConditions({ filters: { dateText: null, searchType: null, country: null, device: null }, meta, hasFiltersFile: true }), searchType: exp.conditions.searchType, country: exp.conditions.country, device: exp.conditions.device, brandFiltered: exp.conditions.brandFiltered, dateText: exp.conditions.dateText };
  }
  return exp;
}

async function latestQi() {
  try {
    const dirs = (await readdir(resolve("reports/quality"))).filter((d) => /^\d{4}-\d{2}-\d{2}-/.test(d)).sort();
    for (const d of dirs.reverse()) {
      try { return { path: `reports/quality/${d}/audit.json`, audit: JSON.parse(await readFile(resolve("reports/quality", d, "audit.json"), "utf8")) }; } catch { /* 次 */ }
    }
  } catch { /* なし */ }
  return null;
}

async function save(out, text) {
  const rel = out.replace(/\\/g, "/");
  if (!OUT_OK.test(rel)) throw new Error(`出力先は gitignore 済みの場所にしてください（reports/seo/・reports/private/・agency/data/・agency/reports/）。指定: ${out}`);
  await mkdir(dirname(resolve(out)), { recursive: true });
  await writeFile(resolve(out), text, "utf8");
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const today = new Date().toISOString().slice(0, 10);
  if (o.cmd === "rank") {
    if (!o.cur) throw new Error("--cur が必要です");
    const cur = await load(o.cur, o, "cur");
    const prev = o.prev ? await load(o.prev, o, "prev") : null;
    const siteState = o.site ? await loadSiteState(o.site) : null;
    let qiMap = null, qiNote = "QI評価：未取得（--qi auto で最新の reports/quality/ を使う）";
    if (o.qi) {
      const q = o.qi === "auto" ? await latestQi() : { path: o.qi, audit: JSON.parse(await readFile(resolve(o.qi), "utf8")) };
      if (q) { qiMap = loadQiIndex(q.audit); qiNote = `QI評価：${q.path}（${qiMap.size}ページ）`; }
    }
    const g = buildGrowth({ cur, prev, siteState, qiMap, limit: o.top ? Number(o.top) : 10, minImpressions: o.minImpressions ?? "auto" });
    g.notes.push(qiNote);
    const md = renderGrowth(g, { cur, prev, generatedAt: today, sample: cur.sample || !!prev?.sample });
    const out = o.out ?? "reports/seo/growth/rank.md";
    await save(out, md);
    console.log(`レポートを保存: ${out}（候補 ${g.ranked.items.length}件${g.comparison && !g.comparison.check.ok ? "。期間比較は条件不一致のため未実施" : ""}）`);
  } else if (o.cmd === "effect") {
    if (!o.before || !o.after) throw new Error("--before と --after が必要です");
    const before = await load(o.before, o, "before"), after = await load(o.after, o, "after");
    const ledger = JSON.parse(await readFile(resolve(o.ledger ?? "agency/ledger.json"), "utf8"));
    const results = ledger.entries.map((e) => evaluateEntry(e, before, after, { otherEntries: ledger.entries }));
    const out = o.out ?? "reports/seo/growth/effect.md";
    await save(out, renderEffect(results, { generatedAt: today, sample: before.sample || after.sample }));
    console.log(`レポートを保存: ${out}（${results.length}件）`);
  } else throw new Error("使い方: rank | effect（ファイル先頭の説明を参照）");
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]))
  main().catch((e) => { console.error("SEO Growth: " + e.message); process.exitCode = 1; });
