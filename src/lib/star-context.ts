/**
 * スター数の「文脈」（純粋関数のみ）
 *
 * 「20.6万」だけでは多いのか少ないのか分からないため、同じカテゴリの中での順位と、
 * 掲載ツール全体での位置（上位◯%）を出す。上位50%より下は「下位」と言わず、出さない。
 */
import type { Tool } from "./tools.ts";

type StarTool = Pick<Tool, "id" | "category" | "stars_num">;

export type StarContext = {
  /** カテゴリ内の順位（1始まり）。スター数が無ければ null */
  catRank: number | null;
  catTotal: number;
  /** 全体での上位％（切り上げ）。上位50%を超える場合は null */
  topPercent: number | null;
};

export function starContext(tool: StarTool, all: StarTool[]): StarContext {
  const withStars = all.filter((t) => t.stars_num != null);
  const sameCat = withStars.filter((t) => t.category === tool.category);
  if (tool.stars_num == null) return { catRank: null, catTotal: sameCat.length, topPercent: null };
  // 同じスター数は同じ順位にする（自分より多いものの数 + 1）
  const catRank = sameCat.filter((t) => (t.stars_num ?? 0) > tool.stars_num!).length + 1;
  const overallRank = withStars.filter((t) => (t.stars_num ?? 0) > tool.stars_num!).length + 1;
  const pct = Math.max(1, Math.ceil((overallRank / withStars.length) * 100));
  return { catRank, catTotal: sameCat.length, topPercent: pct <= 50 ? pct : null };
}

export type FreshnessState = { label: string; tone: "good" | "neutral" | "warn" } | null;

/** 最終更新からの日数を、「動いているか」の言葉にする */
export function freshnessState(days: number | null | undefined): FreshnessState {
  if (days == null) return null;
  if (days <= 90) return { label: "直近90日以内に更新あり", tone: "good" };
  if (days <= 365) return { label: "更新の間隔がやや空いている", tone: "neutral" };
  return { label: "1年以上更新がない", tone: "warn" };
}
