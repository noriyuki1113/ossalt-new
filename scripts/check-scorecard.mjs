#!/usr/bin/env node
/**
 * タスク0/タスク1の実装前に、実際のエンドポイントの挙動を確認するための
 * 使い捨て診断スクリプト。GitHub Actions（フルインターネットアクセス、
 * GITHUB_TOKEN あり）上で実行する前提。
 *
 * 確認するもの:
 *   - OpenSSF Scorecard REST API（api.securityscorecards.dev）
 *   - GitHub contents API（SECURITY.md / .github/dependabot.yml の有無）
 *   - GitHub releases API（最新リリース・直近12か月件数）
 *   - GitHub security-advisories API（件数。権限で弾かれるか確認）
 *
 * 使い方: GITHUB_TOKEN=xxx node scripts/check-scorecard.mjs --ids ollama,immich,...
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOLS_PATH = path.join(ROOT, "data-source", "tools.json");
const TOKEN = process.env.GITHUB_TOKEN || "";
const GH_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "ossalt.jp-data-pipeline-diag",
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

const argv = process.argv.slice(2);
const idsArg = argv[argv.indexOf("--ids") + 1] || "";
const ids = idsArg.split(",").map((s) => s.trim()).filter(Boolean);

function parseRepo(url) {
  const m = String(url || "").match(/^https?:\/\/(?:www\.)?github\.com\/([^/\s]+)\/([^/?#\s]+)/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/i, "") };
}

async function get(url, headers) {
  const started = Date.now();
  try {
    const res = await fetch(url, { headers });
    const ms = Date.now() - started;
    const text = await res.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      /* not json */
    }
    return { status: res.status, ms, body, textSnippet: text.slice(0, 300) };
  } catch (err) {
    return { status: "network-error", error: String(err) };
  }
}

async function checkTool(t) {
  const parsed = parseRepo(t.github_url);
  console.log(`\n=== ${t.id} (${t.github_url}) ===`);
  if (!parsed) {
    console.log("  github_url を解析できず");
    return;
  }
  const { owner, repo } = parsed;

  // 1) Scorecard
  {
    const r = await get(`https://api.securityscorecards.dev/projects/github.com/${owner}/${repo}`, {
      Accept: "application/json",
    });
    console.log(
      `  [scorecard] status=${r.status} time=${r.ms}ms score=${r.body?.score ?? "-"} date=${r.body?.date ?? "-"}`
    );
  }

  // 2) SECURITY.md
  {
    const r = await get(`https://api.github.com/repos/${owner}/${repo}/contents/SECURITY.md`, GH_HEADERS);
    console.log(`  [SECURITY.md] status=${r.status} time=${r.ms}ms`);
  }

  // 3) .github/dependabot.yml
  {
    const r = await get(
      `https://api.github.com/repos/${owner}/${repo}/contents/.github/dependabot.yml`,
      GH_HEADERS
    );
    console.log(`  [dependabot.yml] status=${r.status} time=${r.ms}ms`);
  }

  // 4) releases（直近5件のみ表示）
  {
    const r = await get(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=5`, GH_HEADERS);
    const count = Array.isArray(r.body) ? r.body.length : "-";
    const first = Array.isArray(r.body) && r.body[0] ? r.body[0].published_at : "-";
    console.log(`  [releases] status=${r.status} time=${r.ms}ms items=${count} latest=${first}`);
  }

  // 5) security-advisories（権限が要るか確認）
  {
    const r = await get(`https://api.github.com/repos/${owner}/${repo}/security-advisories?per_page=5`, GH_HEADERS);
    const count = Array.isArray(r.body) ? r.body.length : "-";
    console.log(
      `  [security-advisories] status=${r.status} time=${r.ms}ms items=${count} body=${
        Array.isArray(r.body) ? "" : r.textSnippet
      }`
    );
  }
}

async function main() {
  const raw = JSON.parse(await readFile(TOOLS_PATH, "utf8"));
  const tools = Array.isArray(raw) ? raw : raw.tools;
  const targets = ids.length
    ? ids.map((id) => tools.find((t) => t.id === id)).filter(Boolean)
    : tools.slice(0, 5);

  console.log(`=== エンドポイント診断: ${targets.length}件 (token=${TOKEN ? "あり" : "なし"}) ===`);
  for (const t of targets) {
    await checkTool(t);
  }
}

main().catch((err) => {
  console.error("失敗:", err);
  process.exit(1);
});
