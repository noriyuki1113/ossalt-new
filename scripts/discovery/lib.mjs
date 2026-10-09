/**
 * Cloudflare OSS Discovery：純粋関数（ネットワークに触れない。テストは scripts/discovery.test.mjs）
 *
 * 流れ：収集（sources）→ 正規化 → 重複の統合 → 既存の掲載データとの照合 → 品質の確認
 * 設計：docs/discovery/CLOUDFLARE_DISCOVERY.md
 *
 * すべての項目を「値・出典・取得日時・確認の状態」の組（Field）で持つ。
 *   status:
 *     verified … このシステムがプロジェクト自身のファイル（wrangler の設定など）を読んで確かめた
 *     api      … GitHub API の値（リポジトリの持ち主が設定した情報）
 *     claimed  … 第三者の一覧（Awesome Cloudflare Self-Hosted・Appflare のカタログ）の記載
 *     unknown  … 確かめられなかった（「無い」「非対応」という意味ではない）
 */

export const FIELD_STATUS = ["verified", "api", "claimed", "unknown"];

/** Cloudflare の機能（バインディング）。表記ゆれを内部の名前にそろえる */
export const CF_FEATURES = {
  d1: ["d1", "d1_databases"],
  r2: ["r2", "r2_buckets"],
  kv: ["kv", "kv_namespaces"],
  durable_objects: ["durable objects", "durable-objects", "durable_objects"],
  workers_ai: ["workers ai", "workers-ai", "ai"],
  queues: ["queues", "queue"],
  analytics_engine: ["analytics engine", "analytics-engine", "analytics_engine_datasets"],
  cron: ["cron", "crons", "triggers"],
  workflows: ["workflows"],
  hyperdrive: ["hyperdrive"],
  browser_rendering: ["browser rendering", "browser-rendering", "browser"],
  vectorize: ["vectorize"],
  email_routing: ["email routing", "email-routing", "send_email", "email"],
  pipelines: ["pipelines"],
  access: ["access"],
  images: ["images"],
};

const ALIAS_TO_FEATURE = new Map(
  Object.entries(CF_FEATURES).flatMap(([k, aliases]) => aliases.map((a) => [a, k])),
);

/** 表記（「Durable Objects」など）を内部の名前に。知らないものは null */
export function normalizeFeature(label) {
  const k = String(label ?? "").trim().toLowerCase();
  return ALIAS_TO_FEATURE.get(k) ?? null;
}

export function field(value, source, fetchedAt, status) {
  if (!FIELD_STATUS.includes(status)) throw new Error(`不明な status: ${status}`);
  return { value, source, fetched_at: fetchedAt, status };
}

/**
 * GitHub のリポジトリの表記を「owner/repo」（小文字）にそろえる。
 * https://github.com/Owner/Repo.git/ ・ github.com/owner/repo/tree/main ・ owner/repo などを受け付ける。
 * GitHub 以外・形式が違うものは null。
 */
export function normalizeRepo(input) {
  if (!input || typeof input !== "string") return null;
  let s = input.trim();
  s = s.replace(/^git\+/, "").replace(/^(https?:\/\/)?(www\.)?github\.com\//i, "");
  if (/^[a-z]+:\/\//i.test(s)) return null; // GitHub 以外の URL
  s = s.replace(/[?#].*$/, "");
  const parts = s.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/i, "");
  const ok = /^[A-Za-z0-9-]{1,39}$/.test(owner) && /^[A-Za-z0-9._-]{1,100}$/.test(repo);
  return ok ? `${owner}/${repo}`.toLowerCase() : null;
}

/* ------------------------------------------------------------------ */
/* 収集元 1：Awesome Cloudflare Self-Hosted の README（表）              */
/* ------------------------------------------------------------------ */

/**
 * README の表を読む。1行 = 1プロジェクト。
 * 例: | **[Name](https://github.com/o/r)**<br><img alt="stars" …>&nbsp;<img alt="MIT" …> | 説明<br>D1 · R2 · Cron |
 */
export function parseAwesomeReadme(markdown) {
  const out = [];
  let category = null;
  let inEntries = false;
  for (const line of String(markdown).split(/\r?\n/)) {
    if (line.includes("BEGIN ENTRIES")) inEntries = true;
    if (line.includes("END ENTRIES")) inEntries = false;
    if (!inEntries) continue;
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      category = h[1];
      continue;
    }
    const m = line.match(/^\|\s*\*\*\[([^\]]+)\]\(([^)]+)\)\*\*(.*?)\|(.*)\|\s*$/);
    if (!m) continue;
    const [, name, url, badges, rest] = m;
    const repo = normalizeRepo(url);
    if (!repo) continue;
    const licAlt = [...badges.matchAll(/<img alt="([^"]+)"/g)].map((x) => x[1]).filter((a) => a !== "stars");
    const license = licAlt[0] ?? null;
    const [descRaw, bindingsRaw = ""] = rest.split("<br>");
    const labels = bindingsRaw
      .split("·")
      .map((x) => x.replace(/⚡.*$/, "").trim())
      .filter(Boolean);
    const features = [...new Set(labels.map(normalizeFeature).filter(Boolean))].sort();
    out.push({
      repo,
      name: name.trim(),
      category,
      replaces_text: descRaw.trim(),
      license: license ? license.replace(/^⚠\s*/, "") : null,
      license_warning: Boolean(license && license.startsWith("⚠")),
      features,
      one_click_deploy: /⚡/.test(bindingsRaw),
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 収集元 2：Appflare のカタログ（index.json）                           */
/* ------------------------------------------------------------------ */

export function parseAppflareIndex(json) {
  const apps = Array.isArray(json?.apps) ? json.apps : [];
  return apps
    .map((a) => {
      const repo = normalizeRepo(a.repo);
      if (!repo) return null;
      const features = [
        ...new Set([...(a.services ?? []), ...(a.requires ?? [])].map(normalizeFeature).filter(Boolean)),
      ].sort();
      return {
        repo,
        name: a.name ?? null,
        tagline: a.tagline ?? null,
        appflare_slug: a.slug ?? null,
        license: a.license && a.license !== "NONE" ? a.license : null,
        license_note: a.licenseNote ?? null,
        plan: a.plan ?? null, // "free" | "paid"（Workers Paid が必要）
        requires: [...(a.requires ?? [])].sort(),
        features,
        alternative_to: [...(a.alternativeTo ?? [])],
        categories: [...(a.categories ?? [])],
        last_verified: a.lastVerified ?? null,
      };
    })
    .filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* wrangler の設定ファイル（プロジェクト自身のファイル）からの確認            */
/* ------------------------------------------------------------------ */

/**
 * wrangler.toml / wrangler.json(c) の本文から、使っているバインディングを読む。
 * 文字列の中の「//」を壊さないよう、行頭のコメントだけを除く簡易な解析。
 */
export function parseWranglerConfig(text, kind /* "toml" | "json" */) {
  const src = String(text ?? "");
  const lines = src
    .split(/\r?\n/)
    .filter((l) => !(kind === "toml" ? /^\s*#/ : /^\s*\/\//).test(l))
    .join("\n");
  const found = new Set();
  const has = (re) => re.test(lines);
  if (kind === "toml") {
    if (has(/^\s*\[\[\s*d1_databases\s*\]\]/m)) found.add("d1");
    if (has(/^\s*\[\[\s*r2_buckets\s*\]\]/m)) found.add("r2");
    if (has(/^\s*(\[\[\s*kv_namespaces\s*\]\]|kv_namespaces\s*=)/m)) found.add("kv");
    if (has(/^\s*\[\[?\s*durable_objects(\.bindings)?\s*\]\]?/m) || has(/^\s*durable_objects\s*=/m))
      found.add("durable_objects");
    if (has(/^\s*\[\s*ai\s*\]/m)) found.add("workers_ai");
    if (has(/^\s*\[\[\s*queues\.(producers|consumers)\s*\]\]/m)) found.add("queues");
    if (has(/^\s*\[\[\s*analytics_engine_datasets\s*\]\]/m)) found.add("analytics_engine");
    if (has(/^\s*crons\s*=\s*\[\s*"/m)) found.add("cron");
    if (has(/^\s*\[\[\s*workflows\s*\]\]/m)) found.add("workflows");
    if (has(/^\s*\[\[\s*hyperdrive\s*\]\]/m)) found.add("hyperdrive");
    if (has(/^\s*\[\s*browser\s*\]/m)) found.add("browser_rendering");
    if (has(/^\s*\[\[\s*vectorize\s*\]\]/m)) found.add("vectorize");
    if (has(/^\s*\[\[\s*send_email\s*\]\]/m)) found.add("email_routing");
  } else {
    const key = (k) => new RegExp(`"${k}"\\s*:`).test(lines);
    if (key("d1_databases")) found.add("d1");
    if (key("r2_buckets")) found.add("r2");
    if (key("kv_namespaces")) found.add("kv");
    if (key("durable_objects")) found.add("durable_objects");
    if (key("ai")) found.add("workers_ai");
    if (key("queues")) found.add("queues");
    if (key("analytics_engine_datasets")) found.add("analytics_engine");
    if (/"crons"\s*:\s*\[\s*"/.test(lines)) found.add("cron");
    if (key("workflows")) found.add("workflows");
    if (key("hyperdrive")) found.add("hyperdrive");
    if (key("browser")) found.add("browser_rendering");
    if (key("vectorize")) found.add("vectorize");
    if (key("send_email")) found.add("email_routing");
  }
  const workers = /^\s*(main\s*=|"main"\s*:)/m.test(lines);
  const pages = /^\s*(pages_build_output_dir\s*=|"pages_build_output_dir"\s*:)/m.test(lines);
  return { features: [...found].sort(), workers, pages };
}

/* ------------------------------------------------------------------ */
/* 統合・照合・品質                                                      */
/* ------------------------------------------------------------------ */

const OSI_LIKE = new Set([
  "MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "0BSD", "MPL-2.0", "Unlicense",
  "GPL-2.0", "GPL-2.0-only", "GPL-2.0-or-later", "GPL-3.0", "GPL-3.0-only", "GPL-3.0-or-later",
  "AGPL-3.0", "AGPL-3.0-only", "AGPL-3.0-or-later", "LGPL-2.1", "LGPL-2.1-only", "LGPL-2.1-or-later",
  "LGPL-3.0", "LGPL-3.0-only", "LGPL-3.0-or-later", "EUPL-1.2", "Zlib", "BSL-1.0", "CC0-1.0",
]);

/** OSI が承認したライセンス（主なもの）か。ソース公開型（BUSL・FSL・PolyForm など）や不明は false */
export function isOsiLicense(spdx) {
  return Boolean(spdx) && OSI_LIKE.has(spdx);
}

/**
 * 同じリポジトリの記載をまとめて1件の候補にする。
 * entries: [{ source: "awesome"|"appflare", url, fetchedAt, item }]
 * moved: Map<旧 owner/repo, 新 owner/repo>（GitHub API で分かった名前の変更・移転）
 */
export function mergeCandidates(entries, moved = new Map()) {
  const byKey = new Map();
  for (const e of entries) {
    const canonical = moved.get(e.item.repo) ?? e.item.repo;
    if (!byKey.has(canonical)) byKey.set(canonical, { repo: canonical, aliases: new Set(), sources: [] });
    const c = byKey.get(canonical);
    if (canonical !== e.item.repo) c.aliases.add(e.item.repo);
    c.sources.push(e);
  }
  return [...byKey.values()]
    .map((c) => ({ repo: c.repo, aliases: [...c.aliases].sort(), sources: c.sources }))
    .sort((a, b) => a.repo.localeCompare(b.repo));
}

/** 掲載データ（data-source/tools.json）の索引：owner/repo → ツールの id。aliases（旧リポジトリ名）も含める */
export function indexTools(tools) {
  const idx = new Map();
  for (const t of tools) {
    const r = normalizeRepo(t.github_url);
    if (r) idx.set(r, t.id);
    for (const a of t.aliases ?? []) {
      const ar = normalizeRepo(a);
      if (ar && !idx.has(ar)) idx.set(ar, t.id);
    }
  }
  return idx;
}

/** 既存のツールと一致するか（正規化した owner/repo・移転前の名前・GitHub のリポジトリIDの順） */
export function matchExisting(candidate, toolIndex, repoIdIndex = new Map(), repoId = null) {
  if (repoId != null && repoIdIndex.has(repoId)) return { tool_id: repoIdIndex.get(repoId), by: "github_repo_id" };
  if (toolIndex.has(candidate.repo)) return { tool_id: toolIndex.get(candidate.repo), by: "repo" };
  for (const a of candidate.aliases) if (toolIndex.has(a)) return { tool_id: toolIndex.get(a), by: "renamed_repo" };
  return null;
}

/** 既存のツールとの差分（更新の候補）。観測した値が取れていない項目は比べない */
export function diffExisting(tool, observed) {
  const diffs = [];
  const cmp = (key, ours, theirs, src) => {
    if (theirs === undefined || theirs === null) return;
    if ((ours ?? null) !== theirs) diffs.push({ field: key, ossalt: ours ?? null, observed: theirs, source: src });
  };
  cmp("license", tool.license, observed.license?.value ?? null, observed.license?.source);
  cmp("github_archived", tool.github_archived, observed.archived?.value ?? null, observed.archived?.source);
  if (observed.canonical_repo && normalizeRepo(tool.github_url) !== observed.canonical_repo.value) {
    diffs.push({
      field: "github_url",
      ossalt: tool.github_url,
      observed: `https://github.com/${observed.canonical_repo.value}`,
      source: observed.canonical_repo.source,
    });
  }
  return diffs;
}

/**
 * 公開してよい状態かの確認（Phase 1 では、すべての候補を「未承認」として扱う。
 * ここは「承認の前に人が見るべき問題」の一覧を作るだけ）。
 */
export function qualityIssues(c) {
  const issues = [];
  const lic = c.fields.license?.value ?? null;
  if (!lic) issues.push("license_unknown");
  else if (!isOsiLicense(lic)) issues.push("license_not_osi");
  if (c.fields.archived?.value === true) issues.push("archived");
  if (c.fields.cloudflare_features?.status === "unknown") issues.push("cloudflare_bindings_unverified");
  if (c.fields.description?.value == null) issues.push("no_description");
  if (c.fields.workers_paid_required?.value === true) issues.push("needs_workers_paid");
  if ((c.fields.cloudflare_requirements?.value ?? []).some((r) => r !== "r2")) issues.push("has_extra_requirements");
  return issues;
}

/** 落としてはいけない（公開を止める）問題 */
export const BLOCKING_ISSUES = new Set(["license_unknown", "license_not_osi", "archived", "no_description"]);

/**
 * 前回の結果を引き継いで、値が変わっていない項目は取得日時を前回のままにする（冪等性）。
 * 同じ入力で何度実行しても、出力のファイルが変わらないようにするため。
 */
export function carryOverFetchedAt(next, prev) {
  if (!prev) return next;
  const out = { ...next, fields: { ...next.fields } };
  for (const [k, f] of Object.entries(next.fields)) {
    const p = prev.fields?.[k];
    if (p && stableStringify(p.value) === stableStringify(f.value) && p.status === f.status && p.source === f.source) {
      out.fields[k] = { ...f, fetched_at: p.fetched_at };
    }
  }
  if (prev.first_seen) out.first_seen = prev.first_seen;
  return out;
}

/** 出力用の安定した JSON（キーの順を固定） */
export function stableStringify(v) {
  return JSON.stringify(sortKeys(v), null, 2) + "\n";
}
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])]));
  }
  return v;
}
