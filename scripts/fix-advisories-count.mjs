#!/usr/bin/env node
/**
 * advisories_count だけを再取得する軽量スクリプト（一回限りの使い捨て）。
 *
 * 経緯: fetch-github-api.mjs で advisories_count が per_page=100 の
 * 頭打ちバグ→Linkヘッダ方式への切り替えでの0/1化けバグ、と2回問題が
 * あった。修正後の値を反映するために384件全体を7項目まとめて再取得する
 * 重い処理（fetch-github-api.mjs）を再実行したところ、GitHubのレート制限
 * の影響とみられる遅延で6時間以上かかっても終わらなかった。
 * advisories_count 以外（scorecard_score / security_md /
 * dependabot_configured / latest_release_at / releases_12mo）は
 * 既に正しく取得できていることを確認済みのため、advisories_countだけを
 * 狙って再取得し、API呼び出し数を1/7近くに減らす。
 *
 * 使い方: GITHUB_TOKEN=xxx node scripts/fix-advisories-count.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOLS_PATH = path.join(ROOT, "data-source", "tools.json");

const TOKEN =
  process.env.GITHUB_TOKEN || process.env.GITHUB_DATA_TOKEN || process.env.GH_TOKEN || "";
const CONCURRENCY = Number(process.env.FETCH_CONCURRENCY || 3);

const HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "ossalt.jp-data-pipeline",
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

function parseRepo(url) {
  if (!url) return null;
  const m = String(url).match(/^https?:\/\/(?:www\.)?github\.com\/([^/\s]+)\/([^/?#\s]+)/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/i, "") };
}

/** fetch()自体にタイムアウトが無いと、応答が返らない接続でawaitが永遠に
 * 止まりうる（今回の長時間ハングの原因と判断している）。15秒で打ち切る。 */
async function ghFetch(url) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 15000);
    let res;
    try {
      res = await fetch(url, { headers: HEADERS, signal: ctl.signal });
    } catch {
      res = null;
    } finally {
      clearTimeout(timer);
    }
    if (!res) {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      return null;
    }
    if (res.status === 200) return res;
    if (res.status === 404) return res;
    if (res.status === 403 || res.status === 429) {
      const reset = Number(res.headers.get("x-ratelimit-reset") || 0);
      const waitMs = reset ? Math.max(0, reset * 1000 - Date.now()) + 2000 : 8000;
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, Math.min(waitMs, 60000)));
        continue;
      }
    }
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }
    return res;
  }
  return null;
}

async function fetchAdvisoriesCount(owner, repo) {
  const base = `https://api.github.com/repos/${owner}/${repo}`;
  let total = 0;
  let sawAny = false;

  for (let page = 1; page <= 10; page += 1) {
    const res = await ghFetch(`${base}/security-advisories?per_page=100&page=${page}`);
    if (!res || !res.ok) return sawAny ? total : null;
    const list = await res.json().catch(() => null);
    if (!Array.isArray(list) || list.length === 0) break;
    sawAny = true;
    total += list.length;
    if (list.length < 100) break;
  }

  return sawAny ? total : 0;
}

async function main() {
  const raw = JSON.parse(await readFile(TOOLS_PATH, "utf8"));
  const isWrapped = !Array.isArray(raw) && Array.isArray(raw.tools);
  const tools = isWrapped ? raw.tools : raw;

  const targets = tools.filter((t) => parseRepo(t.github_url));
  console.log(`対象: ${targets.length}件（並列 ${CONCURRENCY}）`);

  const queue = [...targets];
  let done = 0;
  let updated = 0;
  const failed = [];

  async function worker() {
    while (queue.length) {
      const tool = queue.shift();
      const parsed = parseRepo(tool.github_url);
      const count = await fetchAdvisoriesCount(parsed.owner, parsed.repo);
      done += 1;
      if (count == null) {
        failed.push(tool.id);
      } else {
        tool.advisories_count = count;
        updated += 1;
      }
      if (done % 25 === 0 || done === targets.length) {
        console.log(`  ${done}/${targets.length} 件処理済み（成功 ${updated}）`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, CONCURRENCY) }, worker));

  console.log(`\n完了: 成功 ${updated} / 失敗 ${failed.length}`);
  if (failed.length) {
    console.log("取得できなかったもの（advisories_countは変更せず既存値を維持）:");
    for (const id of failed.slice(0, 20)) console.log(`  - ${id}`);
    if (failed.length > 20) console.log(`  …ほか ${failed.length - 20}件`);
  }

  await writeFile(
    TOOLS_PATH,
    JSON.stringify(isWrapped ? { ...raw, tools } : tools, null, 2) + "\n"
  );
  console.log(`書き込み: ${path.relative(ROOT, TOOLS_PATH)}`);
}

main().catch((err) => {
  console.error("失敗:", err);
  process.exit(1);
});
