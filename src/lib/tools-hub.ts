/**
 * ツール一覧ハブ（/tools/）の「分野ごとの一覧」を作る（純粋関数のみ）。
 *
 * 分野（カテゴリ）の絞り込みボタンは、JavaScriptで動くため、検索エンジンはリンクとしてたどれない。
 * そこで、すべての分野と、その分野の代表ツールを、実リンク（<a href>）で並べるための材料を作る。
 * 代表ツールは、健全度（health_score）の高い順。検索の登録対象から外しているツール（noindex）は
 * 代表に入れない（件数には数える）。
 */
import type { Tool } from "./tools.ts";

export type HubTool = Pick<Tool, "id" | "name" | "category" | "health_score"> & { github_archived?: boolean };
export type HubCategory = {
  slug: string;
  nameJa: string;
  /** 掲載中（アーカイブ以外）のツールの数 */
  count: number;
  reps: Array<{ id: string; name: string }>;
};

export function buildCategoryDirectory(
  tools: HubTool[],
  categories: Array<{ slug: string; nameJa: string }>,
  opts: { perCategory: number; excludeFromReps: (toolId: string) => boolean },
): HubCategory[] {
  const active = tools.filter((t) => !t.github_archived);
  const rows: Array<HubCategory & { order: number }> = [];
  categories.forEach((c, order) => {
    const inCat = active.filter((t) => t.category === c.slug);
    if (inCat.length === 0) return;
    const reps = inCat
      .filter((t) => !opts.excludeFromReps(t.id))
      .sort((a, b) => (b.health_score ?? -Infinity) - (a.health_score ?? -Infinity) || a.name.localeCompare(b.name, "ja"))
      .slice(0, opts.perCategory)
      .map((t) => ({ id: t.id, name: t.name }));
    rows.push({ slug: c.slug, nameJa: c.nameJa, count: inCat.length, reps, order });
  });
  return rows
    .sort((a, b) => b.count - a.count || a.order - b.order)
    .map(({ order: _order, ...rest }) => rest);
}
