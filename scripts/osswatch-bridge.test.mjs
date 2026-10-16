import test from "node:test";
import assert from "node:assert/strict";
import { buildWatchBridge, githubRepo } from "./osswatch-bridge.mjs";

const OBSERVED_AT = "2026-10-16T08:52:45Z";
const catalog = [
  { id: "ollama", github_url: "https://github.com/ollama/ollama" },
  { id: "vllm", github_url: "https://github.com/vllm-project/vllm" },
  { id: "internal", github_url: "https://example.com/invalid" },
];
const watch = (snapshots) => ({
  schema_version: 2, date: "2026-10-16", snapshots,
});
function row(repo, extra = {}) {
  return {
    repo, observed_at: OBSERVED_AT, stars: 12, forks: 3,
    archived: false,
    repo_url: "https://github.com/" + repo,
    source_url: "https://api.github.com/repos/" + repo,
    release_status: "ok",
    latest_release_tag: "v1.2",
    latest_release_published_at: "2026-10-15T16:00:00Z",
    raw_json: { secret: "DO_NOT_EXPORT" },
    ...extra,
  };
}

test("exact GitHub repository normalization; unrelated hosts rejected", () => {
  assert.equal(githubRepo("https://github.com/Ollama/OLLAMA/"), "ollama/ollama");
  assert.equal(githubRepo("https://github.com/ollama/ollama.git"), "ollama/ollama");
  assert.equal(githubRepo("https://github.com/ollama"), null);
  assert.equal(githubRepo("https://example.com/ollama/ollama"), null);
  assert.equal(githubRepo("https://github.com/ollama/ollama?token=secret"), null);
  assert.equal(githubRepo("https://github.com/owner/../repo"), null);
});

test("read-only allowlisted bridge never copies private raw data", () => {
  const result = buildWatchBridge(catalog, watch([
    row("ollama/ollama"), row("astral-sh/ruff"), row("vllm-project/vllm"),
  ]));
  assert.equal(result.matched_repositories, 2);
  assert.equal(result.ossalt_catalog_repositories, 2);
  assert.equal(result.watch_repositories, 3);
  assert.deepEqual(result.unmatched_watch_repositories, ["astral-sh/ruff"]);
  assert.deepEqual(result.observations.map(o => o.tool_id), ["ollama", "vllm"]);
  assert.equal(result.observations[0].stars_observed, 12);
  assert.equal(result.observations[0].latest_stable_release_tag, "v1.2");
  assert.equal(JSON.stringify(result).includes("DO_NOT_EXPORT"), false);
  assert.equal(JSON.stringify(result).includes("raw_json"), false);
  assert.equal(result.observations[0].source_url, "https://api.github.com/repos/ollama/ollama");
});

test("missing release is unknown, not a fabricated zero score", () => {
  const result = buildWatchBridge(catalog, watch([
    row("ollama/ollama", {
      release_status: "no_stable_release",
      latest_release_tag: "should_not_pass",
      latest_release_published_at: null,
    }),
  ]));
  assert.equal(result.observations[0].latest_stable_release_tag, null);
  assert.equal(result.observations[0].latest_stable_release_published_at, null);
  assert.equal(result.observations[0].release_status, "no_stable_release");
});

test("reject source impersonation, negative counts, invalid or wrong-day timestamps", () => {
  for (const override of [
    { source_url: "https://evil.example/ollama" },
    { stars: -1 },
    { forks: Number.NaN },
    { observed_at: "2026-10-15T23:59:00Z" },
    { observed_at: "invalid" },
    { archived: "false" },
  ]) {
    assert.throws(() => buildWatchBridge(catalog, watch([row("ollama/ollama", override)])));
  }
});

test("reject duplicate repositories and ambiguous OSSALT mappings", () => {
  assert.throws(() => buildWatchBridge(catalog, watch([
    row("ollama/ollama"), row("ollama/ollama"),
  ])));
  assert.throws(() => buildWatchBridge([
    ...catalog,
    { id: "ollama_duplicate", github_url: "https://github.com/ollama/ollama" },
  ], watch([row("ollama/ollama")])));
});

test("supports historical Watch v1 without inventing release data", () => {
  const s = watch([row("ollama/ollama")]);
  s.schema_version = 1;
  delete s.snapshots[0].release_status;
  delete s.snapshots[0].latest_release_tag;
  delete s.snapshots[0].latest_release_published_at;
  const result = buildWatchBridge(catalog, s);
  assert.equal(result.observations[0].release_status, "not_checked");
  assert.equal(result.observations[0].latest_stable_release_tag, null);
});
