#!/usr/bin/env node
/**
 * ja_docs（日本語ドキュメントの有無）の確認。
 *
 * 収録全ツールを一度に調べるのは現実的でないため、health_score が高い
 * （＝利用者が多いと推測される）順に、ja_docs が null のものから
 * バッチで確認していく。
 *
 * 判定方法（推測はしない。実際にリポジトリのファイルを取得して確認する）:
 *   - README.ja.md 等、日本語READMEファイルそのものが存在する → "official"
 *   - メインのREADME内に、日本語版へ明示的にリンクする言語切り替え表記
 *     （例: "[日本語](...)"）がある → "official"
 *   - どちらも無く、英語READMEの取得には成功した → "none"
 *   - READMEの取得自体に失敗した（ファイル名が特殊、ネットワークエラー等） → null のまま
 *
 * "community"（有志訳）は、Qiita・Zenn・個人ブログ等の外部サイトを
 * 確認する必要があるが、このスクリプトが動く環境からは GitHub 以外の
 * 任意ドメインへの通信ができないため判定できない。
 * 確認できない状態で "community" と断定することはしない
 * （見つからなければ "none" または null に倒す）。
 *
 * 使い方:
 *   node scripts/check-ja-docs.mjs --limit 50       … 上位50件（未調査分）を確認
 *   node scripts/check-ja-docs.mjs --ids n8n,ollama  … IDを指定して確認
 *   node scripts/check-ja-docs.mjs --dry-run         … 書き込まず結果だけ表示
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TOOLS_PATH = path.join(ROOT, "data-source", "tools.json");
const CONCURRENCY = 5;

const argv = process.argv.slice(2);
const LIMIT = Number(argv[argv.indexOf("--limit") + 1]) || 0;
const IDS = argv.includes("--ids")
  ? argv[argv.indexOf("--ids") + 1].split(",").map((s) => s.trim())
  : null;
const DRY_RUN = argv.includes("--dry-run");

const JA_README_NAMES = [
  "README.ja.md",
  "README_ja.md",
  "README-ja.md",
  "readme_ja.md",
  "docs/README.ja.md",
  "docs/ja/README.md",
];

// メインREADME内の言語切り替えリンクに日本語版が明記されているかの検出パターン
const JA_LINK_PATTERN =
  /(\[日本語\]\([^)]+\)|\(日本語\)|｜\s*日本語|\|\s*日本語|README\.ja\.md|readme\.ja\.md)/;

const MAIN_README_NAMES = ["README.md", "README.rst", "README.asciidoc", "docs/README.md", "README"];

function parseOwnerRepo(githubUrl) {
  const m = String(githubUrl || "").match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/i, "") };
}

async function fetchText(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function checkOne(t) {
  const or = parseOwnerRepo(t.github_url);
  if (!or) return { id: t.id, ja_docs: null, evidence: "owner/repo解析失敗" };
  const base = `https://raw.githubusercontent.com/${or.owner}/${or.repo}/HEAD/`;

  for (const name of JA_README_NAMES) {
    const text = await fetchText(base + name);
    if (text) return { id: t.id, ja_docs: "official", evidence: `${name}が実在` };
  }

  for (const name of MAIN_README_NAMES) {
    const readme = await fetchText(base + name);
    if (readme == null) continue;
    if (JA_LINK_PATTERN.test(readme)) {
      const m = readme.match(JA_LINK_PATTERN);
      return { id: t.id, ja_docs: "official", evidence: `${name}内の言語リンク ${JSON.stringify(m[0])}` };
    }
    return { id: t.id, ja_docs: "none", evidence: `${name}に日本語版への言及なし` };
  }

  return { id: t.id, ja_docs: null, evidence: "READMEを取得できなかった" };
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    })
  );
  return out;
}

async function main() {
  const raw = JSON.parse(fs.readFileSync(TOOLS_PATH, "utf8"));
  const isWrapped = !Array.isArray(raw) && Array.isArray(raw.tools);
  const tools = isWrapped ? raw.tools : raw;

  let targets;
  if (IDS) {
    targets = tools.filter((t) => IDS.includes(t.id));
  } else {
    targets = tools
      .filter((t) => t.ja_docs == null && !t.github_archived)
      .sort((a, b) => (b.health_score ?? -1) - (a.health_score ?? -1));
    if (LIMIT) targets = targets.slice(0, LIMIT);
  }

  console.log(`対象: ${targets.length}件`);

  const results = await mapLimit(targets, CONCURRENCY, checkOne);

  const byId = new Map(tools.map((t) => [t.id, t]));
  let official = 0,
    none = 0,
    stillNull = 0;
  for (const r of results) {
    console.log(r.id.padEnd(24), String(r.ja_docs).padEnd(8), "|", r.evidence);
    if (r.ja_docs === "official") official++;
    else if (r.ja_docs === "none") none++;
    else stillNull++;
    if (!DRY_RUN && r.ja_docs != null) byId.get(r.id).ja_docs = r.ja_docs;
  }

  console.log(`\n■ official: ${official}件 / none: ${none}件 / 未取得のまま: ${stillNull}件`);

  if (DRY_RUN) {
    console.log("\n(--dry-run のため書き込みません)");
    return;
  }
  fs.writeFileSync(TOOLS_PATH, JSON.stringify(isWrapped ? { ...raw, tools } : tools, null, 1) + "\n");
  console.log(`書き込み: ${path.relative(ROOT, TOOLS_PATH)}`);
}

main().catch((err) => {
  console.error("失敗:", err);
  process.exit(1);
});
