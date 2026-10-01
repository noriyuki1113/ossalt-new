import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ToolRow } from "@/components/tool-views";
import { getActiveTools, getComparePairs, getCompetitors, getMeta } from "@/lib/data";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { t } from "@/lib/site";
import { pageMeta } from "@/lib/seo";
import { categoryDescription, categoryTitle } from "@/lib/seo-copy";
import { getCategoryGuide } from "@/lib/category-guides";
import { formatDate } from "@/lib/tools";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) return { title: t("detail.notFound") };
  const items = getActiveTools().filter((tl) => tl.category === category.slug);
  return pageMeta({
    title: categoryTitle(category.nameJa, items),
    description: categoryDescription(category.nameJa, category.ledeJa, items),
    path: `/categories/${category.slug}/`,
  });
}

export default async function CategoryPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const meta = getMeta();
  const items = getActiveTools()
    .filter((tl) => tl.category === category.slug)
    .sort((a, b) => (b.health_score ?? -1) - (a.health_score ?? -1));
  const itemIds = new Set(items.map((tl) => tl.id));
  // このカテゴリのツールが代替するSaaS（件数の多い順）
  const competitors = getCompetitors()
    .map((c) => ({ ...c, n: c.tools.filter((tl) => itemIds.has(tl.id)).length }))
    .filter((c) => c.n > 0)
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  const toolName = new Map(items.map((tl) => [tl.id, tl.name]));
  const guide = getCategoryGuide(category.slug);
  const pairs = getComparePairs()
    .filter((p) => itemIds.has(p.a) && itemIds.has(p.b))
    .slice(0, 8);

  return (
    <>
      <SiteHeader current="/categories" />
      <main className="wrap page">
        <Breadcrumbs
          items={[
            { href: "/", label: "トップ" },
            { href: "/categories/", label: "カテゴリ" },
            { label: category.nameJa },
          ]}
        />
        <h1 className="h2">{category.nameJa}のオープンソース</h1>
        <p className="lede">
          {category.ledeJa} 現在{t("cat.count", { n: items.length })}を収録しています。
        </p>

        {items.length === 0 ? (
          <div className="empty">{t("cat.empty")}</div>
        ) : (
          <div className="ledger">
            {items.map((tool) => (
              <ToolRow key={tool.id} tool={tool} />
            ))}
          </div>
        )}

        {guide && (
          <section className="mt2">
            <h2 className="h3">{`${category.nameJa}のオープンソースの選び方`}</h2>
            <div className="prose" dangerouslySetInnerHTML={{ __html: guide.contentHtml }} />
            {guide.updated && (
              <p className="muted" style={{ fontSize: "0.75rem" }}>
                {`最終更新：${formatDate(guide.updated)}`}
              </p>
            )}
          </section>
        )}

        {competitors.length > 0 && (
          <section className="mt2">
            <h2 className="h3">代替するSaaSから探す</h2>
            <p className="muted">いま使っているサービスの名前から、代わりになるオープンソースをまとめて比べられます。</p>
            <div className="chips">
              {competitors.map((c) => (
                <Link key={c.slug} className="chip" href={`/alternatives/${c.slug}/`}>
                  {c.name}の代替（{c.n}件）
                </Link>
              ))}
            </div>
          </section>
        )}

        {pairs.length > 0 && (
          <section className="mt2">
            <h2 className="h3">2つを比べる</h2>
            <ul>
              {pairs.map((p) => (
                <li key={p.slug}>
                  <Link href={`/compare/${p.slug}/`}>
                    {toolName.get(p.a)} と {toolName.get(p.b)} の違い
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
