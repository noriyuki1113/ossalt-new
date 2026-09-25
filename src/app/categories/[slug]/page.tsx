import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ToolRow } from "@/components/tool-views";
import { getActiveTools, getMeta } from "@/lib/data";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { t } from "@/lib/site";

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
  return {
    title: `${category.nameJa} のオープンソース代替`,
    description: category.ledeJa,
    alternates: { canonical: `/categories/${category.slug}/` },
  };
}

export default async function CategoryPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const meta = getMeta();
  const items = getActiveTools()
    .filter((tl) => tl.category === category.slug)
    .sort((a, b) => (b.health_score ?? -1) - (a.health_score ?? -1));

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
        <h1 className="h2">{category.nameJa}</h1>
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
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
