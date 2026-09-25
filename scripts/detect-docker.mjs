#!/usr/bin/env node
/**
 * docker_available（Docker対応）の自動判定。
 *
 * data-source/tools.json のうち docker_available が null のツールについて、
 * GitHubリポジトリの代表的な場所に Dockerfile / docker-compose.yml（または
 * その一般的な別名）が実在するかを raw.githubusercontent.com で確認する。
 *
 *   - 見つかった → true（実在するファイルを確認できたので確実）
 *   - どこにも見つからなかった → false
 *     （このスクリプトが調べた一般的な場所に無かった、という意味。
 *       非常に特殊な配置のリポジトリでは見落とす可能性があるため、
 *       「Docker対応"では無い"ことの断定」ではなく「一般的な場所には無かった」
 *       という前提で使うこと）
 *   - ネットワークエラー等で確認できなかった → null のまま（未取得）
 *
 * 使い方:
 *   node scripts/detect-docker.mjs             … 全件
 *   node scripts/detect-docker.mjs --limit 10   … 先頭10件だけ（動作確認用）
 *   node scripts/detect-docker.mjs --dry-run    … 書き込まず結果を表示
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TOOLS_PATH = path.join(ROOT, "data-source", "tools.json");
const CONCURRENCY = 6;
const TIMEOUT_MS = 6000;

const argv = process.argv.slice(2);
const LIMIT = Number(argv[argv.indexOf("--limit") + 1]) || 0;
const DRY_RUN = argv.includes("--dry-run");

// 確認する代表的なパス（このいずれかが見つかれば true）
const CANDIDATE_PATHS = [
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "compose.yml",
  "compose.yaml",
  "docker/Dockerfile",
  "docker/docker-compose.yml",
  "deploy/docker-compose.yml",
];

function parseOwnerRepo(githubUrl) {
  const m = String(githubUrl || "").match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/i, "") };
}

async function exists(url, attempt = 1) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: "HEAD", signal: ctl.signal });
    if ((res.status === 403 || res.status === 429) && attempt <= 2) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      return exists(url, attempt + 1);
    }
    return res.status === 200;
  } catch {
    return null; // ネットワークエラー＝確認不能（falseにはしない）
  } finally {
    clearTimeout(timer);
  }
}

async function checkTool(t) {
  const or = parseOwnerRepo(t.github_url);
  if (!or) return { id: t.id, result: null, reason: "owner/repo解析失敗" };
  let sawNetworkError = false;
  for (const p of CANDIDATE_PATHS) {
    const url = `https://raw.githubusercontent.com/${or.owner}/${or.repo}/HEAD/${p}`;
    const r = await exists(url);
    if (r === true) return { id: t.id, result: true, foundAt: p };
    if (r === null) sawNetworkError = true;
  }
  // 全パス確認できて、どこにも見つからなければ false。
  // 1箇所でもネットワークエラーで確認できなかった場合は、
  // 「無かった」と断定せず null（未取得）のままにする。
  return sawNetworkError
    ? { id: t.id, result: null, reason: "一部パスを確認できなかった" }
    : { id: t.id, result: false };
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

  let targets = tools.filter((t) => t.docker_available == null);
  if (LIMIT) targets = targets.slice(0, LIMIT);

  console.log(`対象: ${targets.length}件（docker_available が null のもの）`);

  const results = await mapLimit(targets, CONCURRENCY, checkTool);

  let trueCount = 0;
  let falseCount = 0;
  let stillNull = 0;
  const byId = new Map(tools.map((t) => [t.id, t]));
  for (const r of results) {
    if (r.result === true) trueCount++;
    else if (r.result === false) falseCount++;
    else stillNull++;
    if (!DRY_RUN && r.result != null) {
      byId.get(r.id).docker_available = r.result;
    }
  }

  console.log(`\n■ true（Docker対応を確認）: ${trueCount}件`);
  console.log(`■ false（一般的な場所には見つからず）: ${falseCount}件`);
  console.log(`■ 未取得のまま: ${stillNull}件`);

  if (DRY_RUN) {
    console.log("\n(--dry-run のため書き込みません)");
    return;
  }

  fs.writeFileSync(TOOLS_PATH, JSON.stringify(isWrapped ? { ...raw, tools } : tools, null, 1) + "\n");
  console.log(`\n書き込み: ${path.relative(ROOT, TOOLS_PATH)}`);
}

main().catch((err) => {
  console.error("失敗:", err);
  process.exit(1);
});
