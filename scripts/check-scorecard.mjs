#!/usr/bin/env node
/**
 * OpenSSF Scorecard REST API (api.securityscorecards.dev) の挙動を
 * 実際に確認するための使い捨て診断スクリプト。
 *
 * タスク0（25/384件しか無い原因の切り分け）のためだけに使う。
 * このセッションのサンドボックスは api.securityscorecards.dev への
 * 通信が制限されているため、GitHub Actions（フルインターネットアクセス）
 * 上で実行し、ログで結果を確認する。
 *
 * 使い方: node scripts/check-scorecard.mjs --ids ollama,immich,...
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOLS_PATH = path.join(ROOT, "data-source", "tools.json");

const argv = process.argv.slice(2);
const idsArg = argv[argv.indexOf("--ids") + 1] || "";
const ids = idsArg.split(",").map((s) => s.trim()).filter(Boolean);

function parseRepo(url) {
  const m = String(url || "").match(/^https?:\/\/(?:www\.)?github\.com\/([^/\s]+)\/([^/?#\s]+)/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/i, "") };
}

async function checkOne(owner, repo) {
  const url = `https://api.securityscorecards.dev/projects/github.com/${owner}/${repo}`;
  const started = Date.now();
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const ms = Date.now() - started;
    const bodyText = await res.text();
    let body = null;
    try {
      body = JSON.parse(bodyText);
    } catch {
      /* not json */
    }
    return { url, status: res.status, ms, bodySnippet: bodyText.slice(0, 400), body };
  } catch (err) {
    return { url, status: "network-error", error: String(err) };
  }
}

async function main() {
  const raw = JSON.parse(await readFile(TOOLS_PATH, "utf8"));
  const tools = Array.isArray(raw) ? raw : raw.tools;

  const targets = ids.length
    ? ids.map((id) => tools.find((t) => t.id === id)).filter(Boolean)
    : tools.slice(0, 5);

  console.log(`=== Scorecard API 診断: ${targets.length}件 ===\n`);

  for (const t of targets) {
    const parsed = parseRepo(t.github_url);
    console.log(`--- ${t.id} (${t.github_url}) 既存scorecard_score=${t.scorecard_score ?? "null"} ---`);
    if (!parsed) {
      console.log("  github_url を解析できず");
      continue;
    }
    const result = await checkOne(parsed.owner, parsed.repo);
    console.log(`  GET ${result.url}`);
    console.log(`  status=${result.status} time=${result.ms}ms`);
    if (result.body) {
      console.log(
        `  score=${result.body.score ?? "(フィールドなし)"} date=${result.body.date ?? "(フィールドなし)"}`
      );
    } else if (result.bodySnippet) {
      console.log(`  body: ${result.bodySnippet}`);
    } else if (result.error) {
      console.log(`  error: ${result.error}`);
    }
    console.log("");
  }
}

main().catch((err) => {
  console.error("失敗:", err);
  process.exit(1);
});
