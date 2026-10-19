import test from "node:test";
import assert from "node:assert/strict";
import { createGitHubClient } from "./discovery/github.mjs";
import { stableStringify } from "./discovery/lib.mjs";
import {
  draftProblems, extractPageFacts, formatAddToolsLine, licensesAgree, parseOpenAltReadme, parseStarHint,
} from "./discovery/openalt.mjs";
import { runOpenAltDiscovery } from "./discovery/openalt-run.mjs";

const BT = "`";
const item = (name, slug, desc, lic, stars) =>
  `- **[${name}](https://openalternative.co/${slug})** - ${desc}${lic ? ` ${BT}${lic}${BT}` : ""}${stars ? ` ${BT}⭐${stars}${BT}` : ""}`;
const README = [
  "## Contents", "- [x](#y)",
  "## Productivity & Utilities", "### Notes",
  item("Alpha", "alpha", "Notes app", "MIT", "1.5K"),
  item("Immich", "immich", "Photos", "AGPL-3.0", "60K"),
  item("Beta Tool", "beta", "Has repo already listed under another name", "MIT", "1K"),
  item("Gamma", "gamma", "Ambiguous page", "MIT", "2K"),
  item("Delta", "delta", "Archived project", "MIT", "3K"),
  item("Eps", "eps", "Renamed repo", "MIT", "4K"),
  item("Zeta", "zeta", "Excluded earlier", "MIT", "5K"),
  item("Eta", "eta", "No license", null, "6K"),
  item("Alpha again", "alpha", "duplicate slug", null, null),
  "## Sponsors", item("Spons", "spons", "ignore", null, null),
].join("\n");

const page = (...repos) => `<html>Alternative to Notion, Evernote ${repos.map((r) => `<a href="https://github.com/${r}">x</a>`).join("")}<a href="https://example.org/">site</a></html>`;
const PAGES = {
  "https://openalternative.co/alpha": page("acme/alpha"),
  "https://openalternative.co/beta": page("acme/beta"),
  "https://openalternative.co/gamma": page("a/one", "b/two"),
  "https://openalternative.co/delta": page("acme/delta"),
  "https://openalternative.co/eps": page("old/eps"),
  "https://openalternative.co/eta": page("acme/eta"),
};
const REPOS = {
  "acme/alpha": { id: 1, full_name: "acme/alpha", description: "Alpha notes", license: { spdx_id: "AGPL-3.0" }, stargazers_count: 1600, forks_count: 10, pushed_at: "2026-10-01T00:00:00Z", archived: false, homepage: "https://alpha.example.com" },
  "acme/beta": { id: 2, full_name: "acme/beta", description: "Beta", license: { spdx_id: "MIT" }, stargazers_count: 1000, pushed_at: "2026-10-01T00:00:00Z", archived: false },
  "a/one": { id: 3, full_name: "a/one", description: "One", license: { spdx_id: "MIT" }, stargazers_count: 2000, pushed_at: "2026-10-01T00:00:00Z", archived: false },
  "acme/delta": { id: 4, full_name: "acme/delta", description: "Delta", license: { spdx_id: "MIT" }, stargazers_count: 3000, pushed_at: "2026-10-01T00:00:00Z", archived: true },
  "old/eps": { id: 5, full_name: "new/eps-renamed", description: "Eps", license: { spdx_id: "MIT" }, stargazers_count: 4000, pushed_at: "2026-10-01T00:00:00Z", archived: false },
  "acme/eta": { id: 6, full_name: "acme/eta", description: "Eta", license: { spdx_id: "NOASSERTION" }, stargazers_count: 6000, pushed_at: "2024-01-01T00:00:00Z", archived: false },
};
const TOOLS = [
  { id: "immich", name: "Immich", github_url: "https://github.com/immich-app/immich" },
  { id: "beta-notes", name: "Beta Notes", github_url: "https://github.com/Acme/Beta" }, // 名前は違うが同じ公式リポジトリ
  { id: "epsilon", name: "Epsilon", github_url: "https://github.com/new/eps-renamed" },
];

function makeClient(log = []) {
  const fetchImpl = async (url) => {
    log.push(url);
    const m = url.match(/^https:\/\/api\.github\.com\/repos\/([^/]+\/[^/]+)(\/releases\/latest)?$/);
    const repo = m?.[1]?.toLowerCase();
    const data = repo && (REPOS[repo] ?? null);
    const headers = new Map([["x-ratelimit-remaining", "4000"]]);
    if (!data || m[2]) return { ok: false, status: 404, headers: { get: (k) => headers.get(k) ?? null } };
    return { ok: true, status: 200, headers: { get: (k) => headers.get(k) ?? null }, json: async () => data };
  };
  return createGitHubClient({ token: "t", fetchImpl, sleep: async () => {} });
}

const base = (over = {}) => ({
  now: "2026-10-19T00:00:00.000Z", readme: README, tools: TOOLS, excludedIds: new Set(["zeta"]),
  categories: new Set(["note-docs"]), getPage: async (u) => (PAGES[u] ? { ok: true, text: PAGES[u] } : { ok: false, status: 404 }),
  client: makeClient(), useGithub: true, decisions: {}, prevQueue: { candidates: [], skipped: {} }, maxNew: 40, ...over,
});

test("README の解析：セクションの除外・slug の重複除去・一覧の記載はヒントとして保持", () => {
  const e = parseOpenAltReadme(README);
  assert.equal(e.length, 8); // Contents・Sponsors を除き、alpha の重複を1件に
  assert.equal(e[0].slug, "alpha");
  assert.equal(e[0].license_hint, "MIT");
  assert.equal(e[0].stars_hint, "1.5K");
  assert.equal(parseStarHint("1.5K"), 1500);
  assert.equal(parseStarHint("⭐?"), null);
});

test("ページの読み取り：リポジトリが複数ならあいまいとして決めない", () => {
  assert.equal(extractPageFacts(page("acme/x")).confidence, "single");
  assert.equal(extractPageFacts(page("a/one", "b/two")).confidence, "ambiguous");
  assert.equal(extractPageFacts(page("a/one", "a/one", "a/one", "b/two")).confidence, "majority");
  assert.equal(extractPageFacts("<html>none</html>").confidence, "none");
  assert.equal(extractPageFacts(page("posthog/posthog")).repo, null); // 見本のリポジトリは除く
  assert.equal(extractPageFacts(page("acme/x")).competitor, "Notion");
});

test("重複の確認：名前・公式リポジトリ（大文字小文字違い）・GitHub上で改名されたリポジトリ・除外リスト", async () => {
  const { queue, summary } = await runOpenAltDiscovery(base());
  const skipped = Object.fromEntries(Object.entries(queue.skipped).map(([k, v]) => [k, v.reason]));
  assert.equal(skipped.immich, "listed_by_name");
  assert.equal(skipped.zeta, "excluded_in_overrides");
  assert.equal(skipped.beta, "listed_by_repo"); // 名前は違うが、掲載済みの公式リポジトリと同じ
  assert.equal(queue.skipped.beta.tool_id, "beta-notes");
  assert.equal(skipped.eps, "listed_by_repo"); // README の旧名 → GitHub が返した新しい名前で掲載済みと一致
  assert.equal(queue.skipped.eps.by, "repo");
  assert.deepEqual(queue.candidates.map((c) => c.slug), ["alpha", "delta", "eta", "gamma"]);
  assert.equal(summary.skipped, 4);
});

test("外部の一覧の値は確認済みにならない：ライセンスは GitHub の値だけが api、一覧の記載は claimed のまま", async () => {
  const { queue } = await runOpenAltDiscovery(base());
  const a = queue.candidates.find((c) => c.slug === "alpha");
  assert.equal(a.fields.license.value, "AGPL-3.0");
  assert.equal(a.fields.license.status, "api");
  assert.equal(a.fields.license_claimed.value, "MIT");
  assert.equal(a.fields.license_claimed.status, "claimed");
  assert.equal(a.fields.stars_claimed.status, "claimed");
  assert.equal(a.fields.replaces_claimed.status, "claimed");
  assert.ok(a.quality.issues.includes("license_mismatch_with_list")); // 一覧は MIT、公式は AGPL
  assert.equal(a.review.state, "needs_review");
});

test("GitHub を使えないとき：ライセンスなどは unknown のまま、公式リポジトリ未確認として止める", async () => {
  const { queue } = await runOpenAltDiscovery(base({ useGithub: false }));
  const a = queue.candidates.find((c) => c.slug === "alpha");
  assert.equal(a.fields.license.status, "unknown");
  assert.equal(a.fields.license.value, null);
  assert.ok(a.quality.blocking.includes("repo_unverified"));
  assert.equal(a.review.state, "blocked");
});

test("止める問題：あいまいなリポジトリ・アーカイブ・ライセンス不明・1年以上更新なし", async () => {
  const { queue } = await runOpenAltDiscovery(base());
  const by = Object.fromEntries(queue.candidates.map((c) => [c.slug, c]));
  assert.ok(by.gamma.quality.blocking.includes("repo_ambiguous"));
  assert.ok(by.delta.quality.blocking.includes("archived"));
  assert.ok(by.eta.quality.blocking.includes("license_unknown"));
  assert.ok(by.eta.quality.issues.includes("stale_over_1y"));
  for (const s of ["gamma", "delta", "eta"]) assert.equal(by[s].review.state, "blocked");
});

test("再実行しても結果は変わらない（冪等）／ 1回で処理する数に上限があり、残りは次回に続く", async () => {
  const first = await runOpenAltDiscovery(base({ maxNew: 2 }));
  assert.ok(first.summary.unprocessed > 0);
  const second = await runOpenAltDiscovery(base({ prevQueue: first.queue, maxNew: 40, now: "2026-10-19T00:00:00.000Z" }));
  assert.equal(second.summary.unprocessed, 0);
  const third = await runOpenAltDiscovery(base({ prevQueue: second.queue, maxNew: 40, now: "2026-10-20T00:00:00.000Z" }));
  assert.equal(stableStringify(third.queue), stableStringify(second.queue)); // 値が同じなら取得日時も前回のまま
});

test("承認の流れ：下書きが揃い、確認に問題がなければ『貼れる』。ブロックされた候補は承認しても貼れない。あいまいなものは運営者がリポジトリを指定すると確認される", async () => {
  const draft = { state: "approved", competitor: "Notion", category: "note-docs", description_ja: "Notionの代わりに使える、オープンソースのノートアプリ。" };
  const decisions = {
    "acme/alpha": { ...draft, id: "alpha" },
    "acme/delta": { ...draft, id: "delta" }, // アーカイブ済み：承認しても貼れない
    "openalt:gamma": { ...draft, id: "gamma", repo: "a/one" }, // あいまいなページ：運営者が公式リポジトリを指定
  };
  const { queue, summary } = await runOpenAltDiscovery(base({ decisions }));
  const by = Object.fromEntries(queue.candidates.map((c) => [c.slug, c]));
  assert.equal(by.alpha.review.ready, true);
  assert.equal(by.delta.review.state, "approved");
  assert.equal(by.delta.review.ready, false);
  assert.ok(by.delta.review.blocking.includes("archived"));
  assert.equal(by.gamma.repo, "a/one"); // GitHub API で確認された公式リポジトリ
  assert.equal(by.gamma.fields.canonical_repo.status, "api");
  assert.equal(by.gamma.review.ready, true);
  assert.equal(summary.ready, 2);
  // 下書きが足りなければ貼れない
  const r2 = await runOpenAltDiscovery(base({ decisions: { "acme/alpha": { state: "approved", id: "alpha" } } }));
  const a2 = r2.queue.candidates.find((c) => c.slug === "alpha");
  assert.equal(a2.review.ready, false);
  assert.ok(a2.review.draft_problems.length >= 3);
});

test("下書きの不備：未入力・TODO・日本語なし・区切り文字・不正なカテゴリ・掲載済みの id", () => {
  const ctx = { categories: new Set(["note-docs"]), takenIds: new Set(["immich"]) };
  assert.deepEqual(draftProblems({ id: "alpha", competitor: "Notion", category: "note-docs", description_ja: "日本語の説明です" }, ctx), []);
  assert.ok(draftProblems({}, ctx).length >= 4);
  assert.ok(draftProblems({ id: "a", competitor: "TODO_代替", category: "note-docs", description_ja: "日本語" }, ctx).some((p) => p.includes("competitor")));
  assert.ok(draftProblems({ id: "a", competitor: "N", category: "bad", description_ja: "日本語" }, ctx).some((p) => p.includes("カテゴリ")));
  assert.ok(draftProblems({ id: "a", competitor: "N", category: "note-docs", description_ja: "english only" }, ctx).some((p) => p.includes("日本語")));
  assert.ok(draftProblems({ id: "a", competitor: "N", category: "note-docs", description_ja: "日本語|区切り" }, ctx).some((p) => p.includes("区切り")));
  assert.ok(draftProblems({ id: "immich", competitor: "N", category: "note-docs", description_ja: "日本語" }, ctx).some((p) => p.includes("掲載済み")));
});

test("ツール追加の1行は7フィールド", () => {
  const line = formatAddToolsLine({ name: "Alpha", id: "alpha", competitor: "Notion", repo: "acme/alpha", officialUrl: "https://alpha.example.com", category: "note-docs", descriptionJa: "説明" });
  assert.equal(line.split("|").length, 7);
  assert.equal(licensesAgree("AGPL-3.0", "AGPL-3.0-only"), true);
  assert.equal(licensesAgree("MIT", "AGPL-3.0"), false);
  assert.equal(licensesAgree(null, "MIT"), null);
});
