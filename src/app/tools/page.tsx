import type { Metadata } from "next";
import { SiteFooter, SiteHeader, Breadcrumbs } from "@/components/site-chrome";
import { ToolBrowser } from "@/components/tool-browser";
import { getActiveTools, getMeta } from "@/lib/data";
import { CATEGORIES } from "@/lib/categories";
import { t } from "@/lib/site";
import { formatCompactJa } from "@/lib/tools";

export const metadata: Metadata = {
  title: "オープンソースツール一覧",
  description:
    "自前で動かせるオープンソースソフトの一覧。スター数・ライセンス・Docker対応・セキュリティ評価で絞り込めます。",
  alternates: { canonical: "/tools/" },
};

export default function ToolsPage() {
  const tools = getActiveTools();
  const meta = getMeta();
  const categories = CATEGORIES.map((c) => ({
    slug: c.slug,
    nameJa: c.nameJa,
    count: tools.filter((tl) => tl.category === c.slug).length,
  })).filter((c) => c.count > 0);

  const totalStars = tools.reduce((s, tl) => s + (tl.stars_num ?? 0), 0);

  return (
    <>
      <SiteHeader current="/tools" />
      <main className="wrap page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: "ツール一覧" }]} />
        <h1 className="h2">オープンソースツール一覧</h1>
        <p className="lede">
          {meta.tool_count}件を収録。スター合計は約{formatCompactJa(totalStars)}。
          セキュリティ評価（OpenSSF Scorecard）は{meta.scored_count}件で取得済み、
          残り{meta.unrated_count}件は「未評価」として表示しています。
        </p>
        <ToolBrowser tools={tools} categories={categories} />
        <p className="muted mt1" style={{ fontSize: "0.8125rem" }}>
          ※ 並び順の初期値は健全度スコア（スター・フォーク・コントリビュータ・ウォッチャー・更新の新しさから算出）です。
          数値はGitHubの公開情報にもとづき、データ更新は日次で自動実行されます。
        </p>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
