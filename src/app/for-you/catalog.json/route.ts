import { getActiveTools, getComparePairs, getCompetitors, getMeta } from "@/lib/data";
import { getCategories } from "@/lib/categories";
import { TOOL_DIAGNOSIS } from "@/lib/diagnosis-data";
import { toRecTools } from "@/lib/recommend/catalog";
import type { RecCatalog } from "@/lib/recommend/types";

export const dynamic = "force-static";

/**
 * OSSALT For You が読み込む推薦用データ（ビルド時に1回だけ作る静的なJSON）。
 * 推薦の計算は利用者のブラウザで行う（サーバー・DB・外部APIは使わない）。
 */
export function GET() {
  const meta = getMeta();
  const saas: Record<string, string> = {};
  for (const g of getCompetitors()) saas[g.slug] = g.name;
  const categories: Record<string, string> = {};
  for (const c of getCategories()) categories[c.slug] = c.nameJa;
  const body: RecCatalog = {
    observedAt: meta.stars_as_of ?? null,
    builtAt: meta.built_at,
    tools: toRecTools(getActiveTools(), TOOL_DIAGNOSIS),
    saas,
    categories,
    compareSlugs: getComparePairs().map((p) => p.slug),
  };
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/json; charset=utf-8" } });
}
