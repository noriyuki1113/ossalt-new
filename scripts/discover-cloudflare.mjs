#!/usr/bin/env node
/**
 * Cloudflare OSS Discovery（Phase 1）：Cloudflare 上で動くOSSの掲載候補を集める
 *
 *   収集   Awesome Cloudflare Self-Hosted の README（MIT。項目は CC0 の扱いで自由に使ってよいと明記）
 *          Appflare のカタログ index.json（Apache-2.0）
 *   正規化 リポジトリを owner/repo（小文字）にそろえる
 *   確認   プロジェクト自身の wrangler の設定ファイル（raw.githubusercontent.com）で、使う Cloudflare の機能を読む
 *          GitHub API（トークンがあるときだけ。GitHub Actions で動かす）でライセンス・スター・移転などを取る
 *   照合   掲載データ（data-source/tools.json）と、リポジトリ・移転前の名前・GitHub のリポジトリIDで照合
 *   出力   data-source/discovery/cloudflare-candidates.json … 候補（審査待ちの一覧）
 *          data-source/discovery/state.json                 … 最終実行日時・件数・API の使用量・ETag の控え
 *          docs/discovery/cloudflare-candidates.md          … 人が読む一覧
 *
 * data-source/tools.json には一切書き込まない。掲載するかは人が決め、既存の「ツール追加」ワークフローで追加する。
 * 同じ入力なら何度実行しても候補のファイルは変わらない（値が変わらない項目は取得日時も前回のまま）。
 *
 * 使い方:
 *   node scripts/discover-cloudflare.mjs                # 全部
 *   GITHUB_TOKEN=… node scripts/discover-cloudflare.mjs --max-requests 300
 *   任意: --no-github（API を使わない） --no-config（設定ファイルを読まない） --limit 20（動作確認）
 */

import fs from "node:fs";
import path from "node:path";
import {
  BLOCKING_ISSUES,
  carryOverFetchedAt,
  diffExisting,
  field,
  indexTools,
  matchExisting,
  mergeCandidates,
  parseAppflareIndex,
  parseAwesomeReadme,
  parseWranglerConfig,
  qualityIssues,
  stableStringify,
} from "./discovery/lib.mjs";
import { BudgetExceeded, createGitHubClient, fetchRepoFacts } from "./discovery/github.mjs";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "data-source", "discovery");
const OUT = path.join(OUT_DIR, "cloudflare-candidates.json");
const STATE = path.join(OUT_DIR, "state.json");
// ETag の控え（API の応答の本文を含むため大きい）。リポジトリには入れず、GitHub Actions のキャッシュで引き継ぐ
const ETAG_CACHE = path.join(OUT_DIR, ".etag-cache.json");
const DECISIONS = path.join(OUT_DIR, "decisions.json");
const MD = path.join(ROOT, "docs", "discovery", "cloudflare-candidates.md");
const TOOLS = path.join(ROOT, "data-source", "tools.json");

export const SOURCES = {
  awesome: {
    name: "Awesome Cloudflare Self-Hosted",
    url: "https://raw.githubusercontent.com/theoephraim/awesome-cloudflare-selfhosted/main/README.md",
    page: "https://github.com/theoephraim/awesome-cloudflare-selfhosted",
    license: "MIT（項目は CC0 の扱いで自由に利用可と明記）",
  },
  appflare: {
    name: "Appflare catalog",
    url: "https://raw.githubusercontent.com/appflare/catalog/main/index.json",
    page: "https://github.com/appflare/catalog",
    license: "Apache-2.0",
  },
};

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n, d) => {
  const i = argv.indexOf(n);
  return i === -1 ? d : argv[i + 1];
};
const NO_GITHUB = flag("--no-github");
const NO_CONFIG = flag("--no-config");
const LIMIT = Number(opt("--limit", "0"));
const MAX_REQUESTS = Number(opt("--max-requests", process.env.DISCOVERY_MAX_REQUESTS ?? "300"));
const TOKEN = process.env.GITHUB_TOKEN || process.env.DATA_FETCH_TOKEN || "";

const readJson = (f, d) => {
  try {
    return JSON.parse(fs.readFileSync(f, "utf8"));
  } catch {
    return d;
  }
};

async function getText(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "ossalt-cloudflare-discovery" } });
      if (r.status === 404) return { ok: false, status: 404 };
      if (r.ok) return { ok: true, text: await r.text() };
      if (r.status < 500) return { ok: false, status: r.status };
    } catch {
      /* 再試行 */
    }
    await new Promise((res) => setTimeout(res, 1000 * 2 ** i));
  }
  return { ok: false, status: 0 };
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k], k);
      }
    }),
  );
  return out;
}

const CONFIG_FILES = [
  ["wrangler.toml", "toml"],
  ["wrangler.jsonc", "json"],
  ["wrangler.json", "json"],
];

/** リポジトリの直下の wrangler の設定ファイルを読む。見つからなければ null（＝確認できず） */
async function readConfig(repo) {
  for (const [file, kind] of CONFIG_FILES) {
    const url = `https://raw.githubusercontent.com/${repo}/HEAD/${file}`;
    const r = await getText(url, 2);
    if (r.ok) return { url: `https://github.com/${repo}/blob/HEAD/${file}`, ...parseWranglerConfig(r.text, kind) };
  }
  return null;
}

async function main() {
  const now = new Date().toISOString();
  const prevState = readJson(STATE, {});
  const prevOut = readJson(OUT, { candidates: [] });
  const prevByRepo = new Map(prevOut.candidates.map((c) => [c.repo, c]));
  const decisions = readJson(DECISIONS, { decisions: {} }).decisions ?? {};
  const toolsRaw = readJson(TOOLS, []);
  const tools = Array.isArray(toolsRaw) ? toolsRaw : toolsRaw.tools;
  const toolById = new Map(tools.map((t) => [t.id, t]));
  const toolIndex = indexTools(tools);

  /* ---- 収集 ---- */
  const errors = [];
  const entries = [];
  const aw = await getText(SOURCES.awesome.url);
  if (aw.ok) for (const item of parseAwesomeReadme(aw.text)) entries.push({ source: "awesome", item });
  else errors.push(`awesome: 取得失敗（${aw.status}）`);
  const af = await getText(SOURCES.appflare.url);
  if (af.ok) {
    try {
      for (const item of parseAppflareIndex(JSON.parse(af.text))) entries.push({ source: "appflare", item });
    } catch (e) {
      errors.push(`appflare: JSON の解析に失敗（${e.message}）`);
    }
  } else errors.push(`appflare: 取得失敗（${af.status}）`);
  if (entries.length === 0) {
    // 収集元がどちらも取れないときは、前回の結果を消さずに止める
    console.error("収集元をどちらも取得できませんでした。前回の結果をそのまま残します。", errors);
    process.exit(1);
  }
  const rawCount = { awesome: entries.filter((e) => e.source === "awesome").length, appflare: entries.filter((e) => e.source === "appflare").length };

  /* ---- GitHub API（任意） ---- */
  const client = createGitHubClient({
    token: TOKEN,
    etagCache: readJson(ETAG_CACHE, {}),
    maxRequests: MAX_REQUESTS,
  });
  const useGithub = !NO_GITHUB && Boolean(TOKEN);
  let merged = mergeCandidates(entries);
  let uniqueRepos = merged.length;
  if (LIMIT) merged = merged.slice(0, LIMIT);
  const facts = new Map();
  let budgetNote = null;
  if (useGithub) {
    for (const c of merged) {
      try {
        const r = await fetchRepoFacts(client, c.repo);
        if (r.ok) facts.set(c.repo, r.facts);
      } catch (e) {
        if (e instanceof BudgetExceeded) {
          budgetNote = e.message;
          break;
        }
        throw e;
      }
    }
    // 名前の変更・移転を反映して、もう一度まとめる（旧名と新名が別々に載っていても1件にする）
    const moved = new Map();
    for (const [repo, f] of facts) if (f.full_name && f.full_name !== repo) moved.set(repo, f.full_name);
    if (moved.size) {
      merged = mergeCandidates(entries, moved);
      uniqueRepos = merged.length;
      if (LIMIT) merged = merged.slice(0, LIMIT);
      for (const [oldRepo, newRepo] of moved) if (!facts.has(newRepo)) facts.set(newRepo, facts.get(oldRepo));
    }
  }

  /* ---- 設定ファイルの確認 ---- */
  const configs = new Map();
  if (!NO_CONFIG) {
    const res = await pool(merged, 6, (c) => readConfig(c.repo));
    merged.forEach((c, i) => res[i] && configs.set(c.repo, res[i]));
  }

  /* ---- 候補の組み立て ---- */
  const repoIdIndex = new Map(); // 掲載データに GitHub のリポジトリIDが入ったら、ここで使う
  const candidates = merged.map((c) => {
    const aw = c.sources.find((s) => s.source === "awesome")?.item;
    const ap = c.sources.find((s) => s.source === "appflare")?.item;
    const gh = facts.get(c.repo);
    const cfg = configs.get(c.repo);
    const awSrc = SOURCES.awesome.page;
    const apSrc = ap ? `https://appflare.dev/apps/${ap.appflare_slug}/` : null;
    const ghSrc = `https://api.github.com/repos/${c.repo}`;
    const unk = (v = null) => field(v, null, now, "unknown");

    const f = {};
    f.name = aw ? field(aw.name, awSrc, now, "claimed") : ap?.name ? field(ap.name, apSrc, now, "claimed") : unk();
    f.description = gh?.description
      ? field(gh.description, ghSrc, now, "api")
      : aw?.replaces_text
        ? field(aw.replaces_text, awSrc, now, "claimed")
        : ap?.tagline
          ? field(ap.tagline, apSrc, now, "claimed")
          : unk();
    f.license = gh?.license_spdx
      ? field(gh.license_spdx, ghSrc, now, "api")
      : ap?.license
        ? field(ap.license, apSrc, now, "claimed")
        : aw?.license && aw.license !== "unlicensed"
          ? field(aw.license, awSrc, now, "claimed")
          : unk();
    f.canonical_repo = gh?.full_name ? field(gh.full_name, ghSrc, now, "api") : unk();
    f.github_repo_id = gh?.id != null ? field(gh.id, ghSrc, now, "api") : unk();
    for (const [k, v] of [
      ["stars", gh?.stars],
      ["forks", gh?.forks],
      ["pushed_at", gh?.pushed_at],
      ["latest_release_at", gh?.latest_release_at],
      ["archived", gh?.archived],
      ["homepage", gh?.homepage],
      ["language", gh?.language],
    ]) {
      f[k] = v !== undefined && v !== null ? field(v, ghSrc, now, "api") : unk();
    }
    const claimedFeatures = [...new Set([...(aw?.features ?? []), ...(ap?.features ?? [])])].sort();
    f.cloudflare_features = cfg
      ? field(cfg.features, cfg.url, now, "verified")
      : claimedFeatures.length
        ? field(claimedFeatures, ap ? apSrc : awSrc, now, "claimed")
        : unk();
    f.cloudflare_features_claimed = claimedFeatures.length ? field(claimedFeatures, ap ? apSrc : awSrc, now, "claimed") : unk();
    f.cloudflare_runtime = cfg
      ? field(cfg.workers ? "workers" : cfg.pages ? "pages" : "config_only", cfg.url, now, "verified")
      : unk();
    f.workers_paid_required = ap?.plan ? field(ap.plan === "paid", apSrc, now, "claimed") : unk();
    f.cloudflare_requirements = ap ? field(ap.requires, apSrc, now, "claimed") : unk();
    // README を読んで外部のAPI・有料サービスへの依存を調べるのは Phase 2（AI の下書き）で行う
    f.external_dependencies = unk();
    f.replaces = aw?.replaces_text || ap?.alternative_to?.length
      ? field({ text: aw?.replaces_text ?? null, products: ap?.alternative_to ?? [] }, aw ? awSrc : apSrc, now, "claimed")
      : unk();
    f.deploy_methods = field(
      [...(aw?.one_click_deploy ? ["cloudflare_deploy_button"] : []), ...(ap ? ["appflare"] : []), ...(cfg ? ["wrangler"] : [])].sort(),
      cfg?.url ?? (ap ? apSrc : awSrc),
      now,
      cfg ? "verified" : "claimed",
    );
    f.appflare = ap ? field({ slug: ap.appflare_slug, last_verified: ap.last_verified }, apSrc, now, "claimed") : unk();
    f.source_category = aw?.category ? field(aw.category, awSrc, now, "claimed") : unk();

    const match = matchExisting(c, toolIndex, repoIdIndex, gh?.id ?? null);
    const tool = match ? toolById.get(match.tool_id) : null;
    const diffs = tool ? diffExisting(tool, { license: f.license.status === "api" ? f.license : null, archived: f.archived, canonical_repo: f.canonical_repo.status === "api" ? f.canonical_repo : null }) : [];

    let cand = {
      repo: c.repo,
      repo_aliases: c.aliases,
      sources: [...new Set(c.sources.map((s) => s.source))].sort(),
      kind: tool ? "existing" : "new",
      matched_tool_id: tool?.id ?? null,
      matched_by: match?.by ?? null,
      fields: f,
      first_seen: now,
    };
    cand = carryOverFetchedAt(cand, prevByRepo.get(c.repo));
    const issues = qualityIssues(cand);
    const blocked = issues.filter((x) => BLOCKING_ISSUES.has(x));
    const decision = decisions[c.repo] ?? null;
    return {
      ...cand,
      diffs,
      quality: { issues, blocking: blocked },
      review: {
        state: decision?.state ?? (tool ? (diffs.length ? "update_review" : "no_change") : blocked.length ? "blocked" : "needs_review"),
        note: decision?.note ?? null,
      },
    };
  });

  /* ---- 出力 ---- */
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(MD), { recursive: true });
  const out = {
    sources: Object.values(SOURCES).map(({ name, page, license }) => ({ name, page, license })),
    candidates,
  };
  const text = stableStringify(out);
  const changed = !fs.existsSync(OUT) || fs.readFileSync(OUT, "utf8") !== text;
  if (changed) fs.writeFileSync(OUT, text);

  const count = (pred) => candidates.filter(pred).length;
  const summary = {
    raw_entries: rawCount,
    candidates: candidates.length,
    new: count((c) => c.kind === "new"),
    existing: count((c) => c.kind === "existing"),
    // 2つの収集元に同じリポジトリが載っていた（または移転前後の名前で載っていた）ため、1件にまとめた数
    duplicates_merged: entries.length - uniqueRepos,
    needs_review: count((c) => c.review.state === "needs_review"),
    blocked: count((c) => c.review.state === "blocked"),
    update_review: count((c) => c.review.state === "update_review"),
    config_verified: count((c) => c.fields.cloudflare_features.status === "verified"),
    github_enriched: count((c) => c.fields.github_repo_id.status === "api"),
  };
  const state = {
    last_run_at: now,
    last_changed_at: changed ? now : (prevState.last_changed_at ?? now),
    summary,
    github: { used: useGithub, ...client.stats, budget_stopped: budgetNote, max_requests: MAX_REQUESTS },
    errors,
  };
  if (useGithub) fs.writeFileSync(ETAG_CACHE, JSON.stringify(client.etagCache));
  fs.writeFileSync(STATE, stableStringify(state));
  if (changed) fs.writeFileSync(MD, renderMarkdown(candidates, summary));
  console.log(JSON.stringify({ changed, summary, github: state.github.requests ?? 0, errors }, null, 2));
}

function renderMarkdown(cands, s) {
  const row = (c) => {
    const f = c.fields;
    const feats = f.cloudflare_features.value?.join(", ") ?? "—";
    return `| [${f.name.value ?? c.repo}](https://github.com/${c.repo}) | ${f.license.value ?? "未確認"}（${f.license.status}） | ${feats}（${f.cloudflare_features.status}） | ${f.workers_paid_required.value === true ? "要" : f.workers_paid_required.value === false ? "不要" : "未確認"} | ${c.quality.issues.join(", ") || "—"} |`;
  };
  const table = (list) =>
    ["| プロジェクト | ライセンス | Cloudflare の機能 | Workers Paid | 確認が必要な点 |", "|---|---|---|---|---|", ...list.map(row)].join("\n");
  const by = (st) => cands.filter((c) => c.review.state === st);
  return `# Cloudflare で動くOSSの掲載候補（自動収集）

このファイルは \`scripts/discover-cloudflare.mjs\` が作ります。**ここに載っていても、サイトには公開されません。**
掲載するかは人が決め、「ツール追加」ワークフローで追加します（手順：docs/discovery/CLOUDFLARE_DISCOVERY.md）。

状態の意味：verified＝プロジェクト自身の設定ファイルで確認／api＝GitHub API／claimed＝第三者の一覧の記載／unknown＝未確認（「非対応」ではない）

- 候補 ${s.candidates}件（新規 ${s.new}件・掲載済み ${s.existing}件）
- 審査待ち ${s.needs_review}件・公開できない問題あり ${s.blocked}件・掲載済みで差分あり ${s.update_review}件
- 設定ファイルで機能を確認できた ${s.config_verified}件・GitHub API で補完 ${s.github_enriched}件

## 審査待ち（新規）

${table(by("needs_review"))}

## 掲載済みで、データに差分があるもの

${by("update_review").map((c) => `- ${c.matched_tool_id}（${c.repo}）：${c.diffs.map((d) => `${d.field} ${JSON.stringify(d.ossalt)} → ${JSON.stringify(d.observed)}`).join("、")}`).join("\n") || "なし"}

## 公開できない問題があるもの（ライセンス不明・OSI以外・アーカイブ済みなど）

${table(by("blocked"))}

## 掲載済み（差分なし）

${by("no_change").map((c) => `- ${c.matched_tool_id}（${c.repo}）`).join("\n") || "なし"}
`;
}

await main();
