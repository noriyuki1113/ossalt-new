/**
 * ツール詳細ページ用：人気・急成長ランキングでの順位。
 * ビルド中は掲載データが変わらないため、最初の1回だけ計算して使い回す（サーバー専用）。
 */
import { getActiveTools } from "./data";
import { buildGrowth, buildPopularity } from "./rankings";
import type { Standing } from "./tool-brief";

let cache: Map<string, Standing> | null = null;

export function getStanding(toolId: string): Standing {
  if (!cache) {
    const tools = getActiveTools();
    const pop = buildPopularity(tools);
    const gr = buildGrowth(tools);
    const m = new Map<string, Standing>();
    pop.rows.forEach((r, i) => {
      m.set(r.tool.id, { popular: { rank: i + 1, total: pop.rows.length }, growth: null, growthReason: null });
    });
    gr.rows.forEach((r, i) => {
      const s = m.get(r.tool.id) ?? { popular: null, growth: null, growthReason: null };
      s.growth = { rank: i + 1, total: gr.rows.length };
      m.set(r.tool.id, s);
    });
    for (const u of gr.unobserved) {
      const s = m.get(u.tool.id) ?? { popular: null, growth: null, growthReason: null };
      s.growthReason = u.reason;
      m.set(u.tool.id, s);
    }
    cache = m;
  }
  return cache.get(toolId) ?? { popular: null, growth: null, growthReason: "掲載データが足りない" };
}
