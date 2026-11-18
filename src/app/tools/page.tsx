import type { Metadata } from "next";
import Link from "next/link";
import { Ja } from "@/components/ja";
import { SiteFooter, SiteHeader, Breadcrumbs } from "@/components/site-chrome";
import { ToolBrowser } from "@/components/tool-browser";
import { getActiveTools, getCompetitors, getMeta } from "@/lib/data";
import { CATEGORIES } from "@/lib/categories";
import { t } from "@/lib/site";
import { pageMeta } from "@/lib/seo";
import { formatCompactJa } from "@/lib/tools";
import { BROWSER_DATA_PATH, browserFacets, initialBrowserTools } from "@/lib/tool-browser-data";
import { buildCategoryDirectory } from "@/lib/tools-hub";
import { isToolNoindex } from "@/lib/search-index";
import { SAAS_IDS, SAAS_LABELS } from "@/lib/diagnosis-types";

// 初期HTMLに入れるツールの件数（一覧の1ページ分。残りは /data/tools.json をブラウザで読み込む）
const INITIAL_TOOLS = 50;
// 分野ごとの一覧に載せる代表ツールの件数
const REPS_PER_CATEGORY = 3;

export const metadata: Metadata = pageMeta({
  title: "オープンソースソフトウェア一覧｜用途・SaaSの代替から探す",
  description:
    "オープンソースソフトウェアの一覧。SaaSの代替候補を、用途・ライセンス・Docker対応・日本語対応・セキュリティ評価から探せます。",
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
  // 分野の絞り込みボタンは JavaScript で動くので、すべての分野と代表ツールを、実リンクでも並べる。
  const directory = buildCategoryDirectory(tools, CATEGORIES, {
    perCategory: REPS_PER_CATEGORY,
    excludeFromReps: isToolNoindex,
  });
  const prioritySaas = getCompetitors().filter((c) =>
    ["notion", "github", "linear", "zapier"].includes(c.slug)
  );

  return (
    <>
      <SiteHeader current="/tools" />
      <main className="wrap page tools-page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: "ツール一覧" }]} />
        <h1 className="h2">オープンソースソフトウェア一覧</h1>
        <p className="lede">
          <Ja>{`${meta.tool_count}件を収録。スター合計は約${formatCompactJa(totalStars)}。セキュリティ評価（OpenSSF Scorecard）は${meta.scored_count}件で取得済み、残り${meta.unrated_count}件は「未評価」として表示しています。`}</Ja>
        </p>
        <ToolBrowser
          tools={initialBrowserTools(tools, INITIAL_TOOLS)}
          facets={browserFacets(tools)}
          dataUrl={BROWSER_DATA_PATH}
          categories={categories}
        />
        <section className="section" aria-labelledby="tools-finding-guide">
          <h2 className="h3" id="tools-finding-guide">SaaSの代わりになるオープンソースは、どう探せばいいですか？</h2>
          <p className="muted" style={{ marginBottom: "1rem" }}>
            今使っているSaaSの名前から探すのが近道です。使いたい用途が先に決まっているなら、下の分野別の一覧から探せます。
          </p>
          <div className="grid-2">
            <div className="panel">
              <div className="panel__head"><h3 className="panel__title">今使っているSaaSの代わりを探すには？</h3></div>
              <div className="panel__body">
                <p className="muted" style={{ marginTop: 0 }}>SaaSごとに、代わりに使えるオープンソースを並べて比べたページがあります。</p>
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
              <div className="panel__head"><h3 className="panel__title">条件が決まっていないときは？</h3></div>
              <div className="panel__body">
                <p className="muted" style={{ marginTop: 0 }}>
                  {`7つの質問に答えると、条件に合う代替候補を示します（対象は${SAAS_IDS.map((id) => SAAS_LABELS[id]).join("・")}の${SAAS_IDS.length}つのSaaS）。`}
                </p>
                <p style={{ marginBottom: 0 }}>
                  <Link href="/diagnosis/">7つの質問からOSSを探す →</Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="tools-categories">
          <h2 className="h3" id="tools-categories">どんな用途のオープンソースがありますか？</h2>
          <p className="muted" style={{ marginBottom: "1rem" }}>
            {`${directory.length}の分野に分けています。分野ごとに、健全度の高いオープンソースを、最大${REPS_PER_CATEGORY}件ずつ挙げています。`}
          </p>
          <ul
            style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.75rem 1.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}
          >
            {directory.map((c) => (
              <li key={c.slug}>
                <Link href={"/categories/" + c.slug + "/"}><strong>{c.nameJa}</strong>（{c.count}件）</Link>
                {c.reps.length > 0 && (
                  <div className="muted" style={{ fontSize: "0.8125rem" }}>
                    {"代表："}
                    {c.reps.map((r, i) => (
                      <span key={r.id}>
                        {i > 0 && "・"}
                        <Link href={"/tools/" + r.id + "/"}>{r.name}</Link>
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p style={{ marginTop: "1rem", marginBottom: 0 }}>
            <Link href="/categories/">分野の一覧ページを見る →</Link>
          </p>
        </section>

        <p className="muted mt1" style={{ fontSize: "0.8125rem" }}>{"※ 並び順の初期値は健全度スコア（スター・フォーク・コントリビュータ・ウォッチャー・更新の新しさから算出）です。"}
          {"数値はGitHubの公開情報にもとづき、データ更新は日次で自動実行されます。"}</p>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
