#!/usr/bin/env node
/**
 * GitHub REST API で data-source/tools.json の「未取得」項目を補完する。
 *
 * 補完する項目:
 *   contributors / watchers / last_commit / created_at / language /
 *   license / stars_num / forks_num / github_archived / topics
 *
 * 使い方:
 *   GITHUB_TOKEN=ghp_xxx node scripts/fetch-github-api.mjs
 *   任意フラグ:
 *     --limit 20        先頭20件だけ取得（動作確認用）
 *     --only n8n,penpot 指定IDだけ取得
 *     --dry-run         結果を表示するだけで tools.json を書かない
 *
 * トークンなしでも動くが、GitHubは未認証だと毎時60リクエストのため
 * 336件（×2リクエスト）を処理しきれない。GitHub Actions では
 * Secrets の GITHUB_TOKEN が自動で入るため、そのまま実行できる。
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOLS_PATH = path.join(ROOT, "data-source", "tools.json");

const TOKEN =
  process.env.GITHUB_TOKEN || process.env.GITHUB_DATA_TOKEN || process.env.GH_TOKEN || "";
const CONCURRENCY = Number(process.env.FETCH_CONCURRENCY || 4);

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = argv.indexOf(name);
  return i === -1 ? fallback : argv[i + 1] ?? true;
};
const LIMIT = Number(flag("--limit", 0)) || 0;
const ONLY = flag("--only", null);
const DRY_RUN = argv.includes("--dry-run");

const HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "ossalt.jp-data-pipeline",
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

/** github_url から owner / repo を取り出す。 */
function parseRepo(url) {
  if (!url) return null;
  const m = String(url).match(
    /^https?:\/\/(?:www\.)?github\.com\/([^/\s]+)\/([^/?#\s]+)/i
  );
  if (!m) return null;
  const owner = m[1];
  const repo = m[2].replace(/\.git$/i, "");
  if (!owner || !repo) return null;
  return { owner, repo, slug: `${owner}/${repo}` };
}

/** レート制限に当たったらリセット時刻まで待って1回だけ再試行する。 */
async function ghFetch(url) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await fetch(url, { headers: HEADERS });
    if (res.status === 200) return res;
    if (res.status === 404) return res;
    if (res.status === 403 || res.status === 429) {
      const reset = Number(res.headers.get("x-ratelimit-reset") || 0);
      const waitMs = reset ? Math.max(0, reset * 1000 - Date.now()) + 2000 : 8000;
      if (attempt < 2) {
        console.warn(
          `  [rate-limit] ${res.status} — ${Math.round(waitMs / 1000)}秒待機して再試行`
        );
        await new Promise((r) => setTimeout(r, Math.min(waitMs, 120000)));
        continue;
      }
    }
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      continue;
    }
    return res;
  }
  return null;
}

/** Link ヘッダの rel="last" から総件数を得る（contributors の件数取得に使う）。 */
function totalFromLink(linkHeader) {
  if (!linkHeader) return null;
  const m = linkHeader.match(/[?&]page=(\d+)[^>]*>;\s*rel="last"/);
  return m ? Number(m[1]) : null;
}

async function fetchOne(slug) {
  const base = `https://api.github.com/repos/${slug}`;
  const repoRes = await ghFetch(base);

  if (!repoRes) return { ok: false, reason: "network" };
  if (repoRes.status === 404) return { ok: false, reason: "404 リポジトリが存在しない" };
  if (repoRes.status === 451) return { ok: false, reason: "451 法的制限で取得不可" };
  if (!repoRes.ok) return { ok: false, reason: `HTTP ${repoRes.status}` };

  const repo = await repoRes.json();

  // contributors: per_page=1 で1件だけ取り、Link の last から総数を得る（1リクエストで済む）
  let contributors = null;
  const contribRes = await ghFetch(`${base}/contributors?per_page=1&anon=1`);
  if (contribRes && contribRes.ok) {
    contributors = totalFromLink(contribRes.headers.get("link"));
    if (contributors == null) {
      const list = await contribRes.json().catch(() => null);
      if (Array.isArray(list)) contributors = list.length || null;
    }
  }

  return {
    ok: true,
    data: {
      stars_num: typeof repo.stargazers_count === "number" ? repo.stargazers_count : null,
      forks_num: typeof repo.forks_count === "number" ? repo.forks_count : null,
      // API の subscribers_count が「ウォッチしている人数」。watchers_count はスター数と同義なので使わない。
      watchers: typeof repo.subscribers_count === "number" ? repo.subscribers_count : null,
      contributors,
      last_commit: repo.pushed_at || null,
      created_at: repo.created_at || null,
      language: repo.language || null,
      license: repo.license?.spdx_id && repo.license.spdx_id !== "NOASSERTION"
        ? repo.license.spdx_id
        : null,
      github_archived: repo.archived === true,
      ...(Array.isArray(repo.topics) && repo.topics.length ? { topics: repo.topics } : {}),
      github_checked_at: new Date().toISOString(),
    },
  };
}

async function main() {
  const raw = JSON.parse(await readFile(TOOLS_PATH, "utf8"));
  const isWrapped = !Array.isArray(raw) && Array.isArray(raw.tools);
  const tools = isWrapped ? raw.tools : raw;

  let targets = tools.filter((t) => parseRepo(t.github_url));
  if (ONLY) {
    const ids = String(ONLY).split(",").map((s) => s.trim()).filter(Boolean);
    targets = targets.filter((t) => ids.includes(t.id));
  }
  if (LIMIT) targets = targets.slice(0, LIMIT);

  if (!TOKEN) {
    console.warn(
      "⚠️  GITHUB_TOKEN が未設定です。未認証は毎時60リクエストのため、" +
        "対象が多いと途中でレート制限に達します。"
    );
  }
  console.log(`対象: ${targets.length}件 / 全体 ${tools.length}件（並列 ${CONCURRENCY}）`);

  const queue = [...targets];
  let done = 0;
  let updated = 0;
  const failed = [];

  async function worker() {
    while (queue.length) {
      const tool = queue.shift();
      const parsed = parseRepo(tool.github_url);
      const res = await fetchOne(parsed.slug);
      done += 1;

      if (!res.ok) {
        failed.push({ id: tool.id, url: tool.github_url, reason: res.reason });
      } else {
        Object.assign(tool, res.data);
        updated += 1;
      }
      if (done % 25 === 0 || done === targets.length) {
        console.log(`  ${done}/${targets.length} 件処理済み（成功 ${updated}）`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, CONCURRENCY) }, worker));

  // 健全度スコアは4項目すべて揃ったときだけ再計算する（一部だけの合計を出さない）
  const computed = tools.filter(
    (t) =>
      typeof t.stars_num === "number" &&
      typeof t.forks_num === "number" &&
      typeof t.contributors === "number" &&
      typeof t.watchers === "number"
  );
  for (const t of computed) {
    const days = t.last_commit
      ? Math.min(Math.max(0, Math.floor((Date.now() - new Date(t.last_commit)) / 86400000)), 90)
      : 0;
    t.health_score = Math.round(
      t.stars_num * 0.25 +
        t.forks_num * 0.5 +
        t.contributors * 0.5 +
        t.watchers * 0.25 -
        days * 0.5
    );
  }

  console.log(
    `\n完了: 成功 ${updated} / 失敗 ${failed.length} / 健全度スコア算出 ${computed.length}件`
  );
  if (failed.length) {
    console.log("取得できなかったもの:");
    for (const f of failed.slice(0, 20)) console.log(`  - ${f.id}: ${f.reason}`);
    if (failed.length > 20) console.log(`  …ほか ${failed.length - 20}件`);
  }

  if (DRY_RUN) {
    console.log("(--dry-run のため書き込みません)");
    return;
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
