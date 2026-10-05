#!/usr/bin/env node
/**
 * 解説の点検：手書きの解説（content/）と最新の掲載データ（public/data/）を突き合わせ、
 * 食い違いを docs/content-check.md にまとめる。判定は scripts/content-check-lib.mjs。
 *
 * 使い方（src/lib の .ts を読み込むため、型を外して実行するフラグが要る）:
 *   node --experimental-strip-types scripts/content-check.mjs
 *   node --experimental-strip-types scripts/content-check.mjs --stdout   … ファイルに書かず表示だけ
 *   node --experimental-strip-types scripts/content-check.mjs --strict   … 要対応があれば終了コード1
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { buildComparePairs } from "../src/lib/compare.ts";
import { slugifyCompetitor } from "../src/lib/tools.ts";
import { checkContent, renderReport } from "./content-check-lib.mjs";

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const TODAY = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const rawTools = readJson("public/data/tools.json");
const allTools = Array.isArray(rawTools) ? rawTools : rawTools.tools;
const tools = new Map(allTools.map((t) => [t.id, t]));
const active = allTools.filter((t) => !t.github_archived);

const pairs = new Set(buildComparePairs(active).map((p) => p.slug));
const alternatives = new Set();
for (const t of active) {
  for (const name of [t.primary_competitor, ...(t.also_competitors ?? [])]) {
    const s = name && slugifyCompetitor(name);
    if (s) alternatives.add(s);
  }
}
const categories = new Set(readJson("public/data/categories.json").map((c) => c.slug));

const KINDS = { tool: "tools", compare: "compare", alternative: "alternatives", category: "categories", blog: "blog" };
const docs = [];
const counts = {};
for (const [kind, dir] of Object.entries(KINDS)) {
  const abs = path.join(ROOT, "content", dir);
  const files = fs.existsSync(abs) ? fs.readdirSync(abs).filter((f) => f.endsWith(".md")) : [];
  counts[kind] = files.length;
  for (const f of files) {
    const { data, content } = matter(fs.readFileSync(path.join(abs, f), "utf8"));
    docs.push({
      kind,
      slug: f.replace(/\.md$/, ""),
      text: content,
      updated: data.updated ? String(data.updated) : undefined,
      date: data.date ? String(data.date) : undefined,
    });
  }
}
const blogDates = new Map(docs.filter((d) => d.kind === "blog").map((d) => [d.slug, d.date ?? "0000-00-00"]));

const issues = checkContent({ docs, tools, pairs, alternatives, categories, blogDates, today: TODAY });
const report = renderReport(issues, { today: TODAY, counts });

if (argv.includes("--stdout")) process.stdout.write(report);
else {
  fs.writeFileSync(path.join(ROOT, "docs", "content-check.md"), report);
  const c = (lv) => issues.filter((i) => i.level === lv).length;
  console.log(`docs/content-check.md を更新しました（要対応${c("要対応")}・要確認${c("要確認")}・見直し${c("見直し")}）`);
}
if (argv.includes("--strict") && issues.some((i) => i.level === "要対応")) process.exit(1);
