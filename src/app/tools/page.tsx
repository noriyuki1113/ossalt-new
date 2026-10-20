import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader, Breadcrumbs } from "@/components/site-chrome";
import { ToolBrowser } from "@/components/tool-browser";
import { getActiveTools, getCompetitors, getMeta } from "@/lib/data";
import { CATEGORIES } from "@/lib/categories";
import { t } from "@/lib/site";
import { pageMeta } from "@/lib/seo";
import { formatCompactJa } from "@/lib/tools";

export const metadata: Metadata = pageMeta({
  title: "オープンソースツール一覧",
  description:
    "自前で動かせるオープンソースソフトの一覧。スター数・ライセンス・Docker対応・セキュリティ評価で絞り込めます。",
  path: "/tools/",
});

export default function ToolsPage() {
  const tools = getActiveTools();
  const meta = getMeta();
  const categories = CATEGORIES.map((c) => ({
    slug: c.slug,
    nameJa: c.nameJa,
    count: tools.filter((tl) => tl.category === c.slug).length,
  })).filter((c) => c.count > 0);

  const totalStars = tools.reduce((s, tl) => s + (tl.stars_num ?? 0), 0);
  // 存在するカテゴリ・SaaSだけをナビゲーションに出し、リンク切れを防ぐ。
  const priorityCategories = CATEGORIES.filter((c) =>
    ["note-docs", "devtools", "project", "automation"].includes(c.slug) && c.count > 0
  );
  const prioritySaas = getCompetitors().filter((c) =>
    ["notion", "github", "linear", "zapier"].includes(c.slug)
  );

  return (
    <>
      <SiteHeader current="/tools" />
      <main className="wrap page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: "ツール一覧" }]} />
        <h1 className="h2">オープンソースツール一覧</h1>
        <p className="lede">
          {meta.tool_count}件を収録。スター合計は約{formatCompactJa(totalStars)}{"。セキュリティ評価（OpenSSF Scorecard）は"}{meta.scored_count}{"件で取得済み、残り"}{meta.unrated_count}件は「未評価」として表示しています。
        </p>
        <section className="section" aria-labelledby="tools-finding-guide">
          <h2 className="h3" id="tools-finding-guide">オープンソースの探し方</h2>
          <p className="muted" style={{ marginBottom: "1rem" }}>
            使っているSaaSの代わりを探すか、目的から探すかを選べます。
            迷った場合は条件を整理してから候補を比較してください。
          </p>
          <div className="grid-2">
            <div className="panel">
              <div className="panel__head"><h3 className="panel__title">今使っているSaaSから探す</h3></div>
              <div className="panel__body">
                <ul style={{ margin: 0 }}>
                  {prioritySaas.map((c) => (
                    <li key={c.slug}>
                      <Link href={"/alternatives/" + c.slug + "/"}>{c.name}の代替OSSを比較</Link>
                    </li>
                  ))}
                </ul>
                <p style={{ marginBottom: 0, marginTop: "0.75rem" }}>
                  <Link href="/alternatives/">他のSaaSから探す →</Link>
                </p>
              </div>
            </div>
            <div className="panel">
              <div className="panel__head"><h3 className="panel__title">使いたい用途から探す</h3></div>
              <div className="panel__body">
                <ul style={{ margin: 0 }}>
                  {priorityCategories.map((c) => (
                    <li key={c.slug}>
                      <Link href={"/categories/" + c.slug + "/"}>{c.nameJa}</Link>
                    </li>
                  ))}
                </ul>
                <p style={{ marginBottom: 0, marginTop: "0.75rem" }}>
                  <Link href="/categories/">全カテゴリを見る →</Link>
                </p>
              </div>
            </div>
          </div>
          <p style={{ marginTop: "1rem" }}>
            <Link href="/diagnosis/">条件が決まっていない方は、6つの質問からOSSを探す →</Link>
          </p>
        </section>

        <ToolBrowser tools={tools} categories={categories} />
        <p className="muted mt1" style={{ fontSize: "0.8125rem" }}>{"※ 並び順の初期値は健全度スコア（スター・フォーク・コントリビュータ・ウォッチャー・更新の新しさから算出）です。"}
          {"数値はGitHubの公開情報にもとづき、データ更新は日次で自動実行されます。"}</p>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
