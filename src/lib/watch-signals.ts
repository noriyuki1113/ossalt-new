/**
 * OSSALT reads a validated, static mirror of Watch observations at build time.
 * This module never fetches from the browser and never rewrites Tool metadata.
 */
import fs from "node:fs";
import path from "node:path";

export type WatchSignal = {
  repo: string;
  observed_at: string;
  source_url: string;
  stars: number;
  forks: number;
  archived: boolean;
  stars_delta_7d: number | null;
  baseline_date_7d: string | null;
  release_status: "ok" | "no_stable_release" | "not_checked" | "incomplete";
  latest_stable_release_tag: string | null;
  stable_release_changed_since_previous_snapshot: boolean;
  signal: "archived" | "stable_release_change_observed" | "star_growth_7d" | "monitoring";
  observation_count: number;
};

export type WatchSignalFeed = {
  schema_version: number;
  generated_at: string;
  observations: WatchSignal[];
};

function normalizedRepo(url: string): string | null {
  const m = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/?$/.exec(url);
  return m ? m[1].toLowerCase() : null;
}

/** Only a matching owner/repo with matching official API provenance is displayed. */
export function pickSignal(feed: WatchSignalFeed | null, githubUrl: string): WatchSignal | null {
  const repo = normalizedRepo(githubUrl);
  if (!repo || !feed || feed.schema_version !== 1 || !Array.isArray(feed.observations))
    return null;
  const signal = feed.observations.find(row => row.repo === repo);
  if (!signal || !Number.isFinite(Date.parse(signal.observed_at))
    || !Number.isSafeInteger(signal.stars) || signal.stars < 0
    || !Number.isSafeInteger(signal.forks) || signal.forks < 0
    || signal.source_url.toLowerCase() !== "https://api.github.com/repos/" + repo)
    return null;
  return signal;
}

/** Static on-disk feed; deliberately no external request during site rendering. */
export function getWatchSignalFeed(): WatchSignalFeed | null {
  try {
    const file = path.join(process.cwd(), "public", "data", "osswatch-signals.json");
    const data = JSON.parse(fs.readFileSync(file, "utf8")) as WatchSignalFeed;
    if (data.schema_version !== 1 || !Number.isFinite(Date.parse(data.generated_at))
        || !Array.isArray(data.observations)) return null;
    return data;
  } catch {
    return null;
  }
}

export function getSignalForTool(githubUrl: string): WatchSignal | null {
  return pickSignal(getWatchSignalFeed(), githubUrl);
}
