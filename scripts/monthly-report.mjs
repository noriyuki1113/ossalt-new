#!/usr/bin/env node
/**
 * 月次レポートの自動生成
 *
 *   data-source/snapshots/<日付>.json（前回のスナップショット）
 *   data-source/tools.json（現在のデータ）
 *   ↓ 比較
 *   content/blog/monthly-YYYY-MM.md … 変化をまとめた記事
 *   data-source/snapshots/<今日>.json … 次回の比較用
 *
 * 記事の数字はすべてデータから機械的に出す（推測や文章生成は入れない）。
 * 前回のスナップショットから --min-days 日（既定20日）経っていない場合は、
 * 集計期間が短すぎるため何もしない。スナップショットが1つも無い場合は、
 * 最初のスナップショットだけを保存する。
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC_TOOLS = path.join(ROOT, "data-source", "tools.json");
const SNAP_DIR = path.join(ROOT, "data-source", "snapshots");
const BLOG_DIR = path.join(ROOT, "content", "blog");
const CATEGORIES_JSON = path.join(ROOT, "public", "data", "categories.json");
// カテゴリは build-data.mjs が割り当てるため、ビルド後のデータから読む
const BUILT_TOOLS = path.join(ROOT, "public", "data", "tools.json");

const argv = process.argv.slice(2);
const flag = (name, def) => {
  const i = argv.indexOf(name);
  return i === -1 ? def : argv[i + 1];
};
const MIN_DAYS = Number(flag("--min-days", "20"));
const TODAY = flag("--today", new Date().toISOString().slice(0, 10));

const STAR_SURGE_LIMIT = 10;
const STALE_DAYS = 365;

/* ---------------- 読み込み ---------------- */
const tools = JSON.parse(fs.readFileSync(SRC_TOOLS, "utf8"));
const builtCategory = new Map(
  JSON.parse(fs.readFileSync(BUILT_TOOLS, "utf8")).map((t) => [t.id, t.category])
);
const catName = new Map(
  JSON.parse(fs.readFileSync(CATEGORIES_JSON, "utf8")).map((c) => [c.slug, c.nameJa])
);

function snapshotOf(list) {
  const out = {};
  for (const t of list) {
    out[t.id] = {
      name: t.name,
      license: t.license ?? null,
      stars: t.stars_num ?? null,
      archived: Boolean(t.github_archived),
      last_commit: t.last_commit ?? null,
      category: builtCategory.get(t.id) ?? t.category ?? null,
      competitor: t.primary_competitor_ja || t.primary_competitor || null,
    };
  }
  return out;
}

function writeSnapshot() {
  fs.mkdirSync(SNAP_DIR, { recursive: true });
  const file = path.join(SNAP_DIR, `${TODAY}.json`);
  fs.writeFileSync(file, JSON.stringify({ date: TODAY, tools: snapshotOf(tools) }, null, 1) + "\n");
  console.log(`スナップショットを保存: ${path.relative(ROOT, file)}`);
}

const snaps = fs.existsSync(SNAP_DIR)
  ? fs.readdirSync(SNAP_DIR).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort()
  : [];

if (!snaps.length) {
  console.log("スナップショットが無いため、最初のスナップショットだけを保存します。");
  writeSnapshot();
  process.exit(0);
}

const prevFile = snaps[snaps.length - 1];
const prev = JSON.parse(fs.readFileSync(path.join(SNAP_DIR, prevFile), "utf8"));
const days = Math.round((Date.parse(TODAY) - Date.parse(prev.date)) / 86400000);

if (days < MIN_DAYS) {
  console.log(`前回のスナップショット（${prev.date}）から${days}日のため、記事は作りません（${MIN_DAYS}日以上が条件）。`);
  process.exit(0);
}

/* ---------------- 対象の月 ---------------- */
// 実行日の前日が属する月をレポートの月とする（1日に実行すると前月分になる）
const ref = new Date(Date.parse(TODAY) - 86400000);
const year = ref.getUTCFullYear();
const month = ref.getUTCMonth() + 1;
const slug = `monthly-${year}-${String(month).padStart(2, "0")}`;
const outFile = path.join(BLOG_DIR, `${slug}.md`);

if (fs.existsSync(outFile)) {
  console.log(`${slug}.md は作成済みのため、何もしません。`);
  process.exit(0);
}

/* ---------------- 比較 ---------------- */
const cur = snapshotOf(tools);
const prevTools = prev.tools;

const added = Object.keys(cur).filter((id) => !prevTools[id]);
const removed = Object.keys(prevTools).filter((id) => !cur[id]);
const nowArchived = Object.keys(cur).filter((id) => prevTools[id] && !prevTools[id].archived && cur[id].archived);
const licenseChanged = Object.keys(cur).filter(
  (id) => prevTools[id] && prevTools[id].license && cur[id].license && prevTools[id].license !== cur[id].license
);
const surge = Object.keys(cur)
  .filter((id) => prevTools[id] && prevTools[id].stars != null && cur[id].stars != null && !cur[id].archived)
  .map((id) => ({ id, gain: cur[id].stars - prevTools[id].stars }))
  .filter((x) => x.gain > 0)
  .sort((a, b) => b.gain - a.gain)
  .slice(0, STAR_SURGE_LIMIT);

const ageOn = (iso, day) => (iso ? Math.floor((Date.parse(day) - Date.parse(iso)) / 86400000) : null);
const newlyStale = Object.keys(cur).filter((id) => {
  if (!prevTools[id] || cur[id].archived) return false;
  const before = ageOn(prevTools[id].last_commit, prev.date);
  const after = ageOn(cur[id].last_commit, TODAY);
  return before != null && after != null && before < STALE_DAYS && after >= STALE_DAYS;
});

/* ---------------- 記事の組み立て ---------------- */
const fmt = (n) => Number(n).toLocaleString("ja-JP");
const link = (id) => `[${cur[id]?.name ?? prevTools[id]?.name ?? id}](/tools/${id}/)`;
const cat = (id) => catName.get(cur[id]?.category);
const countOf = (snap) => Object.values(snap).filter((t) => !t.archived).length;

const title = `${year}年${month}月の掲載ツールの変化（月次レポート）`;
const summaryParts = [];
if (added.length) summaryParts.push(`新規掲載${added.length}件`);
if (licenseChanged.length) summaryParts.push(`ライセンス変更${licenseChanged.length}件`);
if (nowArchived.length) summaryParts.push(`開発終了${nowArchived.length}件`);
const description = `${prev.date}〜${TODAY}の掲載ツールの変化を、データから自動で集計しました。${
  summaryParts.length ? summaryParts.join("・") + "。" : ""
}スター数が大きく伸びたツールも紹介します。`;

const L = [];
L.push(
  `この記事は、当サイトの掲載データを前回の集計（${prev.date}）と今回（${TODAY}）で比べ、自動で作成したレポートです。数字はすべてデータから機械的に集計しています。`,
  "",
  "## 概要",
  "",
  "| 項目 | 件数 |",
  "|---|---|",
  `| 掲載中のツール（開発中） | ${fmt(countOf(prevTools))}件 → ${fmt(countOf(cur))}件 |`,
  `| 新しく掲載したツール | ${added.length}件 |`,
  `| ライセンスが変わったツール | ${licenseChanged.length}件 |`,
  `| 開発が終了（アーカイブ）したツール | ${nowArchived.length}件 |`,
  `| 新たに1年以上更新が止まったツール | ${newlyStale.length}件 |`,
  ""
);

L.push("## ライセンスが変わったツール", "");
if (licenseChanged.length) {
  for (const id of licenseChanged) L.push(`- ${link(id)}：${prevTools[id].license} → ${cur[id].license}`);
  L.push(
    "",
    "ライセンスの変更は、使い方によっては影響が出ることがあります。自社のサービスに組み込んでいる場合などは、変更後の条件を確認してください。ライセンスの種類ごとの違いは「[ライセンスの分類](/blog/oss-license-guide/)」の記事にまとめています。"
  );
} else {
  L.push("この期間に、ライセンスが変わったツールはありませんでした。");
}
L.push("");

if (added.length) {
  L.push("## 新しく掲載したツール", "");
  for (const id of added) {
    const c = cur[id].competitor ? `（${cur[id].competitor}の代替）` : "";
    L.push(`- ${link(id)}${c}${cat(id) ? `：${cat(id)}` : ""}`);
  }
  L.push("");
}

if (nowArchived.length) {
  L.push("## 開発が終了（アーカイブ）したツール", "");
  for (const id of nowArchived) L.push(`- ${link(id)}`);
  L.push(
    "",
    "アーカイブされたリポジトリは、今後の修正が期待できません。使っている場合は、代わりの候補を検討してください。当サイトでは、一覧や比較の候補から外しています。"
  );
  L.push("");
}

if (surge.length) {
  L.push("## スター数が大きく伸びたツール", "");
  L.push("| ツール | 増えたスター | 現在のスター |", "|---|---|---|");
  for (const s of surge) L.push(`| ${link(s.id)} | +${fmt(s.gain)} | ${fmt(cur[s.id].stars)} |`);
  L.push("", "スターは注目度の目安で、品質の保証ではありません。数字の読み方は「[GitHubの見方](/blog/how-to-read-github/)」を参照してください。", "");
}

if (newlyStale.length) {
  L.push("## 新たに1年以上更新が止まったツール", "");
  for (const id of newlyStale) L.push(`- ${link(id)}（最終コミット：${cur[id].last_commit.slice(0, 10)}）`);
  L.push("", "完成して安定しているため更新が少ない場合もありますが、導入を検討するときは、代わりの候補もあわせて確認しましょう。", "");
}

if (removed.length) {
  L.push("## 掲載を終了したツール", "");
  for (const id of removed) L.push(`- ${prevTools[id].name}`);
  L.push("");
}

L.push("---", "", `集計期間：${prev.date}〜${TODAY}。この記事は毎月自動で作成しています。最新の値は各ツールのページで確認してください。`);

const related = [...licenseChanged, ...added, ...nowArchived].slice(0, 12);
const front = [
  "---",
  `title: ${JSON.stringify(title)}`,
  `description: ${JSON.stringify(description)}`,
  `date: "${TODAY}"`,
  `updated: "${TODAY}"`,
  `category: "report"`,
  `relatedTools: ${JSON.stringify(related)}`,
  "---",
  "",
];

fs.mkdirSync(BLOG_DIR, { recursive: true });
fs.writeFileSync(outFile, front.join("\n") + L.join("\n") + "\n");
console.log(`記事を作成: ${path.relative(ROOT, outFile)}`);
console.log(`新規${added.length} / ライセンス変更${licenseChanged.length} / アーカイブ${nowArchived.length} / 停止${newlyStale.length} / 終了${removed.length}`);

writeSnapshot();
