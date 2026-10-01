#!/usr/bin/env node
/**
 * X・Bluesky 投稿の下書きを、掲載データから作る
 *
 *   data-source/tools.json（現在のデータ）
 *   data-source/snapshots/<最新>.json（前回の月次スナップショット）
 *   content/blog/*.md（公開済みの記事）
 *   ↓
 *   docs/sns/drafts/<今日>.md … その週の投稿の下書き（運営者が選んで手で投稿する）
 *
 * 自動投稿はしない。文章はデータから機械的に作り、推測や誇張は入れない。
 * 数字はすべて掲載データの値。日本語対応は「確認できたもの」だけを書く。
 * 投稿の考え方は docs/sns-plan.md を参照。
 *
 * 使い方:
 *   node scripts/sns-drafts.mjs                 … 今日の日付で作る
 *   node scripts/sns-drafts.mjs --today 2026-10-05
 *   node scripts/sns-drafts.mjs --stdout        … ファイルに書かず表示だけ
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC_TOOLS = path.join(ROOT, "data-source", "tools.json");
const SNAP_DIR = path.join(ROOT, "data-source", "snapshots");
const BLOG_DIR = path.join(ROOT, "content", "blog");
const OUT_DIR = path.join(ROOT, "docs", "sns", "drafts");
const SITE = "https://ossalt.jp";

const argv = process.argv.slice(2);
const flag = (name, def) => {
  const i = argv.indexOf(name);
  return i === -1 ? def : argv[i + 1];
};
const TODAY = flag("--today", new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10));
const STDOUT = argv.includes("--stdout");

/* ---------------- 読み込み ---------------- */
const raw = JSON.parse(fs.readFileSync(SRC_TOOLS, "utf8"));
const all = Array.isArray(raw) ? raw : raw.tools;
const tools = all.filter((t) => !t.github_archived && t.stars_num != null);

const snapFiles = fs.existsSync(SNAP_DIR)
  ? fs.readdirSync(SNAP_DIR).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort()
  : [];
// データを取得した日（スターの伸びの期間はこの日までで数える）
const META_JSON = path.join(ROOT, "public", "data", "meta.json");
const DATA_DATE = fs.existsSync(META_JSON)
  ? JSON.parse(fs.readFileSync(META_JSON, "utf8")).built_at.slice(0, 10)
  : TODAY;

const snap = snapFiles.length
  ? JSON.parse(fs.readFileSync(path.join(SNAP_DIR, snapFiles[snapFiles.length - 1]), "utf8"))
  : null;

/* ---------------- 表記の小道具 ---------------- */
const competitorOf = (t) => t.primary_competitor_ja || t.primary_competitor;
const hasJa = (t) => t.ja_ui === true || t.ja_docs === "official" || t.ja_docs === "community";
const jaText = (t) =>
  t.ja_ui === true ? "画面の日本語翻訳あり" : t.ja_docs ? "日本語のドキュメントあり" : null;
const stars = (n) => (n >= 10000 ? `${(n / 10000).toFixed(1).replace(/\.0$/, "")}万` : n.toLocaleString("ja-JP"));
const slugify = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400e3);

/**
 * X の文字数（重み付き）。日本語などは1文字2、半角英数は1、URLは一律23。
 * 上限は280（日本語だけなら140文字相当）。
 */
function xLength(text) {
  let n = 0;
  const withoutUrls = text.replace(/https?:\/\/\S+/g, () => {
    n += 23;
    return "";
  });
  for (const ch of withoutUrls) n += ch.codePointAt(0) <= 0x10ff ? 1 : 2;
  return n;
}
/** Bluesky の文字数（書記素の数）。上限は300。 */
function bskyLength(text) {
  return [...new Intl.Segmenter("ja", { granularity: "grapheme" }).segment(text)].length;
}

/* ---------------- 週替わりの選び方 ---------------- */
// 同じ週なら何度実行しても同じものを選ぶ（ISO週番号で回す）
function weekNumber(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round((d - firstThu) / (7 * 86400e3));
}
const WEEK = weekNumber(TODAY);
const pickWeekly = (arr, offset = 0) => (arr.length ? arr[(WEEK + offset) % arr.length] : null);

/* ---------------- 投稿を組み立てる ---------------- */
const posts = [];
const add = (kind, note, text) => posts.push({ kind, note, text });
/** 説明文が長すぎて X の上限を超えるときは、最初の1文だけにする */
const firstSentence = (s) => (s ? (s.match(/^[^。]*。/)?.[0] ?? s) : "");
function fit(build, desc) {
  const full = build(desc ?? "");
  return xLength(full) <= 280 ? full : build(firstSentence(desc));
}

// 1) 新しく掲載したツール（前回スナップショットに無いもの）
if (snap) {
  const added = tools
    .filter((t) => !(t.id in snap.tools))
    .sort((a, b) => b.stars_num - a.stars_num)
    .slice(0, 3);
  for (const t of added) {
    const facts = [t.license && `ライセンス：${t.license}`, `スター：${stars(t.stars_num)}`, jaText(t)]
      .filter(Boolean)
      .join("／");
    add(
      "新しく掲載",
      `${snap.date} 以降に追加`,
      fit(
        (d) => `新しく掲載しました：${t.name}\n\n${competitorOf(t)}の代わりになるオープンソース。${d}\n\n${facts}\n\n${SITE}/tools/${t.id}/`,
        t.description_ja,
      ),
    );
  }
}

// 2) 今週の「〇〇の代わり」（代替が3件以上あるSaaSを週替わりで）
const groups = new Map();
for (const t of tools) {
  const key = slugify(t.primary_competitor);
  if (!key) continue;
  if (!groups.has(key)) groups.set(key, { slug: key, name: competitorOf(t), tools: [] });
  groups.get(key).tools.push(t);
}
const bigGroups = [...groups.values()]
  .filter((g) => g.tools.length >= 3)
  .sort((a, b) => a.slug.localeCompare(b.slug));
const g = pickWeekly(bigGroups);
if (g) {
  const top = g.tools.sort((a, b) => b.stars_num - a.stars_num).slice(0, 3);
  const ja = g.tools.filter(hasJa).length;
  const lines = top.map((t) => `・${t.name}（スター${stars(t.stars_num)}${hasJa(t) ? "、日本語あり" : ""}）`);
  add(
    "〇〇の代わり",
    `代替${g.tools.length}件のSaaSから週替わり`,
    `${g.name}の代わりになるオープンソース、${g.tools.length}件を比べています。\n\n${lines.join("\n")}\n\n${ja > 0 ? `日本語に対応しているのは${ja}件。` : ""}ライセンスや更新状況も一覧で見られます。\n\n${SITE}/alternatives/${g.slug}/`,
  );
}

// 3) スターが伸びたツール（前回スナップショットとの比較）
if (snap) {
  const days = daysBetween(snap.date, DATA_DATE);
  const gains = tools
    .filter((t) => snap.tools[t.id]?.stars != null)
    .map((t) => ({ t, gain: t.stars_num - snap.tools[t.id].stars }))
    .filter((x) => x.gain > 0)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 3);
  if (gains.length && days > 0) {
    const lines = gains.map(({ t, gain }) => `・${t.name}（${competitorOf(t)}の代わり）+${gain.toLocaleString("ja-JP")}`);
    add(
      "スターの伸び",
      `${snap.date}〜${DATA_DATE}（${days}日間）`,
      `この${days}日間でGitHubのスターが多く増えたオープンソース\n\n${lines.join("\n")}\n\n各ツールのライセンスや更新状況はこちら\n${SITE}/tools/`,
    );
  }
}

// 4) 直近7日に新しいバージョンを出したツール（スターの多い順に1件）
const released = tools
  .filter((t) => {
    if (!t.latest_release_at) return false;
    const d = daysBetween(t.latest_release_at.slice(0, 10), DATA_DATE);
    return d >= 0 && d <= 7;
  })
  .sort((a, b) => b.stars_num - a.stars_num);
// スターの多い上位10件から週替わり（毎週同じツールにならないように）
const rel = pickWeekly(released.slice(0, 10), 3);
if (rel) {
  add(
    "新しいリリース",
    `${rel.latest_release_at.slice(0, 10)} にリリース（直近7日の候補 ${released.length}件から）`,
    `${rel.name}の新しいバージョンが公開されています（${rel.latest_release_at.slice(0, 10)}）。\n\n${competitorOf(rel)}の代わりになるオープンソースで、過去12か月のリリースは${rel.releases_12mo ?? "—"}回。更新が続いているかは、選ぶときの大事な目安です。\n\n${SITE}/tools/${rel.id}/`,
  );
}

// 5) 日本語対応のピックアップ（日本語の画面があり、90日以内に更新されたものから週替わり）
const jaPool = tools
  .filter((t) => t.ja_ui === true && t.last_commit && daysBetween(t.last_commit.slice(0, 10), DATA_DATE) <= 90)
  .sort((a, b) => a.id.localeCompare(b.id));
const jp = pickWeekly(jaPool, 7);
if (jp) {
  add(
    "日本語で使えるOSS",
    `日本語の画面があるツール ${jaPool.length}件から週替わり`,
    fit(
      (d) => `日本語の画面で使えるオープンソース：${jp.name}\n\n${competitorOf(jp)}の代わりに。${d}\n\n日本語に対応したツールの一覧はこちら\n${SITE}/japanese/`,
      jp.description_ja,
    ),
  );
}

// 6) 直近7日に公開したブログ記事
if (fs.existsSync(BLOG_DIR)) {
  for (const f of fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md"))) {
    const src = fs.readFileSync(path.join(BLOG_DIR, f), "utf8");
    const title = src.match(/^title:\s*"(.+)"/m)?.[1];
    const date = src.match(/^date:\s*"(\d{4}-\d{2}-\d{2})"/m)?.[1];
    if (!title || !date) continue;
    const ago = daysBetween(date, TODAY);
    if (ago < 0 || ago > 7) continue;
    add("ブログ", `${date} 公開`, `ブログを書きました。\n\n${title}\n\n${SITE}/blog/${f.replace(/\.md$/, "")}/`);
  }
}

/* ---------------- 書き出し ---------------- */
const out = [
  `# SNS投稿の下書き（${TODAY}）`,
  "",
  "掲載データから自動で作った下書きです。そのまま、または手直しして投稿してください。",
  "数字は作成時点のデータです。投稿の考え方は [docs/sns-plan.md](../../sns-plan.md) を参照。",
  "",
];
for (const [i, p] of posts.entries()) {
  const xl = xLength(p.text);
  const bl = bskyLength(p.text);
  out.push(`## ${i + 1}. ${p.kind}`, "");
  out.push(`- ${p.note}`);
  out.push(
    `- 文字数：X ${xl}/280${xl > 280 ? " ⚠️ 長すぎます。説明を削ってください" : ""}、Bluesky ${bl}/300${bl > 300 ? " ⚠️ 長すぎます" : ""}`,
  );
  out.push("", "```", p.text, "```", "");
}
if (posts.length === 0) out.push("今週は、データから作れる下書きがありませんでした。");

const md = out.join("\n");
if (STDOUT) {
  console.log(md);
} else {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${TODAY}.md`);
  fs.writeFileSync(file, md + "\n");
  console.log(`下書き ${posts.length}件 → ${path.relative(ROOT, file)}`);
}
