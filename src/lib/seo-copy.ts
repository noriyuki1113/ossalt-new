/**
 * 検索結果に出るタイトル・説明文の組み立て（純粋関数のみ）
 *
 * 日本語の検索で使われやすい言い方（「〇〇 代替」「〇〇 代わり」「〇〇 オープンソース」
 * 「〇〇とは」）に合わせつつ、掲載データだけから文章を作る。
 * 「無料」など、ツールによって成り立たない言い切りは使わない。
 *
 * node:test から直接読み込めるよう、型以外のimportを持たない。
 */
import type { Tool } from "./tools.ts";

type SeoTool = Pick<
  Tool,
  "name" | "description_ja" | "license" | "ja_ui" | "ja_docs" | "docker_available" | "primary_competitor" | "primary_competitor_ja"
>;

function hasJa(t: Pick<Tool, "ja_ui" | "ja_docs">): boolean {
  return t.ja_ui === true || t.ja_docs === "official" || t.ja_docs === "community";
}

/** 「A、B、Cなど」の形に並べる（最大n件） */
function listNames(names: string[], n = 3): string {
  const picked = names.slice(0, n);
  if (picked.length === 0) return "";
  return picked.join("・") + (names.length > n ? "など" : "");
}

/**
 * 文章を max 文字以内に収める。句点（。）で切れるところがあればそこで切り、
 * なければ末尾を「…」にする。
 */
export function clampText(text: string, max: number): string {
  const s = text.trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastStop = cut.lastIndexOf("。");
  if (lastStop >= max * 0.5) return cut.slice(0, lastStop + 1);
  return cut.slice(0, max - 1) + "…";
}

/* ------------------------------------------------------------------ *
 * /alternatives/[slug]/
 * ------------------------------------------------------------------ */

export function alternativeTitle(competitor: string, tools: Pick<Tool, "name">[], year: number): string {
  if (tools.length === 1) {
    return `${competitor}の代替オープンソース「${tools[0].name}」｜特徴と使い方の目安【${year}年】`;
  }
  return `${competitor}の代替OSS ${tools.length}選｜自前で動かせるオープンソースを比較【${year}年】`;
}

export function alternativeDescription(competitor: string, tools: SeoTool[]): string {
  const n = tools.length;
  const ja = tools.filter(hasJa).length;
  const docker = tools.filter((t) => t.docker_available === true).length;
  const names = listNames(tools.map((t) => t.name));
  const facts: string[] = [];
  if (ja > 0) facts.push(`日本語対応${ja}件`);
  if (docker > 0) facts.push(`Docker対応${docker}件`);
  const factText = facts.length ? `（${facts.join("・")}）` : "";
  return (
    `${competitor}の代わりに自前のサーバーで動かせるオープンソース${n}件${factText}を比較。` +
    `${names}を、ライセンス・更新状況・セキュリティ評価・日本語対応で見比べられます。`
  );
}

/* ------------------------------------------------------------------ *
 * /categories/[slug]/
 * ------------------------------------------------------------------ */

/** カテゴリ内で代替対象として多いSaaS名（件数の多い順） */
export function topCompetitors(tools: SeoTool[], n = 3): string[] {
  const counts = new Map<string, number>();
  for (const t of tools) {
    const name = t.primary_competitor_ja || t.primary_competitor;
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([name]) => name);
}

export function categoryTitle(nameJa: string, tools: SeoTool[]): string {
  const comps = topCompetitors(tools, 2);
  const tail = comps.length ? `｜${comps.join("・")}の代替を比較` : "｜SaaSの代替を比較";
  return `${nameJa}のオープンソース${tools.length}選${tail}`;
}

export function categoryDescription(nameJa: string, lede: string, tools: SeoTool[]): string {
  const comps = topCompetitors(tools, 3);
  const ja = tools.filter(hasJa).length;
  const compText = comps.length ? `${listNames(comps)}の代わりになる` : "SaaSの代わりになる";
  const jaText = ja > 0 ? `日本語対応は${ja}件。` : "";
  return clampText(
    `${lede}${compText}${nameJa}のオープンソース${tools.length}件を、ライセンス・更新状況・日本語対応で比較できます。${jaText}`,
    160,
  );
}

/* ------------------------------------------------------------------ *
 * /tools/[slug]/
 * ------------------------------------------------------------------ */

export function toolTitle(tool: SeoTool): string {
  const competitor = tool.primary_competitor_ja || tool.primary_competitor;
  return `${tool.name}とは？${competitor}の代替オープンソース｜特徴・ライセンス・日本語対応`;
}

export function toolDescription(tool: SeoTool): string {
  const competitor = tool.primary_competitor_ja || tool.primary_competitor;
  const lead = tool.description_ja
    ? clampText(tool.description_ja, 80)
    : `${tool.name}は${competitor}の代替候補になるオープンソースです。`;
  const facts: string[] = [];
  if (tool.license) facts.push(`ライセンスは${tool.license}`);
  if (tool.ja_ui === true) facts.push("画面の日本語翻訳あり");
  else if (tool.ja_docs === "official" || tool.ja_docs === "community") facts.push("日本語ドキュメントあり");
  if (tool.docker_available === true) facts.push("Dockerで導入可");
  const factText = facts.length ? `${facts.join("、")}。` : "";
  return clampText(`${lead}${factText}${competitor}の他の代替候補とも比較できます。`, 160);
}
