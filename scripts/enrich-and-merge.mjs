#!/usr/bin/env node
/**
 * 候補データの補完と統合
 *
 *   scripts/candidates/01_candidates.verified.json
 *   ↓ data-source/tools.json へ追記（スター数・フォーク数・ライセンス・言語・
 *     アーカイブ状態・最終コミットなどは null のまま追加する）
 *
 * 本来はGitHubの公開ページ（github.com/<owner>/<repo>）のHTMLを読んで
 * スター数などをその場で埋めていたが、github.com へのアクセスが制限された
 * 環境（このリポジトリ用のセッションなど）ではその手段が使えない。
 * その場合は数値系フィールドを null のまま追加し、次回の
 * `node scripts/fetch-github-api.mjs`（GitHub Actions の「データ更新」
 * ワークフローが GITHUB_TOKEN 付きで自動実行する）に任せて後から埋める。
 * これは既存ツールの「未取得」表示と同じ扱いであり、推測値を入れるよりも
 * ここでは確実な選択。
 *
 *   node scripts/enrich-and-merge.mjs --test 3     … 3件だけ確認して結果を表示
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

/**
 * リポジトリの実在を raw.githubusercontent.com であらためて確認する
 * （verify-candidates.mjs と同じ判定方法。github.com の公開ページが
 * 読めない環境でも動く）。スター数・フォーク数・ライセンス・言語・
 * アーカイブ状態はここでは取得しない＝null のまま追加し、
 * fetch-github-api.mjs（GitHub Actions側、GITHUB_TOKEN あり）に委ねる。
 */
async function checkExists(url, attempt = 1) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(url, { method: "HEAD", signal: ctl.signal });
    if ((res.status === 429 || res.status === 403) && attempt <= 2) {
      await new Promise((r) => setTimeout(r, 2000 * attempt));
      return checkExists(url, attempt + 1);
    }
    return res.status === 200;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// README.md / package.json が無いリポジトリ（Erlang/Pythonプロジェクト等で
// README.rst しか無い、ルートにpackage.jsonを置かないモノレポ等）も
// 拾えるよう、候補ファイルを増やしておく。
const EXISTENCE_FILES = [
  "README.md",
  "package.json",
  "README.rst",
  "README",
  "LICENSE",
  "go.mod",
  "setup.py",
];

async function fetchPage(url) {
  for (const file of EXISTENCE_FILES) {
    if (await checkExists(`${url}/HEAD/${file}`)) {
      return { archived: false, stars: null, forks: null, license: null, language: null, description: null };
    }
  }
  return { error: "raw.githubusercontent.com で実在を確認できない" };
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
console.log(`実在確認中（並列${CONCURRENCY}）…\n`);

const results = await mapLimit(targets, CONCURRENCY, async (w) => {
  const r = await fetchPage(`https://raw.githubusercontent.com/${w.gh}`);
  if (r.error) return { ...w, error: r.error };
  return { ...w, ...r };
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
    _source: "candidates-2026-09b",
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
