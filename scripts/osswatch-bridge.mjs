#!/usr/bin/env node
/**
 * OSSALT ← OSS Intelligence Watch: fail-closed, read-only snapshot bridge.
 *
 * - No network calls, secrets, or paid API dependencies.
 * - Exact GitHub owner/repo matching, not fuzzy project names.
 * - Never overwrites OSSALT stars, scores, rankings, or other catalog fields.
 * - Emits only explicitly whitelisted, dated observations; no raw GitHub JSON.
 * - Without --out, only prints a compatibility audit; production stays unchanged.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const RELEASE_STATES = new Set(["ok", "not_checked", "no_stable_release", "incomplete"]);

export function githubRepo(value) {
  if (typeof value !== "string") return null;
  let url;
  try { url = new URL(value); }
  catch { return null; }
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com"
    || url.username || url.password || url.search || url.hash || url.port) return null;
  const raw = url.pathname.replace(/^\/|\/$/g, "").replace(/\.git$/i, "");
  if (!REPO_PATTERN.test(raw) || raw.split("/").some(p => p === "." || p === "..")) return null;
  return raw.toLowerCase();
}

function validTimestamp(value) {
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && Number.isFinite(Date.parse(value));
}

function integer(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function validateSnapshot(snapshot) {
  if (!snapshot || ![1, 2].includes(snapshot.schema_version)
    || typeof snapshot.date !== "string"
    || !/^\d{4}-\d{2}-\d{2}$/.test(snapshot.date)
    || !Array.isArray(snapshot.snapshots)) {
    throw new Error("Unsupported or malformed OSS Watch snapshot");
  }
}

export function buildWatchBridge(catalog, snapshot) {
  if (!Array.isArray(catalog)) throw new Error("OSSALT catalog must be a JSON array");
  validateSnapshot(snapshot);
  const catalogByRepo = new Map();
  for (const tool of catalog) {
    if (!tool || typeof tool.id !== "string" || typeof tool.github_url !== "string") continue;
    const repo = githubRepo(tool.github_url);
    if (!repo) continue;
    if (catalogByRepo.has(repo) && catalogByRepo.get(repo) !== tool.id) {
      throw new Error("Multiple OSSALT tool IDs map to one GitHub repo: " + repo);
    }
    catalogByRepo.set(repo, tool.id);
  }
  const seen = new Set();
  const matched = [];
  const unmatchedWatchRepos = [];
  for (const row of snapshot.snapshots) {
    if (!row || typeof row.repo !== "string" || !REPO_PATTERN.test(row.repo))
      throw new Error("Invalid Watch repository identifier");
    const repo = row.repo.toLowerCase();
    if (seen.has(repo)) throw new Error("Duplicate Watch repository: " + repo);
    seen.add(repo);
    if (!validTimestamp(row.observed_at)
      || new Date(row.observed_at).toISOString().slice(0, 10) !== snapshot.date
      || !integer(row.stars) || !integer(row.forks)
      || typeof row.archived !== "boolean"
      || row.source_url !== "https://api.github.com/repos/" + row.repo
      || githubRepo(row.repo_url) !== repo) {
      throw new Error("Invalid observation or untrusted provenance for " + repo);
    }
    const id = catalogByRepo.get(repo);
    if (!id) {
      unmatchedWatchRepos.push(repo);
      continue;
    }
    const releaseStatus = row.release_status ?? "not_checked";
    if (!RELEASE_STATES.has(releaseStatus)) {
      throw new Error("Invalid release observation state for " + repo);
    }
    const releaseTag = releaseStatus === "ok" && typeof row.latest_release_tag === "string"
      ? row.latest_release_tag.slice(0, 100) : null;
    const releasePublishedAt = releaseStatus === "ok" && validTimestamp(row.latest_release_published_at)
      ? row.latest_release_published_at : null;
    matched.push({
      tool_id: id,
      github_repo: repo,
      observed_at: row.observed_at,
      stars_observed: row.stars,
      forks_observed: row.forks,
      archived_observed: row.archived,
      release_status: releaseStatus,
      latest_stable_release_tag: releaseTag,
      latest_stable_release_published_at: releasePublishedAt,
      source_url: row.source_url,
    });
  }
  matched.sort((a, b) => a.tool_id.localeCompare(b.tool_id, "en"));
  unmatchedWatchRepos.sort();
  return {
    schema_version: 1,
    source: "OSS Intelligence Watch daily GitHub observations",
    source_observation_date_utc: snapshot.date,
    watch_repositories: seen.size,
    ossalt_catalog_repositories: catalogByRepo.size,
    matched_repositories: matched.length,
    unmatched_watch_repositories: unmatchedWatchRepos,
    observations: matched,
    limitations: "Observed values do not overwrite OSSALT catalog. Stars are not users, releases/latest excludes tag-only and prereleases; snapshots are not safety ratings. No invented history.",
  };
}

function main(argv) {
  const options = new Map();
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i]?.startsWith("--") || argv[i + 1] == null)
      throw new Error("Usage: node scripts/osswatch-bridge.mjs --snapshot path [--catalog path] [--out path]");
    options.set(argv[i], argv[i + 1]);
  }
  for (const name of options.keys()) {
    if (!["--snapshot", "--catalog", "--out"].includes(name))
      throw new Error("Unrecognized argument " + name);
  }
  const snapshotPath = options.get("--snapshot");
  if (!snapshotPath) throw new Error("--snapshot is required");
  const catalogPath = options.get("--catalog") ?? "data-source/tools.json";
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  const result = buildWatchBridge(catalog, snapshot);
  const dest = options.get("--out");
  if (dest) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, JSON.stringify(result, null, 2) + "\n", "utf8");
    console.log("Wrote allowlisted bridge observations to " + dest);
  }
  console.log(JSON.stringify({
    date: result.source_observation_date_utc,
    ossalt_catalog_repositories: result.ossalt_catalog_repositories,
    watch_repositories: result.watch_repositories,
    matched: result.matched_repositories,
    unmatched_watch_repositories: result.unmatched_watch_repositories,
    dry_run: !dest,
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
