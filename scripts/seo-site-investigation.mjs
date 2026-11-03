#!/usr/bin/env node
/**
 * 既存サイト（out/）の追加調査（読み取り専用）。
 *   npm run build && node scripts/seo-site-investigation.mjs [--dir out] [--out reports/seo/site-investigation.md]
 * 出力先は gitignore 済み（reports/seo/）。サイト・設定・データは変更しない。
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSite, familyOf } from "./seo-audit-lib.mjs";
import { sitemapGap, titleReview, renderTitleReview } from "./seo-site-investigation-lib.mjs";

async function main() {
  const a = process.argv.slice(2);
  const get = (f, d) => (a.includes(f) ? a[a.indexOf(f) + 1] : d);
  const dir = get("--dir", "out"), out = get("--out", "reports/seo/site-investigation.md");
  const site = await loadSite(resolve(dir));
  let archived = new Set();
  try {
    const tools = JSON.parse(await readFile(resolve("public/data/tools.json"), "utf8"));
    archived = new Set(tools.filter((t) => t.github_archived).map((t) => `/tools/${t.id}/`));
  } catch {}
  // 元データでアーカイブ解除済みなのに、public/data が未反映のツール（日次更新で解消する一時的な差）
  let pendingRefresh = new Set();
  try {
    const src = JSON.parse(await readFile(resolve("data-source/tools.json"), "utf8"));
    const list = Array.isArray(src) ? src : src.tools ?? [];
    pendingRefresh = new Set(list.filter((t) => t.github_archived === false && archived.has(`/tools/${t.id}/`)).map((t) => `/tools/${t.id}/`));
  } catch {}
  const gap = sitemapGap(site, { archived, pendingRefresh });
  const tr = titleReview(site.pages, { familyOf });
  const L = ["# OSSALT 既存サイトの追加調査（読み取り専用）", "", `生成日: ${new Date().toISOString().slice(0, 10)}`, "", "## サイトマップの差分", "",
    `index対象 ${gap.indexableCount}件 / サイトマップ ${gap.sitemapCount}件`, "", "### indexされるのにサイトマップに無い", ""];
  for (const x of gap.notInSitemap) L.push(`- ${x.path}｜${({ intentional: "意図的", pending: "一時的", review: "要確認" })[x.cls]}｜${x.why}${x.canonical ? `｜canonical: ${x.canonical}` : ""}`);
  L.push("", "### サイトマップにあるのにindexされない・存在しない", "");
  L.push(gap.inSitemapNotIndexable.length ? gap.inSitemapNotIndexable.map((x) => `- ${x.path}｜${x.why}`).join("\n") : "なし。", "", renderTitleReview(tr));
  await mkdir(dirname(resolve(out)), { recursive: true });
  await writeFile(resolve(out), L.join("\n") + "\n", "utf8");
  console.log(L.join("\n"));
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main().catch((e) => { console.error(e.message); process.exitCode = 1; });
