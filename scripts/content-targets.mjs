#!/usr/bin/env node
/**
 * 次に解説を書く候補を一覧にする（毎週の解説の追加で使う。docs/content-writing-guide.md）
 *
 *   ツール：手書きの解説がない掲載中のツールを、GitHubのスターが多い順に
 *   比較：解説がない比較の組を、2つのうちスターが少ないほうの値が大きい順に
 *         （両方とも注目度が高い組＝検索されやすい組を優先する）
 *
 * 使い方:
 *   node --experimental-strip-types scripts/content-targets.mjs            … 各10件
 *   node --experimental-strip-types scripts/content-targets.mjs --n 5
 */
import fs from "node:fs";
import path from "node:path";
import { buildComparePairs } from "../src/lib/compare.ts";

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const N = Number(argv[argv.indexOf("--n") + 1]) || 10;

const raw = JSON.parse(fs.readFileSync(path.join(ROOT, "public/data/tools.json"), "utf8"));
const active = (Array.isArray(raw) ? raw : raw.tools).filter((t) => !t.github_archived);
const byId = new Map(active.map((t) => [t.id, t]));
const has = (dir, slug) => fs.existsSync(path.join(ROOT, "content", dir, `${slug}.md`));
const fmt = (t) =>
  `${t.id}（${t.name}｜${t.primary_competitor}の代替｜${t.license ?? "ライセンス未取得"}｜日本語画面:${t.ja_ui === true ? "確認済み" : "未確認"}｜Docker:${t.docker_available === true ? "確認済み" : "未確認"}｜最終更新${t.freshness_days ?? "?"}日前｜★${t.stars_num ?? "?"}）`;

const tools = active.filter((t) => !has("tools", t.id)).sort((a, b) => (b.stars_num ?? 0) - (a.stars_num ?? 0));
const pairs = buildComparePairs(active)
  .filter((p) => !has("compare", p.slug))
  .map((p) => ({ ...p, score: Math.min(byId.get(p.a)?.stars_num ?? 0, byId.get(p.b)?.stars_num ?? 0) }))
  .sort((x, y) => y.score - x.score);

console.log(`## ツール（解説なし：${tools.length}件）`);
for (const t of tools.slice(0, N)) console.log(`- ${fmt(t)}`);
console.log(`\n## 比較（解説なし：${pairs.length}組）`);
for (const p of pairs.slice(0, N)) {
  console.log(`- ${p.slug}（${p.competitor}の代替）`);
  console.log(`  - ${fmt(byId.get(p.a))}`);
  console.log(`  - ${fmt(byId.get(p.b))}`);
}
