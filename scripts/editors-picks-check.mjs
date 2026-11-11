#!/usr/bin/env node
/**
 * EDITOR'S PICKS の公開前チェック（読み取り専用。何も書き換えない）。
 *
 *   node --experimental-strip-types scripts/editors-picks-check.mjs vol1            … 公開までに残っていることを一覧する（終了コードは常に0）
 *   node --experimental-strip-types scripts/editors-picks-check.mjs vol1 --publish  … 公開してよい状態でなければ、終了コード1
 *   node --experimental-strip-types scripts/editors-picks-check.mjs vol1 --today 2026-12-01
 *
 * 見るもの（docs/editors-picks/README.md の「公開前チェック」）:
 *  1. 調査データの検証（段階・出典・確認日・弱み・内部リンクの実在）と、運営者の承認（editorial_status が approved か）
 *  2. 記事の場所：承認前は content/drafts/ にあること。公開するときは content/blog/ にあり、draft_* の項目が消え、date が決まっていること
 *  3. 記事に「編集案」「承認待ち」の表記が残っていないこと（公開時）
 *  4. 記事の内部リンクが、実在するページを指していること
 *  5. 公開直前の再確認：掲載する全件の確認日が、公開日の24〜48時間以内であること（issue.reverify_within_hours。既定48）。
 *     最短の公開候補日（issue.earliest_publish）より前は公開不可。確認日が14日より前の項目は、一覧のときも注意に出す
 * SEOの確認（sitemap-check・seo:build-diff）は、別のコマンドで行う（README参照）。
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { publishBlockers, validateIssue, stageSummary, STAGE_LABELS } from "../src/lib/editors-picks.ts";

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const id = argv.find((a) => !a.startsWith("--")) ?? "vol1";
const publish = argv.includes("--publish");
const ti = argv.indexOf("--today");
const TODAY = ti >= 0 ? argv[ti + 1] : new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const STALE_DAYS = 14;

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const dataPath = path.join("data-source", "editors-picks", `${id}.json`);
if (!fs.existsSync(path.join(ROOT, dataPath))) {
  console.error(`調査データが見つかりません: ${dataPath}`);
  process.exit(2);
}
const file = readJson(dataPath);
const rawTools = readJson("data-source/tools.json");
const toolIds = new Set((Array.isArray(rawTools) ? rawTools : rawTools.tools).map((t) => t.id));

const blockers = []; // 公開前に必ず解消すること
const notes = []; // 公開前に確認したいこと（公開を止めはしない）

// 1. 調査データと承認
const dataProblems = validateIssue(file, toolIds);
blockers.push(...publishBlockers(file, TODAY).filter((m) => !dataProblems.includes(m)));
blockers.push(...dataProblems.map((m) => `調査データ：${m}`));

// 2. 記事の場所
const slug = `editors-picks-${id}`;
const draftPath = path.join("content", "drafts", `${slug}.md`);
const blogPath = path.join("content", "blog", `${slug}.md`);
const inDraft = fs.existsSync(path.join(ROOT, draftPath));
const inBlog = fs.existsSync(path.join(ROOT, blogPath));
const articlePath = inBlog ? blogPath : inDraft ? draftPath : null;
let raw = "";
let fm = {};
if (!articlePath) {
  blockers.push(`記事が見つからない（${draftPath}）`);
} else {
  raw = fs.readFileSync(path.join(ROOT, articlePath), "utf8");
  fm = matter(raw).data;
  if (inDraft && inBlog) blockers.push("記事が content/drafts/ と content/blog/ の両方にある（重複して公開される）");
  if (inDraft && !inBlog) blockers.push("記事がまだ content/drafts/ にある（承認後に content/blog/ へ移す）");
  if (inBlog) {
    const draftKeys = Object.keys(fm).filter((k) => k.startsWith("draft_"));
    if (draftKeys.length) blockers.push(`公開する記事に、下書き用の項目が残っている：${draftKeys.join("、")}`);
    if (!fm.date) blockers.push("date（公開日）が決まっていない");
    else if (fm.date < TODAY) notes.push(`date（${fm.date}）が、今日（${TODAY}）より前。すぐに公開される`);
    else notes.push(`date（${fm.date}）に予約公開される`);
  }
}

// 3. 編集案の表記
if (raw) {
  const body = matter(raw).content;
  const marks = [...body.matchAll(/編集案|承認待ち/g)].length;
  if (marks > 0) blockers.push(`記事に「編集案」「承認待ち」の表記が${marks}か所残っている（運営者の言葉に直し、承認後に消す）`);
}

// 4. 内部リンク
if (raw) {
  const body = matter(raw).content;
  for (const m of body.matchAll(/\]\((\/[^)\s]+)\)/g)) {
    const href = m[1];
    const t = href.match(/^\/tools\/([a-z0-9-]+)\/$/);
    const a = href.match(/^\/alternatives\/([a-z0-9-]+)\/$/);
    const b = href.match(/^\/blog\/([a-z0-9-]+)\/$/);
    if (t && !toolIds.has(t[1])) blockers.push(`存在しないツールへのリンク：${href}`);
    else if (a && !fs.existsSync(path.join(ROOT, "content", "alternatives", `${a[1]}.md`))) blockers.push(`存在しない代替ページへのリンク：${href}`);
    else if (b && !fs.existsSync(path.join(ROOT, "content", "blog", `${b[1]}.md`)) && b[1] !== slug) blockers.push(`存在しないブログ記事へのリンク：${href}`);
  }
}

// 5. 確認日の古さ
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400e3);
const stale = [];
for (const p of file.picks) {
  if (!p.included) continue;
  const age = daysBetween(p.verification.checked_at, TODAY);
  if (age > STALE_DAYS) stale.push(`${p.name}（確認日 ${p.verification.checked_at}、${age}日前）`);
}
if (stale.length) notes.push(`確認日が${STALE_DAYS}日より前。公開の直前に、公式の情報で再確認する：${stale.join("、")}`);
const unknowns = file.picks.flatMap((p) => p.facts.filter((f) => /未確認/.test(f.value)).map((f) => `${p.name}の${f.label}`));
if (unknowns.length) notes.push(`「未確認」のまま：${unknowns.join("、")}（記事には書かない。確認できたら記事とデータを更新する）`);
const review = file.picks.filter((p) => p.verification.sources.length > 0 && /読めていない|読めなかった|未確認/.test(p.verification.note)).map((p) => p.name);
if (review.length) notes.push(`確認の記録に「読めていない／未確認」がある：${review.join("、")}`);

const s = stageSummary(file.picks);
console.log(`EDITOR'S PICKS ${id}（${file.issue.title_ja}）／今日 ${TODAY}`);
console.log(`掲載 ${s.included}件｜${STAGE_LABELS.official} ${s.official}件・${STAGE_LABELS.code} ${s.code}件・${STAGE_LABELS["hands-on"]} ${s["hands-on"]}件`);
console.log(`運営者の承認：${file.issue.editorial_status === "approved" ? "済み" : "まだ（pending_approval）"}／記事の場所：${articlePath ?? "なし"}`);
console.log("");
console.log(blockers.length ? `公開前に解消すること（${blockers.length}件）` : "公開前に解消すること：なし");
for (const b of blockers) console.log(`  ✗ ${b}`);
console.log(notes.length ? `確認したいこと（${notes.length}件）` : "確認したいこと：なし");
for (const n of notes) console.log(`  ・ ${n}`);
console.log("");
console.log("SEOの確認（公開前に別途）：node scripts/sitemap-check.mjs --dir out --site https://ossalt.jp ／ npm run seo:build-diff -- --after out");

if (publish && blockers.length) {
  console.error(`\n公開してよい状態ではありません（${blockers.length}件）`);
  process.exit(1);
}
