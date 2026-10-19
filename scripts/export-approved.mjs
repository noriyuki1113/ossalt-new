#!/usr/bin/env node
/**
 * 承認済みの候補から、「ツール追加」ワークフローに貼る1行を作る（掲載そのものは行わない）。
 *   node scripts/export-approved.mjs            … 貼れる状態の行と、足りないものの一覧を表示
 *   node scripts/export-approved.mjs --out file … 1行版をファイルにも書く
 * 貼れる条件：decisions.json で state=approved、日本語説明・代替SaaS・カテゴリ・id が揃っている、
 *            公式リポジトリの確認（api）が済み、ライセンスが OSI、アーカイブされていない、掲載済みでない。
 */
import fs from "node:fs";
import path from "node:path";
import { formatAddToolsLine } from "./discovery/openalt.mjs";
import { decisionKey } from "./discovery/openalt-run.mjs";

const ROOT = process.cwd();
const readJson = (f, fb) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : fb);
const queue = readJson(path.join(ROOT, "data-source", "discovery", "openalt-queue.json"), { candidates: [] });
const decisions = readJson(path.join(ROOT, "data-source", "discovery", "decisions.json"), { decisions: {} }).decisions ?? {};

const ready = [];
const notReady = [];
for (const c of queue.candidates) {
  const d = decisions[decisionKey(c)] ?? decisions[`openalt:${c.slug}`];
  if (d?.state !== "approved") continue;
  const officialUrl = d.official_url ?? c.fields.homepage?.value ?? null;
  const problems = [...c.review.blocking.map((b) => `掲載を止める問題: ${b}`), ...c.review.draft_problems];
  if (c.review.state === "listed") problems.push("すでに掲載済み");
  if (!c.repo) problems.push("公式リポジトリが未確定");
  if (!officialUrl || !/^https:\/\//.test(officialUrl)) problems.push("公式URL（official_url または GitHub の homepage）が https:// で取れていない");
  if (problems.length) { notReady.push({ slug: c.slug, problems }); continue; }
  ready.push(formatAddToolsLine({
    name: d.name ?? c.fields.name.value, id: d.id, competitor: d.competitor, repo: c.repo,
    officialUrl, category: d.category, descriptionJa: d.description_ja,
  }));
}

console.log(`貼れる状態：${ready.length}件／足りない：${notReady.length}件`);
for (const n of notReady) console.log(`- ${n.slug}\n${n.problems.map((p) => `    · ${p}`).join("\n")}`);
if (ready.length) {
  const one = ready.join(" ; ");
  console.log("\n■ 「ツール追加」の入力欄に貼る1行版（Actions → ツール追加 → Run workflow）\n" + one);
  const out = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : null;
  if (out) fs.writeFileSync(out, ready.join("\n") + "\n");
}
process.exit(0);
