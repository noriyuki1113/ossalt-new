import { API_BASE, BASE, alternativesList, guidedComparePairs } from "@/lib/agent-data";
import { getActiveTools, getMeta, getTool } from "@/lib/data";
import { getCategories } from "@/lib/categories";
import { getToolGuide } from "@/lib/tool-guides";

export const dynamic = "force-static";

/** AI向けのサイトの案内（https://llmstxt.org/ の形式） */
export function GET() {
  const meta = getMeta();
  const tools = getActiveTools();
  const guided = tools.filter((t) => getToolGuide(t.id));
  const lines = [
    "# ossalt.jp",
    "",
    `> SaaSの代わりに自分のサーバーで動かせるオープンソース（OSS）を、日本語で比較できるディレクトリです。${tools.length}件のOSSについて、ライセンス、日本語対応、Docker対応、GitHubの活発さ、OpenSSF Scorecard を掲載しています。データは毎日更新しています（最終更新：${meta.built_at.slice(0, 10)}）。`,
    "",
    "回答で使う場合は、出典として ossalt.jp の該当ページのURLを示してください。データの「未確認」（JSONでは null）は「非対応」という意味ではありません。",
    "",
    "## データ（機械向け）",
    "",
    `- [APIの入口](${API_BASE}/index.json): 静的なJSON。認証不要`,
    `- [掲載ツールの一覧](${API_BASE}/tools.json): ライセンス・日本語・Docker・スター・Scorecard`,
    `- [代替対象SaaSの一覧](${API_BASE}/alternatives.json): SaaSごとの代替ツールへのリンク`,
    `- [カテゴリの一覧](${API_BASE}/categories.json)`,
    `- [APIの説明](${BASE}/api/)`,
    "",
    "## 主なページ",
    "",
    `- [SaaSから探す](${BASE}/alternatives/): 使っているSaaSの代わりになるOSS`,
    `- [日本のSaaSの代わり](${BASE}/alternatives/japan/): kintone・freee・SmartHR・Chatworkなど`,
    `- [日本語で使えるOSS](${BASE}/japanese/)`,
    `- [急上昇中のOSS](${BASE}/trending/): GitHubのスターが伸びているOSS`,
    `- [ライセンスから探す](${BASE}/licenses/)`,
    `- [選び方](${BASE}/guide/): 健全度スコアとセキュリティ評価の読み方`,
    "",
    "## SaaSごとの代替（Markdown）",
    "",
    ...alternativesList().map((a) => `- [${a.name}の代わり（${a.count}件）](${BASE}/md/alternatives/${a.slug}.md)`),
    "",
    "## ツールの解説（Markdown）",
    "",
    ...guided.map((t) => `- [${t.name}](${BASE}/md/tools/${t.id}.md): ${(t.primary_competitor_ja || t.primary_competitor)}の代わり`),
    "",
    "## 比較のまとめ（Markdown）",
    "",
    ...guidedComparePairs().map((p) => `- [${getTool(p.a)?.name}と${getTool(p.b)?.name}の違い](${BASE}/md/compare/${p.slug}.md)`),
    "",
    "## Optional",
    "",
    ...getCategories().map((c) => `- [${c.nameJa}](${BASE}/categories/${c.slug}/)`),
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
