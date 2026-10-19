/**
 * OpenAlternative（piotrkulpinski/open-source-alternatives）を候補の発見元にするための純粋関数。
 * ネットワークには触れない（テストは scripts/openalt-queue.test.mjs）。設計：docs/discovery/OPENALT_QUEUE.md
 *
 * 外部の一覧に書かれたライセンス・スター数・説明・代替先は、すべて「claimed（第三者の記載）」として持つ。
 * 公式リポジトリ（GitHub API）で確かめられた値だけが「api」になり、確認前に公開されることはない。
 */
import { field, isOsiLicense, normalizeRepo, qualityIssues, BLOCKING_ISSUES } from "./lib.mjs";

export const OPENALT_README_URL =
  "https://raw.githubusercontent.com/piotrkulpinski/open-source-alternatives/main/README.md";
export const OPENALT_SOURCE_NAME = "OpenAlternative（piotrkulpinski/open-source-alternatives）";

const EXCLUDED_SECTIONS = new Set(["Sponsors", "Contents", "Contributing", "Footnotes"]);

/**
 * README の一覧を読む。形式：- **[名前](https://openalternative.co/<slug>)** - 説明 `ライセンス` `⭐スター`
 * GitHub の URL は README には無い。slug で重複を除く（最初に出たものを採る）。
 */
export function parseOpenAltReadme(markdown) {
  const entries = [];
  let major = null;
  let sub = null;
  for (const line of String(markdown).split(/\r?\n/)) {
    if (line.startsWith("## ")) {
      const t = line.slice(3).trim();
      major = EXCLUDED_SECTIONS.has(t) ? null : t;
      sub = null;
      continue;
    }
    if (line.startsWith("### ")) {
      if (major) sub = line.slice(4).trim();
      continue;
    }
    if (!major || !sub || !line.startsWith("- ")) continue;
    const m = line.match(
      /^-\s+(?:\*\*)?\[([^\]]+)\]\((https:\/\/openalternative\.co\/[^)]+)\)(?:\*\*)?\s+-\s+(.+)$/,
    );
    if (!m) continue;
    const [, rawName, sourceUrl, tail] = m;
    const hints = [...tail.matchAll(/`([^`]+)`/g)].map((x) => x[1].trim());
    entries.push({
      name: rawName.trim(),
      slug: sourceUrl.replace(/\/+$/, "").split("/").pop(),
      sourceUrl,
      description: tail.replace(/\s*`[^`]+`/g, "").trim() || null,
      license_hint: hints.find((h) => !h.startsWith("⭐")) ?? null,
      stars_hint: hints.find((h) => h.startsWith("⭐"))?.replace(/^⭐\s*/, "") ?? null,
      major,
      sub,
    });
  }
  const seen = new Set();
  return entries.filter((e) => (seen.has(e.slug) ? false : (seen.add(e.slug), true))); // 同じ slug は最初の1件
}

/** ページの代替先の表記から、テンプレートの取り残し（{name} など）や不正な文字を除く。使えなければ null */
export function cleanCompetitor(value) {
  const v = String(value ?? "").trim();
  if (!v || /[{}<>\\]/.test(v) || v.length > 80) return null;
  return v;
}

/**
 * openalternative.co/<slug> のページから、公式リポジトリの手がかりと代替先を読む。
 * ページに GitHub のリンクが複数あるときは「あいまい」として人の確認に回す（多数決で決めて黙って採用しない）。
 * 戻り値：{ repo, confidence: "single" | "majority" | "ambiguous" | "none", candidates: [{repo, count}], competitor, website }
 */
export function extractPageFacts(html) {
  const text = String(html ?? "");
  const counts = new Map();
  for (const m of text.matchAll(/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/g)) {
    const repo = normalizeRepo(m[1]);
    // OpenAlternative 自身の例（ページの見本）として出てくる posthog/posthog は除く
    if (!repo || repo === "posthog/posthog") continue;
    counts.set(repo, (counts.get(repo) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const candidates = ranked.map(([repo, count]) => ({ repo, count }));
  let repo = null;
  let confidence = "none";
  if (ranked.length === 1) {
    repo = ranked[0][0];
    confidence = "single";
  } else if (ranked.length > 1) {
    // 1位が2位の2倍以上ならそれを採る（ただし「majority」として人に見せる）。そうでなければ決めない
    if (ranked[0][1] >= ranked[1][1] * 2) {
      repo = ranked[0][0];
      confidence = "majority";
    } else {
      confidence = "ambiguous";
    }
  }
  const alt = text.match(/Alternative to ([^"<.]+)/i);
  const competitor = alt ? cleanCompetitor(alt[1].split(",")[0].split(" and ")[0]) : null;
  const sites = [...text.matchAll(/https:\/\/(?!(?:[^"'\s<>]*)(?:github\.com|openalternative\.co|go\.openalternative|dm\.|influxdata))([a-z0-9.-]+\.[a-z]{2,})/g)].map((m) => `https://${m[1]}`);
  return { repo, confidence, candidates, competitor, website: sites[0] ?? null };
}

/** 一覧の「⭐1.5K」のような表記を数に（比較用。読めなければ null） */
export function parseStarHint(hint) {
  const m = String(hint ?? "").trim().match(/^([\d.,]+)\s*([KkMm]?)$/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * ({ k: 1e3, m: 1e6 }[m[2].toLowerCase()] ?? 1));
}

/** 一覧のライセンス表記と、GitHub のライセンス（SPDX）が同じものを指しているか。読み取れなければ null */
export function licensesAgree(claimed, apiSpdx) {
  if (!claimed || !apiSpdx) return null;
  const norm = (s) => String(s).toLowerCase().replace(/[-_\s]/g, "").replace(/(only|orlater)$/, "");
  return norm(claimed) === norm(apiSpdx);
}

/**
 * 候補1件を組み立てる。
 * entry：README の項目、page：extractPageFacts の結果（取れなければ null）、gh：fetchRepoFacts の facts（取れなければ null）
 */
export function buildOpenAltCandidate({ entry, page, gh, now, firstSeen = now }) {
  const repo = gh?.full_name ?? page?.repo ?? null;
  const ghSrc = repo ? `https://api.github.com/repos/${repo}` : null;
  const pageSrc = entry.sourceUrl;
  const listSrc = "https://github.com/piotrkulpinski/open-source-alternatives";
  const unk = () => field(null, null, now, "unknown");
  const f = {};
  f.name = field(entry.name, listSrc, now, "claimed");
  f.description_en = gh?.description ? field(gh.description, ghSrc, now, "api") : entry.description ? field(entry.description, listSrc, now, "claimed") : unk();
  f.description_claimed = entry.description ? field(entry.description, listSrc, now, "claimed") : unk();
  // ライセンス：公式リポジトリ（GitHub API）の値だけを「確認済み」にする。一覧の記載は別の項目に残す
  f.license = gh?.license_spdx ? field(gh.license_spdx, ghSrc, now, "api") : unk();
  f.license_claimed = entry.license_hint ? field(entry.license_hint, listSrc, now, "claimed") : unk();
  f.stars_claimed = entry.stars_hint ? field(entry.stars_hint, listSrc, now, "claimed") : unk();
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
  ]) f[k] = v != null ? field(v, ghSrc, now, "api") : unk();
  f.replaces_claimed = page?.competitor ? field(page.competitor, pageSrc, now, "claimed") : unk();
  f.source_category = field({ major: entry.major, sub: entry.sub }, listSrc, now, "claimed");
  f.repo_resolution = field(
    { method: "openalternative_page_link", confidence: page?.confidence ?? "none", candidates: page?.candidates ?? [] },
    pageSrc, now, page ? "claimed" : "unknown",
  );
  return {
    slug: entry.slug,
    repo,
    source_url: entry.sourceUrl,
    first_seen: firstSeen,
    fields: f,
  };
}

/** この候補に付ける注意（公開前に人が見る問題）。blocking は「そのままでは掲載できない」もの */
export const OPENALT_BLOCKING = new Set([...BLOCKING_ISSUES, "repo_ambiguous", "repo_unverified"]);

export function openAltIssues(c, now = new Date().toISOString()) {
  const issues = qualityIssues({ fields: { ...c.fields, description: c.fields.description_en } });
  const res = c.fields.repo_resolution?.value;
  if (!c.fields.canonical_repo || c.fields.canonical_repo.status !== "api") issues.push("repo_unverified");
  if (res?.confidence === "ambiguous" || res?.confidence === "none") issues.push("repo_ambiguous");
  else if (res?.confidence === "majority") issues.push("repo_chosen_by_majority");
  const agree = licensesAgree(c.fields.license_claimed?.value, c.fields.license?.value);
  if (agree === false) issues.push("license_mismatch_with_list");
  const pushed = c.fields.pushed_at?.value;
  if (pushed && Date.parse(now) - Date.parse(pushed) > 365 * 86400e3) issues.push("stale_over_1y");
  const claimedStars = parseStarHint(c.fields.stars_claimed?.value);
  const stars = c.fields.stars?.value;
  if (claimedStars != null && stars != null && claimedStars > 0 && (stars > claimedStars * 3 || stars < claimedStars / 3)) issues.push("stars_differ_from_list");
  return [...new Set(issues)].sort();
}

/** 運営者の判断（decisions.json）の state */
export const REVIEW_STATES = ["approved", "rejected", "hold"];

/**
 * 掲載用の下書き（日本語説明・代替SaaS・カテゴリ・id）の不足や不備。空なら「ツール追加」に貼れる。
 * decision：{ state, id, name, competitor, category, description_ja, official_url }
 */
export function draftProblems(decision, { categories, takenIds = new Set() }) {
  const p = [];
  const d = decision ?? {};
  if (!/^[a-z0-9][a-z0-9-]*$/.test(d.id ?? "")) p.push("id（小文字英数字とハイフン）が未入力か不正");
  else if (takenIds.has(d.id)) p.push(`id「${d.id}」は掲載済み`);
  if (!d.competitor || /TODO/i.test(d.competitor)) p.push("代替するSaaS（competitor）が未入力");
  if (!d.category || !categories.has(d.category)) p.push(`カテゴリ（category）が未入力か不正（${[...categories].slice(0, 4).join("・")}…のいずれか）`);
  const ja = d.description_ja ?? "";
  if (!ja || /TODO/i.test(ja)) p.push("日本語説明（description_ja）が未入力");
  else if (!/[぀-ヿ一-鿿]/.test(ja)) p.push("日本語説明に日本語が含まれていない");
  else if (/[|;\n]/.test(ja)) p.push("日本語説明に「|」「;」改行は使えません（ツール追加の区切りと衝突）");
  if (d.official_url != null && !/^https:\/\//.test(d.official_url)) p.push("official_url は https:// で始める");
  return p;
}

/** 「ツール追加」ワークフローの1行：名前|id|代替するSaaS|owner/repo|公式URL|カテゴリ|日本語説明 */
export function formatAddToolsLine({ name, id, competitor, repo, officialUrl, category, descriptionJa }) {
  return [name, id, competitor, repo, officialUrl, category, descriptionJa].map((s) => String(s).trim()).join("|");
}

export { isOsiLicense };
