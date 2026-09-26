#!/usr/bin/env node
/**
 * 手動追加リストの検証と統合
 *
 *   scripts/candidates/pending.txt  … 1行1件の追加候補
 *     形式: name|id|competitor|owner/repo|official_url|category|desc_ja
 *   ↓
 *   1. 形式チェック（7フィールド・id・リポジトリ形式・カテゴリ）
 *   2. 重複チェック（既存 tools.json の id と GitHub リポジトリ名の両方）
 *   3. 実在チェック（raw.githubusercontent.com への HEAD リクエスト）
 *   ↓ 合格分のみ
 *   data-source/tools.json へ追記
 *
 * GitHub Actions の「ツール追加」ワークフローから呼ばれる。
 * 編集方針「推測値を載せない」に従い、スター数・フォーク数などの
 * 数値系フィールドは null のまま登録する。後続ステップの
 * fetch-github-api.mjs --only <ids> が GitHub API で埋める。
 *
 * 出力:
 *   scripts/candidates/pending.result.json … 受理/却下の内訳
 *   scripts/candidates/pending.summary.md  … Actions のサマリ表示用
 *   $GITHUB_OUTPUT へ added_ids=id1,id2    … 後続ステップが使う
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CAND = path.join(ROOT, "scripts", "candidates");
const SRC_TOOLS = path.join(ROOT, "data-source", "tools.json");
const CATEGORIES_JSON = path.join(ROOT, "public", "data", "categories.json");
const PENDING = path.join(CAND, "pending.txt");

const CONCURRENCY = 3;
const TIMEOUT_MS = 8000;

/* 実在確認に使うファイル（verify-candidates.mjs と同じ判定方法） */
const EXISTENCE_FILES = [
  "README.md",
  "package.json",
  "README.rst",
  "README",
  "LICENSE",
  "go.mod",
  "setup.py",
];

async function head(url, attempt = 1) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: ctl.signal,
      headers: { "User-Agent": "ossalt-add-tools/1.0" },
    });
    if ((res.status === 403 || res.status === 429) && attempt <= 3) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      return head(url, attempt + 1);
    }
    return res.status;
  } catch {
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

async function repoExists(gh) {
  for (const file of EXISTENCE_FILES) {
    const status = await head(`https://raw.githubusercontent.com/${gh}/HEAD/${file}`);
    if (status === 200) return true;
  }
  return false;
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    })
  );
  return out;
}

/* ---------------- 有効カテゴリ（公開データが正本） ---------------- */
const categories = JSON.parse(fs.readFileSync(CATEGORIES_JSON, "utf8"));
const VALID_CATEGORIES = new Set(categories.map((c) => c.slug));

/* ---------------- 既存データ ---------------- */
const existing = JSON.parse(fs.readFileSync(SRC_TOOLS, "utf8"));
const byId = new Map(existing.map((t) => [t.id, t]));
const existingRepos = new Set(
  existing
    .map((t) => (t.github_url || "").replace(/^https?:\/\/github\.com\//i, "").replace(/\/$/, "").toLowerCase())
    .filter(Boolean)
);

/* ---------------- 入力の解析と検証 ---------------- */
const lines = fs
  .readFileSync(PENDING, "utf8")
  .split("\n")
  .map((s) => s.trim())
  .filter((s) => s && !s.startsWith("#"));

console.log(`入力: ${lines.length}件`);

const accepted = [];
const rejected = [];
const seenIds = new Set();

for (const raw of lines) {
  const parts = raw.split("|").map((s) => s.trim());
  const fail = (reason) => rejected.push({ raw, reason });

  if (parts.length < 7) {
    fail(`フィールド不足（${parts.length}/7）`);
    continue;
  }
  const [name, id, competitor, gh, url, category, descJa] = parts;

  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
    fail(`id が不正: ${id}（小文字英数字とハイフンのみ）`);
    continue;
  }
  if (!/^[\w.-]+\/[\w.-]+$/.test(gh)) {
    fail(`リポジトリ形式が不正: ${gh}`);
    continue;
  }
  if (!/^https:\/\//.test(url)) {
    fail(`公式URLが https:// ではない: ${url}`);
    continue;
  }
  if (!VALID_CATEGORIES.has(category)) {
    fail(`カテゴリが不正: ${category}（28種のいずれか）`);
    continue;
  }
  if (!descJa) {
    fail("日本語説明が空");
    continue;
  }
  if (byId.has(id) || seenIds.has(id)) {
    fail(`id が重複: ${id}`);
    continue;
  }
  if (existingRepos.has(gh.toLowerCase())) {
    fail(`リポジトリが掲載済み: ${gh}`);
    continue;
  }
  seenIds.add(id);
  accepted.push({ name, id, competitor, gh, url, category, descJa });
}

/* ---------------- 実在確認 ---------------- */
console.log(`実在確認中（${accepted.length}件・並列${CONCURRENCY}）…`);
const checked = await mapLimit(accepted, CONCURRENCY, async (c) => {
  const ok = await repoExists(c.gh);
  // 公式サイトの到達確認は記録だけ（却下理由にはしない。
  // Cloudflare 等で HEAD が弾かれるだけのサイトがあるため）
  const urlStatus = await head(c.url);
  return { ...c, exists: ok, urlVerified: urlStatus > 0 && urlStatus < 400 };
});

const toAdd = [];
for (const c of checked) {
  if (!c.exists) {
    rejected.push({
      raw: `${c.name}|${c.id}|${c.gh}`,
      reason: "raw.githubusercontent.com で実在を確認できない",
    });
    continue;
  }
  toAdd.push(c);
}

/* ---------------- tools.json へ統合 ---------------- */
for (const c of toAdd) {
  byId.set(c.id, {
    id: c.id,
    name: c.name,
    url: c.url,
    github_url: `https://github.com/${c.gh}`,
    description_ja: c.descJa,
    description_en: null,
    parent_category_ja: null,
    category: c.category,
    primary_competitor: c.competitor,
    primary_competitor_ja: null,
    stars_num: null,
    language: null,
    license: null,
    forks_num: null,
    last_commit: null,
    created_at: null,
    scorecard_score: null,
    docker_available: null,
    github_archived: false,
    topics: [],
    languages: [],
    _url_verified: c.urlVerified,
    _source: "manual-add",
  });
}

const out = [...byId.values()];
fs.writeFileSync(SRC_TOOLS, JSON.stringify(out, null, 1));
fs.writeFileSync(
  path.join(CAND, "pending.result.json"),
  JSON.stringify({ added: toAdd, rejected }, null, 1)
);

/* ---------------- サマリ ---------------- */
const addedIds = toAdd.map((c) => c.id);
const summary = [
  "## ツール追加の結果",
  "",
  `- 入力: ${lines.length}件`,
  `- **追加: ${toAdd.length}件**${addedIds.length ? `（${addedIds.join(", ")}）` : ""}`,
  `- 却下: ${rejected.length}件`,
  "",
];
if (toAdd.length) {
  summary.push("### 追加されたツール", "");
  for (const c of toAdd) {
    summary.push(
      `- **${c.name}**（\`${c.id}\`）… ${c.category} / 公式サイト確認: ${c.urlVerified ? "OK" : "未確認"}`
    );
  }
  summary.push("");
}
if (rejected.length) {
  summary.push("### 却下された候補", "");
  for (const r of rejected) summary.push(`- \`${r.raw.slice(0, 60)}\` … ${r.reason}`);
  summary.push("");
}
fs.writeFileSync(path.join(CAND, "pending.summary.md"), summary.join("\n"));

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `added_ids=${addedIds.join(",")}\n`);
}

console.log(`■ 追加: ${toAdd.length}件 / 却下: ${rejected.length}件`);
console.log(`■ tools.json 合計: ${out.length}件`);
if (!toAdd.length && !rejected.length) {
  console.log("入力が空でした。");
}
