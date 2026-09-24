import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getMeta, getTools } from "@/lib/data";
import { CATEGORIES } from "@/lib/categories";
import { t } from "@/lib/site";

export const metadata: Metadata = {
  title: "カテゴリから探す",
  description:
    "用途別にオープンソース代替ソフトを探せます。ノート、チャット、プロジェクト管理、解析、認証、開発基盤など。",
  alternates: { canonical: "/categories/" },
};

export default function CategoriesPage() {
  const tools = getTools();
  const meta = getMeta();
  const withCount = CATEGORIES.map((c) => ({
    ...c,
    items: tools.filter((tl) => tl.category === c.slug),
  })).filter((c) => c.items.length > 0);

  return (
    <>
      <SiteHeader current="/categories" />
      <main className="wrap page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: "カテゴリ" }]} />
        <h1 className="h2">{t("cat.title")}</h1>
        <p className="lede">{t("cat.lede")}</p>

        <div className="grid-2">
          {withCount.map((c) => (
            <div className="panel" key={c.slug}>
              <div className="panel__head">
                <h2 className="panel__title">
                  <Link href={`/categories/${c.slug}/`}>{c.nameJa}</Link>
                </h2>
                <span className="panel__meta">{t("cat.count", { n: c.items.length })}</span>
              </div>
              <div className="panel__body">
                <p className="muted" style={{ margin: "0 0 0.75rem", fontSize: "0.875rem" }}>
                  {c.ledeJa}
                </p>
                <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.875rem" }}>
                  {c.items.slice(0, 4).map((tl) => (
                    <li key={tl.id}>
                      <Link href={`/tools/${tl.id}/`}>{tl.name}</Link>{" "}
                      <span className="muted">
                        ← {tl.primary_competitor_ja || tl.primary_competitor}
                      </span>
                    </li>
                  ))}
                  {c.items.length > 4 && (
                    <li className="muted">ほか{c.items.length - 4}件</li>
                  )}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
