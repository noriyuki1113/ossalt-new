/** OSSALT activity report: deterministic presentation, not an AI prediction. */
import { pickSignal, type WatchSignal, type WatchSignalFeed } from "./watch-signals.ts";

export type ActivityTool = {
  id: string;
  name: string;
  github_url: string;
  primary_competitor: string;
  primary_competitor_ja?: string | null;
  category: string;
};
export type ActivityRow = {
  tool: ActivityTool;
  observation: WatchSignal;
  outdated: boolean;
  severity: "attention" | "changed" | "observing";
  headline: string;
};
export type ActivityReport = {
  rows: ActivityRow[];
  changed: number;
  stale: number;
  with7dBaseline: number;
  generatedAt: string | null;
};

const SIGNAL_LABEL: Record<WatchSignal["signal"], string> = {
  archived: "アーカイブ状態を観測",
  stable_release_change_observed: "安定版タグの変化を観測",
  star_growth_7d: "直近7日間のStar増加を確認",
  monitoring: "定期観測中",
};

/**
 * Missing days are unknown, not zeros. "No events" means none in the last
 * two observed states — NOT that no actual releases occurred.
 * Outdated evidence never appears as a current noteworthy event.
 */
export function buildActivityReport(
  tools: ActivityTool[],
  feed: WatchSignalFeed | null,
  asOf: Date = new Date(),
): ActivityReport {
  const now = asOf.getTime();
  if (!Number.isFinite(now)) throw new Error("Invalid report date");
  if (!feed || feed.schema_version !== 1 || !Array.isArray(feed.observations)
      || !Number.isFinite(Date.parse(feed.generated_at))) {
    return {rows: [], changed: 0, stale: 0, with7dBaseline: 0, generatedAt: null};
  }
  const rows: ActivityRow[] = [];
  for (const tool of tools) {
    const obs = pickSignal(feed, tool.github_url);
    if (!obs) continue;
    const at = Date.parse(obs.observed_at);
    // Reject future observations. A small clock skew is tolerated.
    if (at > now + 5 * 60 * 1000 || at < 0) continue;
    const outdated = now - at > 72 * 60 * 60 * 1000;
    const noteworthy = obs.signal !== "monitoring" && !outdated;
    rows.push({
      tool, observation: obs, outdated,
      severity: !noteworthy ? "observing" : obs.signal === "archived" ? "attention" : "changed",
      headline: outdated ? "古い観測データ（再確認が必要）" : SIGNAL_LABEL[obs.signal],
    });
  }
  const priority = {attention: 0, changed: 1, observing: 2};
  rows.sort((a, b) =>
    priority[a.severity] - priority[b.severity]
    || Number(a.outdated) - Number(b.outdated)
    || (b.observation.stars_delta_7d ?? -Infinity) - (a.observation.stars_delta_7d ?? -Infinity)
    || a.tool.name.localeCompare(b.tool.name, "ja"),
  );
  return {
    rows,
    changed: rows.filter(r => r.severity !== "observing").length,
    stale: rows.filter(r => r.outdated).length,
    with7dBaseline: rows.filter(r => r.observation.stars_delta_7d !== null
      && r.observation.baseline_date_7d !== null).length,
    generatedAt: feed.generated_at,
  };
}

export function activityDateJst(input: string): string {
  const date = new Date(input);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
      }).format(date)
    : "未確認";
}
