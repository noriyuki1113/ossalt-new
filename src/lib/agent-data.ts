/**
 * AIエージェント・プログラム向けのデータ（サーバー専用・ビルド時に静的ファイルとして書き出す）
 *
 *   /llms.txt                       … AI向けのサイトの案内
 *   /api/v1/index.json              … APIの入口（一覧・利用条件）
 *   /api/v1/tools.json              … 掲載ツールの一覧
 *   /api/v1/tools/<id>.json         … ツールの詳細
 *   /api/v1/alternatives.json       … 代替対象SaaSの一覧
 *   /api/v1/alternatives/<slug>.json… SaaSごとの代替ツール
 *   /api/v1/categories.json         … カテゴリの一覧
 *   /md/tools/<id>.md               … ツールのMarkdown版
 *   /md/alternatives/<slug>.md      … 代替ページのMarkdown版
 *   /md/compare/<a>-vs-<b>.md       … 比較のまとめのMarkdown版（手書きのまとめがある組のみ）
 *
 * 整形は src/lib/agent-format.ts（テスト付き）。
 */
import { getAlternativeGuide } from "./alternative-guides";
import { getCategories, getCategory } from "./categories";
import { getCompareGuide } from "./compare-guides";
import { getActiveTools, getComparePairs, getCompetitor, getCompetitors, getMeta, getTool } from "./data";
import { getToolGuide } from "./tool-guides";
import { SITE } from "./site";
import { API_VERSION, alternativeMarkdown, toolMarkdown, toolRecord, toolSummary, type ToolRecord } from "./agent-format";
import type { Tool } from "./tools";

export const BASE = SITE.url.replace(/\/$/, "");
export const API_BASE = `${BASE}/api/${API_VERSION}`;

export const DATA_NOTICE = {
  source: "ossalt.jp（https://ossalt.jp/）",
  attribution: "このデータを使って回答・掲載する場合は、出典として ossalt.jp の該当ページのURLを示してください。",
  null_means: "null は「取得できていない・確認できていない」という意味です。「非対応」「無い」という意味ではありません。",
  disclaimer: "GitHubの公開データとリポジトリの自動調査に基づく参考情報です。導入前に各ツールの公式情報を確認してください。",
};

export function record(t: Tool): ToolRecord {
  return toolRecord(t, { base: BASE, categoryName: getCategory(t.category)?.nameJa ?? null });
}

export const json = (data: unknown) =>
  new Response(JSON.stringify(data, null, 1), { headers: { "Content-Type": "application/json; charset=utf-8" } });

export const markdown = (text: string) =>
  new Response(text, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });

export function builtAt(): string {
  return getMeta().built_at;
}

export function toolsList() {
  return getActiveTools().map((t) => toolSummary(record(t)));
}

export function toolDetail(id: string) {
  const t = getTool(id);
  if (!t) return null;
  const pairs = getComparePairs().filter((p) => p.a === id || p.b === id);
  return {
    ...record(t),
    compare_pages: pairs.map((p) => `${BASE}/compare/${p.slug}/`),
    updated_at: builtAt(),
    notice: DATA_NOTICE,
  };
}

export function toolMd(id: string): string | null {
  const t = getTool(id);
  if (!t) return null;
  return toolMarkdown(record(t), { guideMarkdown: getToolGuide(id)?.markdown, builtAt: builtAt() });
}

export function alternativesList() {
  return getCompetitors().map((c) => ({
    slug: c.slug,
    name: c.name,
    count: c.tools.length,
    page_url: `${BASE}/alternatives/${c.slug}/`,
    api_url: `${API_BASE}/alternatives/${c.slug}.json`,
  }));
}

export function alternativeDetail(slug: string) {
  const c = getCompetitor(slug);
  if (!c) return null;
  const guide = getAlternativeGuide(slug);
  return {
    slug: c.slug,
    name: c.name,
    page_url: `${BASE}/alternatives/${c.slug}/`,
    markdown_url: `${BASE}/md/alternatives/${c.slug}.md`,
    intro: guide?.intro || null,
    picks: guide?.picks.map((p) => ({ tool: p.tool, fit: p.fit })) ?? [],
    tools: c.tools.map((t) => toolSummary(record(t))),
    updated_at: builtAt(),
    notice: DATA_NOTICE,
  };
}

export function alternativeMd(slug: string): string | null {
  const c = getCompetitor(slug);
  if (!c) return null;
  const guide = getAlternativeGuide(slug);
  return alternativeMarkdown(c.name, `${BASE}/alternatives/${c.slug}/`, c.tools.map(record), {
    intro: guide?.intro,
    guideMarkdown: guide?.markdown,
    builtAt: builtAt(),
  });
}

export function categoriesList() {
  const tools = getActiveTools();
  return getCategories().map((c) => ({
    slug: c.slug,
    name_ja: c.nameJa,
    count: tools.filter((t) => t.category === c.slug).length,
    page_url: `${BASE}/categories/${c.slug}/`,
  }));
}

/** 手書きのまとめがある比較の組 */
export function guidedComparePairs() {
  return getComparePairs().filter((p) => getCompareGuide(p.slug));
}

export function compareMd(slug: string): string | null {
  const p = getComparePairs().find((x) => x.slug === slug);
  const guide = getCompareGuide(slug);
  const a = p && getTool(p.a);
  const b = p && getTool(p.b);
  if (!p || !guide || !a || !b) return null;
  const ra = record(a);
  const rb = record(b);
  return [
    `# ${a.name}と${b.name}の違い`,
    "",
    `ossalt.jp のページ: ${BASE}/compare/${slug}/`,
    "",
    guide.markdown,
    "",
    "## 両方の詳細",
    "",
    `- ${a.name}: ${ra.markdown_url}`,
    `- ${b.name}: ${rb.markdown_url}`,
    "",
    "---",
    `ossalt.jp 編集部のまとめ（${guide.updated}）。機能や提供条件は変わることがあるため、導入前に公式の情報を確認してください。`,
  ].join("\n") + "\n";
}
