/**
 * ランキング（/rankings/）の画面に渡す行を作る。サーバー（人気のタブ）と、
 * ブラウザ（急成長・おすすめのタブ。/data/tools.json から計算し直す）の両方で使う。
 * 計算は src/lib/rankings.ts の純粋関数だけで、時刻に依存しないため、どちらで計算しても同じ結果になる。
 */
import { TOOL_DIAGNOSIS } from "./diagnosis-data.ts";
import { SAAS_IDS, SAAS_LABELS } from "./diagnosis-types.ts";
import { buildGrowth, buildPopularity, buildRecommended } from "./rankings.ts";
import { formatDate, type Tool } from "./tools.ts";

/** 画面に渡す1行分 */
export type RankView = {
  id: string;
  name: string;
  meta: string;
  score: number;
  /** 右側に出す主な値と補足 */
  headline: string;
  sub: string;
  parts: Array<{ label: string; weight: number; value: string; pct?: number; points: number; note?: string; known?: boolean }>;
  /** 最終観測（取得日・期間など） */
  observed: string;
  evidencePct?: number;
};

export type RecommendedGroup = { saas: string; label: string; rows: RankView[] };

export const RANK_TOP_N = 30;

const competitorOf = (t: { primary_competitor_ja?: string | null; primary_competitor: string }) =>
  `${t.primary_competitor_ja || t.primary_competitor}の代替`;

export function popularViews(tools: Tool[], asOf: string): { rows: RankView[]; total: number } {
  const pop = buildPopularity(tools);
  return {
    total: pop.rows.length,
    rows: pop.rows.slice(0, RANK_TOP_N).map((r) => ({
      id: r.tool.id,
      name: r.tool.name,
      meta: competitorOf(r.tool),
      score: r.score,
      headline: `★${(r.tool.stars_num ?? 0).toLocaleString("ja-JP")}`,
      sub: `Fork ${(r.tool.forks_num ?? 0).toLocaleString("ja-JP")}`,
      parts: r.parts.map((p) => ({ label: p.label, weight: p.weight, value: p.value, pct: p.pct, points: p.points })),
      observed: `Stars・Forks・Contributorsの取得日：${asOf}`,
    })),
  };
}

export function growthViews(tools: Tool[]): { rows: RankView[]; unobserved: number } {
  const gr = buildGrowth(tools);
  return {
    unobserved: gr.unobserved.length,
    rows: gr.rows.slice(0, RANK_TOP_N).map((r) => ({
      id: r.tool.id,
      name: r.tool.name,
      meta: competitorOf(r.tool),
      score: r.score,
      headline: r.parts[0].value,
      sub: `7日間（実測${r.window7.days}日）`,
      parts: r.parts.map((p) => ({ label: p.label, weight: p.weight, value: p.value, pct: p.pct, points: p.points, note: p.note })),
      observed: `7日：${r.window7.from}→${r.window7.to}／30日：${r.window30.from}→${r.window30.to}（OSSALTが記録したStar数の実測）`,
    })),
  };
}

export function recommendedViews(tools: Tool[], asOf: string): RecommendedGroup[] {
  const rec = buildRecommended(tools, Object.values(TOOL_DIAGNOSIS));
  return SAAS_IDS.filter((s) => rec.bySaas[s]?.length).map((s) => ({
    saas: s,
    label: SAAS_LABELS[s],
    rows: rec.bySaas[s]!.map((r): RankView => ({
      id: r.tool.id,
      name: r.tool.name,
      meta: competitorOf(r.tool),
      score: r.score,
      headline: `${r.score}点`,
      sub: "100点満点",
      evidencePct: r.evidencePct,
      parts: r.parts.map((p) => ({ label: p.label, weight: p.weight, value: "", points: p.points, note: p.note, known: p.known })),
      observed: `最終コミット：${formatDate(r.tool.last_commit)}／データの取得日：${asOf}`,
    })),
  }));
}
