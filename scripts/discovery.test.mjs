import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  BLOCKING_ISSUES,
  FIELD_STATUS,
  carryOverFetchedAt,
  diffExisting,
  field,
  indexTools,
  matchExisting,
  mergeCandidates,
  normalizeRepo,
  parseAppflareIndex,
  parseAwesomeReadme,
  parseWranglerConfig,
  qualityIssues,
  stableStringify,
} from "./discovery/lib.mjs";
import { BudgetExceeded, createGitHubClient, fetchRepoFacts, nextLink } from "./discovery/github.mjs";

const AWESOME = `
<!-- BEGIN ENTRIES -->
## Analytics

| Project | What it replaces |
| --- | --- |
| **[Counterscale](https://github.com/benvinegar/counterscale)**<br><img alt="stars" src="x">&nbsp;<img alt="MIT" src="y"> | Google Analytics alternative.<br>R2 · Analytics Engine · Cron |
| **[Odd](https://github.com/Some/Odd.git)**<br><img alt="stars" src="x">&nbsp;<img alt="⚠ unlicensed" src="y"> | Something.<br>KV · Cron · ⚡ 1-click deploy |
| **[NoBindings](https://github.com/a/b)**<br><img alt="stars" src="x">&nbsp;<img alt="Apache-2.0" src="y"> | Plain description. |

## Personal
| **[Moved](https://github.com/old-owner/moved)**<br><img alt="stars" src="x">&nbsp;<img alt="MIT" src="y"> | Moved project.<br>D1 |
<!-- END ENTRIES -->
| **[Outside](https://github.com/x/outside)**<br> | not in entries |
`;

const APPFLARE = {
  apps: [
    { slug: "counterscale", repo: "benvinegar/counterscale", name: "Counterscale", tagline: "Track visits", license: "MIT", plan: "free", requires: ["r2"], services: ["analytics-engine", "cron"], alternativeTo: ["Google Analytics"], lastVerified: "2026-10-09T00:00:00Z" },
    { slug: "paid", repo: "https://github.com/c/paid", name: "Paid", license: "NONE", plan: "paid", requires: ["email-routing", "zone"], services: ["d1"] },
    { slug: "bad", repo: "not a repo" },
  ],
};

test("リポジトリの表記を owner/repo（小文字）にそろえる。GitHub 以外は null", () => {
  for (const s of [
    "https://github.com/Owner/Repo",
    "https://www.github.com/owner/repo.git/",
    "github.com/owner/repo/tree/main/apps",
    "owner/Repo",
    "git+https://github.com/owner/repo.git",
    "https://github.com/owner/repo?tab=readme#x",
  ]) {
    assert.equal(normalizeRepo(s), "owner/repo", s);
  }
  assert.equal(normalizeRepo("https://gitlab.com/owner/repo"), null);
  assert.equal(normalizeRepo("owner"), null);
  assert.equal(normalizeRepo(null), null);
});

test("Awesome Cloudflare Self-Hosted の表を読む（カテゴリ・ライセンス・機能・1クリック）", () => {
  const items = parseAwesomeReadme(AWESOME);
  assert.equal(items.length, 4); // 一覧の外の行は読まない
  const cs = items[0];
  assert.equal(cs.repo, "benvinegar/counterscale");
  assert.equal(cs.category, "Analytics");
  assert.equal(cs.license, "MIT");
  assert.deepEqual(cs.features, ["analytics_engine", "cron", "r2"]);
  assert.equal(items[1].repo, "some/odd");
  assert.equal(items[1].license_warning, true);
  assert.equal(items[1].one_click_deploy, true);
  assert.deepEqual(items[2].features, []);
  assert.equal(items[3].category, "Personal");
});

test("Appflare のカタログを読む（有料プラン・必要な機能。不正な repo は捨てる。NONE は不明扱い）", () => {
  const items = parseAppflareIndex(APPFLARE);
  assert.equal(items.length, 2);
  assert.deepEqual(items[0].features, ["analytics_engine", "cron", "r2"]);
  assert.equal(items[1].repo, "c/paid");
  assert.equal(items[1].plan, "paid");
  assert.equal(items[1].license, null);
  assert.deepEqual(items[1].requires, ["email-routing", "zone"]);
  assert.deepEqual(parseAppflareIndex(null), []);
});

test("wrangler の設定（toml・jsonc）から機能を読む。コメントの行は数えない", () => {
  const toml = `
name = "app"
main = "src/index.ts"
# [[r2_buckets]] はコメント
[[d1_databases]]
binding = "DB"
[[kv_namespaces]]
binding = "KV"
[durable_objects]
bindings = [{ name = "ROOM", class_name = "Room" }]
[triggers]
crons = ["0 * * * *"]
[ai]
binding = "AI"
`;
  const t = parseWranglerConfig(toml, "toml");
  assert.deepEqual(t.features, ["cron", "d1", "durable_objects", "kv", "workers_ai"]);
  assert.equal(t.workers, true);
  const jsonc = `{
  // "kv_namespaces": [] はコメント
  "main": "worker.ts",
  "r2_buckets": [{ "binding": "B" }],
  "triggers": { "crons": ["*/5 * * * *"] },
  "send_email": [{ "name": "MAIL" }]
}`;
  const j = parseWranglerConfig(jsonc, "json");
  assert.deepEqual(j.features, ["cron", "email_routing", "r2"]);
  assert.equal(parseWranglerConfig('pages_build_output_dir = "dist"', "toml").pages, true);
});

test("重複の判定：2つの収集元・URLの表記ゆれ・移転前後の名前を1件にまとめる", () => {
  const now = "2026-10-09T00:00:00Z";
  const aw = parseAwesomeReadme(AWESOME).map((item) => ({ source: "awesome", fetchedAt: now, item }));
  const ap = parseAppflareIndex(APPFLARE).map((item) => ({ source: "appflare", fetchedAt: now, item }));
  // 同じプロジェクトを、移転後の名前で載せた記載
  const dup = { source: "appflare", fetchedAt: now, item: { repo: "new-owner/moved", features: [] } };
  const merged = mergeCandidates([...aw, ...ap, dup], new Map([["old-owner/moved", "new-owner/moved"]]));
  const repos = merged.map((c) => c.repo);
  assert.equal(new Set(repos).size, repos.length, "同じリポジトリが2件ない");
  const cs = merged.find((c) => c.repo === "benvinegar/counterscale");
  assert.deepEqual(cs.sources.map((s) => s.source).sort(), ["appflare", "awesome"]);
  const mv = merged.find((c) => c.repo === "new-owner/moved");
  assert.deepEqual(mv.aliases, ["old-owner/moved"]);
  assert.equal(mv.sources.length, 2);
  assert.equal(merged.length, 5); // counterscale, some/odd, a/b, new-owner/moved, c/paid
});

test("既存の掲載との照合：リポジトリ・移転前の名前・GitHub のリポジトリIDの順。差分を更新候補にする", () => {
  const tools = [
    { id: "counterscale", github_url: "https://github.com/BenVinegar/Counterscale", license: "MIT", github_archived: false },
    { id: "moved", github_url: "https://github.com/old-owner/moved", license: "MIT", github_archived: false },
    { id: "renamed", github_url: "https://github.com/x/new-name", aliases: ["https://github.com/x/old-name"] },
  ];
  const idx = indexTools(tools);
  assert.deepEqual(matchExisting({ repo: "benvinegar/counterscale", aliases: [] }, idx), { tool_id: "counterscale", by: "repo" });
  assert.deepEqual(matchExisting({ repo: "new-owner/moved", aliases: ["old-owner/moved"] }, idx), { tool_id: "moved", by: "renamed_repo" });
  assert.deepEqual(matchExisting({ repo: "x/old-name", aliases: [] }, idx), { tool_id: "renamed", by: "repo" });
  assert.deepEqual(matchExisting({ repo: "zzz/zzz", aliases: [] }, idx, new Map([[42, "counterscale"]]), 42), { tool_id: "counterscale", by: "github_repo_id" });
  assert.equal(matchExisting({ repo: "zzz/zzz", aliases: [] }, idx), null);

  const now = "t";
  const diffs = diffExisting(tools[1], {
    license: field("Apache-2.0", "s", now, "api"),
    archived: field(true, "s", now, "api"),
    canonical_repo: field("new-owner/moved", "s", now, "api"),
  });
  assert.deepEqual(diffs.map((d) => d.field), ["license", "github_archived", "github_url"]);
  // 観測できなかった値（null）とは比べない（未確認を「変わった」としない）
  assert.deepEqual(diffExisting(tools[0], { license: null, archived: field(null, null, now, "unknown") }), []);
});

test("不正・欠損データ：ライセンス不明・OSI以外・アーカイブ済み・説明なしは公開を止める", () => {
  const c = (over) => ({
    fields: {
      license: field("MIT", "s", "t", "api"),
      archived: field(false, "s", "t", "api"),
      cloudflare_features: field(["d1"], "s", "t", "verified"),
      description: field("d", "s", "t", "claimed"),
      workers_paid_required: field(false, "s", "t", "claimed"),
      cloudflare_requirements: field(["r2"], "s", "t", "claimed"),
      ...over,
    },
  });
  assert.deepEqual(qualityIssues(c({})), []);
  assert.deepEqual(qualityIssues(c({ license: field(null, null, "t", "unknown") })), ["license_unknown"]);
  assert.deepEqual(qualityIssues(c({ license: field("BUSL-1.1", "s", "t", "claimed") })), ["license_not_osi"]);
  assert.ok(qualityIssues(c({ archived: field(true, "s", "t", "api") })).includes("archived"));
  assert.ok(qualityIssues(c({ description: field(null, null, "t", "unknown") })).includes("no_description"));
  assert.ok(qualityIssues(c({ workers_paid_required: field(true, "s", "t", "claimed") })).includes("needs_workers_paid"));
  for (const b of ["license_unknown", "license_not_osi", "archived", "no_description"]) assert.ok(BLOCKING_ISSUES.has(b));
  assert.ok(!BLOCKING_ISSUES.has("needs_workers_paid")); // 有料プランが要るのは注意点であり、掲載は止めない
  assert.throws(() => field(1, "s", "t", "guess")); // 確認の状態は決まった値だけ
});

test("再実行の安全性：値が同じなら取得日時を前回のまま引き継ぐ（キーの順に左右されない）", () => {
  const prev = { first_seen: "2026-01-01", fields: { a: { value: { x: 1, y: 2 }, source: "s", status: "api", fetched_at: "OLD" } } };
  const next = { first_seen: "2026-10-09", fields: { a: { value: { y: 2, x: 1 }, source: "s", status: "api", fetched_at: "NEW" } } };
  const out = carryOverFetchedAt(next, prev);
  assert.equal(out.fields.a.fetched_at, "OLD");
  assert.equal(out.first_seen, "2026-01-01");
  const changed = carryOverFetchedAt({ ...next, fields: { a: { ...next.fields.a, value: { x: 9 } } } }, prev);
  assert.equal(changed.fields.a.fetched_at, "NEW");
  assert.equal(stableStringify({ b: 1, a: { d: 1, c: 2 } }), stableStringify({ a: { c: 2, d: 1 }, b: 1 }));
});

/* ---------------- GitHub API クライアント（fetch を差し替え） ---------------- */

function fakeFetch(handlers) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, headers: init?.headers ?? {} });
    const h = handlers.shift();
    if (!h) throw new Error("想定外の呼び出し");
    if (h.throw) throw new Error(h.throw);
    return {
      status: h.status ?? 200,
      ok: (h.status ?? 200) >= 200 && (h.status ?? 200) < 300,
      headers: { get: (k) => (h.headers ?? {})[k.toLowerCase()] ?? null },
      json: async () => h.body,
    };
  };
  fn.calls = calls;
  return fn;
}
const noSleep = async () => {};

test("条件付きリクエスト：ETag を送り、304 なら前回の本文を使う", async () => {
  const f = fakeFetch([
    { body: { n: 1 }, headers: { etag: '"abc"', "x-ratelimit-remaining": "4999" } },
    { status: 304, headers: { "x-ratelimit-remaining": "4999" } },
  ]);
  const c = createGitHubClient({ fetchImpl: f, sleep: noSleep });
  assert.deepEqual((await c.request("u")).data, { n: 1 });
  const r2 = await c.request("u");
  assert.equal(r2.status, 304);
  assert.deepEqual(r2.data, { n: 1 });
  assert.equal(f.calls[1].headers["If-None-Match"], '"abc"');
  assert.equal(c.stats.notModified, 1);
});

test("外部APIの障害：5xx とネットワークの失敗は間隔を空けて再試行し、続けば失敗として返す", async () => {
  const waits = [];
  const f = fakeFetch([{ status: 502 }, { throw: "reset" }, { body: { ok: 1 } }]);
  const c = createGitHubClient({ fetchImpl: f, sleep: async (ms) => waits.push(ms), baseDelayMs: 10 });
  assert.deepEqual((await c.request("u")).data, { ok: 1 });
  assert.deepEqual(waits, [10, 20]);
  const f2 = fakeFetch([{ status: 500 }, { status: 500 }, { status: 500 }, { status: 500 }]);
  const c2 = createGitHubClient({ fetchImpl: f2, sleep: noSleep, retries: 3 });
  const r = await c2.request("u");
  assert.equal(r.ok, false);
  assert.equal(r.status, 500);
  assert.equal(f2.calls.length, 4);
  // 404 は再試行しない
  const f3 = fakeFetch([{ status: 404 }]);
  assert.equal((await createGitHubClient({ fetchImpl: f3, sleep: noSleep }).request("u")).status, 404);
});

test("レート制限と上限：残りが下限を切る・制限に当たる・上限の回数に達したら止める", async () => {
  const f = fakeFetch([{ body: {}, headers: { "x-ratelimit-remaining": "10" } }]);
  const c = createGitHubClient({ fetchImpl: f, sleep: noSleep, minRemaining: 50 });
  await c.request("a");
  await assert.rejects(c.request("b"), BudgetExceeded);
  const f2 = fakeFetch([{ status: 403, headers: { "x-ratelimit-remaining": "0" } }]);
  await assert.rejects(createGitHubClient({ fetchImpl: f2, sleep: noSleep }).request("a"), BudgetExceeded);
  const f3 = fakeFetch([{ body: {} }, { body: {} }]);
  const c3 = createGitHubClient({ fetchImpl: f3, sleep: noSleep, maxRequests: 1 });
  await c3.request("a");
  await assert.rejects(c3.request("b"), BudgetExceeded);
});

test("ページ送り：Link ヘッダーの next をたどる（上限ページ数まで）", async () => {
  assert.equal(nextLink('<https://api/x?page=2>; rel="next", <https://api/x?page=5>; rel="last"'), "https://api/x?page=2");
  assert.equal(nextLink(null), null);
  const f = fakeFetch([
    { body: [1, 2], headers: { link: '<p2>; rel="next"' } },
    { body: [3], headers: { link: '<p3>; rel="next"' } },
    { body: [4] },
  ]);
  const c = createGitHubClient({ fetchImpl: f, sleep: noSleep });
  assert.deepEqual((await c.paginate("p1", 2)).items, [1, 2, 3]);
});

test("リポジトリの情報：移転後の名前・SPDX のライセンス（NOASSERTION は不明）・リリースなし", async () => {
  const f = fakeFetch([
    { body: { id: 7, full_name: "New/Name", license: { spdx_id: "NOASSERTION" }, stargazers_count: 5, archived: false, language: "TypeScript" } },
    { status: 404 },
  ]);
  const r = await fetchRepoFacts(createGitHubClient({ fetchImpl: f, sleep: noSleep }), "old/name");
  assert.equal(r.facts.full_name, "new/name");
  assert.equal(r.facts.license_spdx, null);
  assert.equal(r.facts.latest_release_at, null);
  assert.equal(r.facts.id, 7);
});

/* ---------------- 出力と、公開の操作の安全性 ---------------- */

test("収集の結果（コミット済みのファイル）：すべての項目に確認の状態があり、未確認以外は出典がある", () => {
  const file = path.join(process.cwd(), "data-source", "discovery", "cloudflare-candidates.json");
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const repos = new Set();
  for (const c of data.candidates) {
    assert.ok(!repos.has(c.repo), `重複: ${c.repo}`);
    repos.add(c.repo);
    for (const [k, f] of Object.entries(c.fields)) {
      assert.ok(FIELD_STATUS.includes(f.status), `${c.repo}.${k}`);
      if (f.status !== "unknown") assert.match(String(f.source), /^https:\/\//, `${c.repo}.${k} の出典`);
      assert.ok(f.fetched_at, `${c.repo}.${k} の取得日時`);
    }
    if (c.quality.blocking.length) assert.notEqual(c.review.state, "needs_review", `${c.repo} は公開を止める問題がある`);
  }
});

test("公開の操作は管理者だけ：収集は掲載データに書き込まず、掲載の追加は手動実行（書き込み権限のある人）だけ", () => {
  const wf = (n) => fs.readFileSync(path.join(process.cwd(), ".github", "workflows", n), "utf8");
  const disc = wf("cloudflare-discovery.yml");
  const adds = disc.split("\n").filter((l) => /git add/.test(l));
  assert.ok(adds.length > 0);
  for (const l of adds) assert.doesNotMatch(l, /tools\.json|public\//, "収集は掲載データをコミットしない");
  assert.doesNotMatch(disc, /pull_request_target|issue_comment|issues:/);
  const src = fs.readFileSync(path.join(process.cwd(), "scripts", "discover-cloudflare.mjs"), "utf8");
  assert.doesNotMatch(src, /writeFileSync\(\s*TOOLS/);
  const add = wf("add-tools.yml");
  const on = add.slice(add.indexOf("\non:"), add.indexOf("\npermissions:"));
  assert.match(on, /workflow_dispatch/);
  assert.doesNotMatch(on, /schedule|push:|pull_request|issue/);
});
