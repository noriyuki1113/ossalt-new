#!/usr/bin/env node
/**
 * ビルド済みサイト（out/）の読み取り専用SEO監査。Technician / Linker 用。
 *   npm run build && node scripts/seo-audit.mjs [--out agency/reports/audit.md] [--dir out] [--base https://ossalt.jp] [--strict]
 * サイト・設定・データは一切変更しない。--strict のときだけ、直す必要がある事実が1件でもあれば終了コード1。
 */
import { mkdir, writeFile, stat, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { audit, inboundReport, loadSite, renderAudit } from "./seo-audit-lib.mjs";

function parseArgs(argv) {
  const o = { dir: "out", base: "https://ossalt.jp", strict: false };
  const flags = { "--dir": "dir", "--base": "base", "--out": "out" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--strict") { o.strict = true; continue; }
    if (!flags[argv[i]] || !argv[i + 1] || argv[i + 1].startsWith("--")) throw new Error(`不正な引数: ${argv[i]}`);
    o[flags[argv[i]]] = argv[++i];
  }
  return o;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  try { await stat(resolve(o.dir, "index.html")); }
  catch { throw new Error(`${o.dir}/ にビルド結果がありません。先に npm run build を実行してください`); }
  const site = await loadSite(resolve(o.dir));
  // アーカイブ済みのツールは、サイトマップ・内部リンクの対象外が意図的な設計（src/app/sitemap.ts）。掲載データから特定する
  let archived = new Set();
  try {
    const tools = JSON.parse(await readFile(resolve("public/data/tools.json"), "utf8"));
    archived = new Set(tools.filter((t) => t.github_archived).map((t) => `/tools/${t.id}/`));
  } catch {}
  const result = audit(site, { base: o.base, archived });
  const md = renderAudit(result, inboundReport(site, result), { generatedAt: new Date().toISOString().slice(0, 10), base: o.base });
  if (o.out) {
    await mkdir(dirname(resolve(o.out)), { recursive: true });
    await writeFile(resolve(o.out), md, "utf8");
    console.log(`監査結果を保存: ${o.out}（直す必要がある事実 ${result.issues.length}種、確認 ${result.review.length}種）`);
  } else console.log(md);
  if (o.strict && result.issues.length) process.exitCode = 1;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]))
  main().catch((e) => { console.error("SEO audit: " + e.message); process.exitCode = 1; });
