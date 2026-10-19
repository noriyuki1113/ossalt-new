/** OSSALT activity report: deterministic presentation, not an AI prediction. */
import { pickSignal, type WatchSignal, type WatchSignalFeed } from "./watch-signals.ts";

export type ActivityTool = {
  id: string;
  name: string;
  github_url: string;
  primary_competitor: string;
  primary_competitor_ja?: string | null;
  category: string;
  /** OSSALT 自身の毎日の記録（data-source/star-history.json）から作った直近の増加。Watch の7日間の値とは別のもの */
  star_gain?: { gain: number; days: number; from: string } | null;
};
export type ActivityRow = {
  tool: ActivityTool;
  observation: WatchSignal;
  outdated: boolean;
  /** Watch の7日間の増減が無いとき（履歴蓄積中）の、OSSALT 自身の記録による増加。別の出典として表示する */
  ownGain: { gain: number; days: number; from: string } | null;
  severity: "attention" | "changed" | "observing";
  headline: string;
};
export type ActivityReport = {
  rows: ActivityRow[];
  changed: number;
  stale: number;
  with7dBaseline: number;
  generatedAt: string | null;
  /** 配信元（Watch）の更新が止まっているとみられる（生成日時が 36 時間より古い） */
  feedStalled: boolean;
  /** 全件の観測回数が1のまま（履歴が積み上がっていない） */
  historyNotAccumulating: boolean;
};

/** 配信元の生成日時がこれより古ければ「止まっている」とみなす（取り込みは毎日。1日分の遅れは許容） */
export const FEED_STALL_HOURS = 36;

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
    return {rows: [], changed: 0, stale: 0, with7dBaseline: 0, generatedAt: null, feedStalled: false, historyNotAccumulating: false};
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
    const g = tool.star_gain;
    const ownGain = obs.stars_delta_7d === null && g && g.gain >= 0 && g.days > 0 ? {gain: g.gain, days: g.days, from: g.from} : null;
    rows.push({
      tool, observation: obs, outdated, ownGain,
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
    feedStalled: now - Date.parse(feed.generated_at) > FEED_STALL_HOURS * 3600 * 1000,
    historyNotAccumulating: rows.length > 0 && rows.every(r => r.observation.observation_count <= 1)
      && now - Date.parse(feed.generated_at) > 24 * 3600 * 1000,
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
