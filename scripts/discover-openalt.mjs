#!/usr/bin/env node
/**
 * OpenAlternative 候補の確認キューを更新する（手動実行／月1回の定期実行）。
 *   node scripts/discover-openalt.mjs [--no-github] [--max-new 40] [--max-requests 300]
 * 設計：docs/discovery/OPENALT_QUEUE.md
 *
 * 書くもの（すべて非掲載。サイトには出ない）：
 *   data-source/discovery/openalt-queue.json … 確認キュー（claimed / api の区別つき）
 *   data-source/discovery/openalt-state.json … 実行の記録
 *   docs/discovery/openalt-queue.md         … 人が見る一覧
 * 触らないもの：data-source/tools.json（掲載は人が「ツール追加」で行う）
 */
import fs from "node:fs";
import path from "node:path";
import { createGitHubClient } from "./discovery/github.mjs";
import { stableStringify } from "./discovery/lib.mjs";
import { OPENALT_README_URL } from "./discovery/openalt.mjs";
import { runOpenAltDiscovery } from "./discovery/openalt-run.mjs";
import { loadOverrides } from "./overrides.mjs";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "data-source", "discovery");
const QUEUE = path.join(DIR, "openalt-queue.json");
const STATE = path.join(DIR, "openalt-state.json");
const DECISIONS = path.join(DIR, "decisions.json");
const ETAG = path.join(DIR, ".etag-cache-openalt.json");
const MD = path.join(ROOT, "docs", "discovery", "openalt-queue.md");
const argv = process.argv.slice(2);
const arg = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const TOKEN = process.env.GITHUB_TOKEN || "";
const NO_GITHUB = argv.includes("--no-github");
const MAX_NEW = Number(arg("--max-new", process.env.OPENALT_MAX_NEW || 40));
const MAX_REQUESTS = Number(arg("--max-requests", process.env.OPENALT_MAX_REQUESTS || 300));

const readJson = (f, fb) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : fb);

async function getText(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 12000);
    try {
      const res = await fetch(url, { signal: ctl.signal, headers: { "User-Agent": "ossalt-openalt-queue (https://ossalt.jp)" } });
      if (res.ok) return { ok: true, text: await res.text() };
      if (res.status < 500 && res.status !== 429) return { ok: false, status: res.status };
    } catch {
      /* 再試行 */
    } finally {
      clearTimeout(timer);
    }
    await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
  }
  return { ok: false, status: 0 };
}

const now = new Date().toISOString();
const readme = await getText(OPENALT_README_URL);
if (!readme.ok) {
  console.error(`README を取得できませんでした（${readme.status}）。前回の結果をそのまま残します。`);
  process.exit(1);
}
const toolsRaw = readJson(path.join(ROOT, "data-source", "tools.json"), []);
const tools = Array.isArray(toolsRaw) ? toolsRaw : toolsRaw.tools;
const categories = new Set(readJson(path.join(ROOT, "public", "data", "categories.json"), []).map((c) => c.slug));
const prevState = readJson(STATE, {});
const prevQueue = readJson(QUEUE, { candidates: [], skipped: {} });
const useGithub = !NO_GITHUB && Boolean(TOKEN);
const client = createGitHubClient({ token: TOKEN, etagCache: readJson(ETAG, {}), maxRequests: MAX_REQUESTS });

const { queue, summary, errors, budgetNote } = await runOpenAltDiscovery({
  now, readme: readme.text, getPage: getText, client, useGithub, tools, categories,
  excludedIds: loadOverrides().exclude, decisions: readJson(DECISIONS, { decisions: {} }).decisions ?? {},
  prevQueue, maxNew: MAX_NEW,
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
});

fs.mkdirSync(DIR, { recursive: true });
fs.mkdirSync(path.dirname(MD), { recursive: true });
const text = stableStringify(queue);
const changed = !fs.existsSync(QUEUE) || fs.readFileSync(QUEUE, "utf8") !== text;
if (changed) fs.writeFileSync(QUEUE, text);
if (useGithub) fs.writeFileSync(ETAG, JSON.stringify(client.etagCache));
const state = {
  last_run_at: now,
  last_changed_at: changed ? now : prevState.last_changed_at ?? now,
  summary,
  github: { used: useGithub, ...client.stats, budget_stopped: budgetNote, max_requests: MAX_REQUESTS },
  errors,
};
fs.writeFileSync(STATE, stableStringify(state));
if (changed) fs.writeFileSync(MD, renderMarkdown(queue, summary));
console.log(JSON.stringify({ changed, summary, github: state.github.requests ?? 0, errors: errors.length }, null, 2));

function renderMarkdown(q, s) {
  const ja = { needs_review: "確認待ち", blocked: "止める問題あり", approved: "承認済み", rejected: "却下", hold: "保留", listed: "掲載済み" };
  const issueJa = {
    license_unknown: "ライセンス不明", license_not_osi: "OSI 以外のライセンス", archived: "アーカイブ済み", no_description: "説明なし",
    repo_ambiguous: "公式リポジトリを特定できない", repo_unverified: "公式リポジトリを確認できていない", repo_chosen_by_majority: "リポジトリは多数決で選んだ（要確認）",
    license_mismatch_with_list: "一覧のライセンス表記と食い違う", stale_over_1y: "1年以上更新なし", stars_differ_from_list: "一覧のスター数と大きく違う",
  };
  let md = `# OpenAlternative 候補の確認キュー（自動収集・非掲載）\n\n`;
  md += `このファイルは \`scripts/discover-openalt.mjs\` が作ります。**ここに載っていても、サイトには公開されません。**\n`;
  md += `一覧（OpenAlternative）の記載は第三者の情報です。**ライセンス・更新状況は公式リポジトリ（GitHub API）で確かめた値だけを信頼し**、日本語の説明と代替SaaSは人が書きます。手順：docs/discovery/OPENALT_QUEUE.md\n\n`;
  md += `- 一覧 ${s.readme_entries}件 → キュー ${s.queue}件（確認待ち ${s.needs_review}・止める問題あり ${s.blocked}・承認済み ${s.approved}（うち貼れる状態 ${s.ready}）・保留 ${s.hold}・却下 ${s.rejected}）\n`;
  md += `- 掲載済み・除外などで外したもの ${s.skipped}件 ${JSON.stringify(s.skipped_by_reason)}／未処理 ${s.unprocessed}件（次回の続きで処理）\n\n`;
  md += `| 候補 | 公式リポジトリ | ライセンス（GitHub） | Star（GitHub） | 最終push | 状態 | 注意 |\n|---|---|---|---|---|---|---|\n`;
  for (const c of q.candidates.filter((x) => x.review.state !== "listed")) {
    const f = c.fields;
    const repo = c.repo ? `[${c.repo}](https://github.com/${c.repo})` : "（未確定）";
    md += `| ${f.name.value}（\`${c.slug}\`） | ${repo} | ${f.license.value ?? "未確認"} | ${f.stars.value ?? "未確認"} | ${(f.pushed_at.value ?? "").slice(0, 10) || "未確認"} | ${ja[c.review.state] ?? c.review.state} | ${c.quality.issues.map((i) => issueJa[i] ?? i).join("・") || "—"} |\n`;
  }
  return md;
}
