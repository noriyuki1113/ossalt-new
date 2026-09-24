#!/usr/bin/env node
/**
 * 候補データの補完と統合
 *
 *   scripts/candidates/01_candidates.verified.json
 *   ↓ GitHubの公開ページからスター数・フォーク数・ライセンス・言語・アーカイブ状態を取得
 *   ↓ data-source/tools.json（既存40件）へ追記
 *
 * GitHub API はトークン無しでは毎時60回のため使わない。
 * 公開ページのHTMLから読む（アーカイブ状態の検出も兼ねる）。
 *
 *   node scripts/enrich-and-merge.mjs --test 3     … 3件だけ解析して結果を表示
 *   node scripts/enrich-and-merge.mjs              … 全件
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CAND = path.join(ROOT, "scripts", "candidates");
const SRC_TOOLS = path.join(ROOT, "data-source", "tools.json");

const TEST_N = Number(process.argv[process.argv.indexOf("--test") + 1]) || 0;
const CONCURRENCY = 6;

/** 廃止・移管済みなどで掲載しないと判断したもの */
const DROP = new Set([
  "drone", // 本体開発がHarnessへ統合され、単体では更新されていない
  "grafana-oncall", // 提供終了が告知され、リポジトリは保管庫へ移された
  "vtiger", "opencats", "urbackup", "forgejo", // GitHub上に現役のリポジトリが無い
]);

/** 検証で見つかった正しいリポジトリ */
const FIX_REPO = {
  revolt: "stoatchat/stoatchat",
};

function num(s) {
  if (!s) return null;
  const n = Number(String(s).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** GitHubの公開ページからメタ情報を取り出す */
function parseRepoPage(html) {
  const archived =
    /This repository has been archived/i.test(html) ||
    /"isArchived":true/i.test(html);

  const stars =
    num(html.match(/id="repo-stars-counter-star"[^>]*title="([\d,]+)"/)?.[1]) ??
    num(html.match(/"stargazerCount":(\d+)/)?.[1]);

  const forks =
    num(html.match(/id="repo-network-counter"[^>]*title="([\d,]+)"/)?.[1]) ??
    num(html.match(/"forkCount":(\d+)/)?.[1]);

  // サイドバーの「MIT license」表記を拾う
  const license =
    html.match(
      /href="[^"]*\/blob\/[^"]*(?:LICENSE|COPYING)[^"]*"[^>]*>\s*(?:<[^>]+>\s*)*([A-Za-z0-9.\-+ ]{2,24}?)\s*(?:license)?\s*</i
    )?.[1]?.trim() ||
    html.match(/(MIT|Apache-2\.0|AGPL-3\.0|LGPL-3\.0|GPL-3\.0|GPL-2\.0|MPL-2\.0|BSD-3-Clause|BSD-2-Clause|Unlicense|Elastic-2\.0|SSPL-1\.0|BUSL-1\.1|ISC|CC0-1\.0)\s*(?:license)?/i)?.[1] ||
    null;

  const language =
    html.match(
      /class="color-fg-default text-bold mr-1">([^<]+)<\/span>/i
    )?.[1]?.trim() ??
    html.match(/"primaryLanguage":\{"name":"([^"]+)"/)?.[1] ??
    null;

  // リポジトリの説明（GitHub上の公式説明）
  const description =
    html.match(/<meta name="description" content="([^"]*)"/i)?.[1]?.trim() ?? null;

  return { archived, stars, forks, license, language, description };
}

async function fetchPage(url, attempt = 1) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 25000);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ossalt-data/1.0; +https://ossalt.jp)",
        "Accept-Language": "ja,en;q=0.8",
      },
    });
    if ((res.status === 429 || res.status === 403) && attempt <= 2) {
      await new Promise((r) => setTimeout(r, 3000 * attempt));
      return fetchPage(url, attempt + 1);
    }
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return { html: await res.text() };
  } catch (e) {
    if (attempt <= 2) {
      await new Promise((r) => setTimeout(r, 2000 * attempt));
      return fetchPage(url, attempt + 1);
    }
    return { error: String(e?.name || e) };
  } finally {
    clearTimeout(timer);
  }
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
      }
    })
  );
  return out;
}

/* ---------------- 候補の読み込み ---------------- */

const verified = JSON.parse(
  fs.readFileSync(path.join(CAND, "01_candidates.verified.json"), "utf8")
);

const seen = new Set();
const work = [];
for (const v of verified) {
  const id = v.id;
  if (seen.has(id) || DROP.has(id)) continue;
  seen.add(id);
  work.push({ ...v, gh: FIX_REPO[id] ?? v.gh });
}

const targets = TEST_N ? work.slice(0, TEST_N) : work;
console.log(`対象: ${targets.length}件（全${work.length}件 / 除外${DROP.size}件）`);
console.log(`GitHubページを取得中（並列${CONCURRENCY}）…\n`);

const results = await mapLimit(targets, CONCURRENCY, async (w) => {
  const r = await fetchPage(`https://github.com/${w.gh}`);
  if (r.error) return { ...w, error: r.error };
  return { ...w, ...parseRepoPage(r.html) };
});

if (TEST_N) {
  for (const r of results) {
    console.log(
      `${r.id.padEnd(18)} stars=${String(r.stars ?? "?").padStart(8)} forks=${String(
        r.forks ?? "?"
      ).padStart(6)} lic=${String(r.license ?? "?").padEnd(14)} lang=${String(
        r.language ?? "?"
      ).padEnd(12)} archived=${r.archived} err=${r.error ?? "-"}`
    );
    console.log(`   desc: ${String(r.description ?? "").slice(0, 90)}`);
  }
  process.exit(0);
}

/* ---------------- tools.json へ統合 ---------------- */

const existing = JSON.parse(fs.readFileSync(SRC_TOOLS, "utf8"));
const byId = new Map(existing.map((t) => [t.id, t]));

let added = 0;
let updatedDesc = 0;
for (const r of results) {
  if (r.error) {
    console.warn(`取得失敗のため保留: ${r.id} (${r.error})`);
    continue;
  }
  if (byId.has(r.id)) continue;

  byId.set(r.id, {
    id: r.id,
    name: r.name,
    url: r.url,
    github_url: `https://github.com/${r.gh}`,
    description_ja: r.descJa,
    // 公式の英語説明はGitHub上の説明文をそのまま使う（無ければnull）
    description_en: r.description ?? null,
    parent_category_ja: null,
    category: r.category,
    primary_competitor: r.competitor,
    primary_competitor_ja: null,
    stars_num: r.stars,
    language: r.language,
    license: r.license,
    forks_num: r.forks,
    // 最終コミット・コントリビュータ・ウォッチャーは日次のGitHub連携で補完する
    last_commit: null,
    created_at: null,
    scorecard_score: null,
    docker_available: null,
    github_archived: Boolean(r.archived),
    topics: [],
    languages: [],
    _url_verified: r.urlVerified,
    _source: "candidates-2026-09",
  });
  added++;
  if (r.description) updatedDesc++;
}

const out = [...byId.values()];
fs.writeFileSync(SRC_TOOLS, JSON.stringify(out, null, 1));
fs.writeFileSync(
  path.join(CAND, "02_enriched.json"),
  JSON.stringify(results, null, 1)
);

const withStars = out.filter((t) => t.stars_num != null).length;
const withLicense = out.filter((t) => t.license).length;
const archived = out.filter((t) => t.github_archived).length;

console.log(`\n■ 追加: ${added}件（英語説明を取得: ${updatedDesc}件）`);
console.log(`■ tools.json 合計: ${out.length}件`);
console.log(`  - スター数あり: ${withStars}件`);
console.log(`  - ライセンスあり: ${withLicense}件`);
console.log(`  - アーカイブ済みとして検出: ${archived}件`);
const failed = results.filter((r) => r.error);
if (failed.length) {
  console.log(`  - 取得できなかったもの: ${failed.length}件 ${failed.map((f) => f.id).join(", ")}`);
}
