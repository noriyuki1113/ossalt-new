import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, JsonLd, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ComparisonTable } from "@/components/tool-views";
import { getCompetitor, getCompetitors, getMeta } from "@/lib/data";
import { SITE, t } from "@/lib/site";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return getCompetitors().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = getCompetitor(slug);
  if (!c) return { title: t("detail.notFound") };
  return {
    title: `${c.name} のオープンソース代替 ${c.tools.length}選`,
    description: `${c.name} の代わりに自前で動かせるオープンソースソフトを、ライセンス・スター数・セキュリティ評価つきで比較できます。`,
    alternates: { canonical: `/alternatives/${c.slug}/` },
  };
}

export default async function AlternativeDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const c = getCompetitor(slug);
  if (!c) notFound();
  const meta = getMeta();

  return (
    <>
      <SiteHeader current="/alternatives" />
      <main className="wrap page">
        <Breadcrumbs
          items={[
            { href: "/", label: "トップ" },
            { href: "/alternatives/", label: "SaaSから探す" },
            { label: c.name },
          ]}
        />
        <h1 className="h2">{t("alt.h1", { competitor: c.name })}</h1>
        <p className="lede">
          {t("alt.ledeOne", { competitor: c.name, n: c.tools.length })}
        </p>

        <ComparisonTable tools={c.tools} />

        <div className="notice notice--info mt2">
          <strong>乗り換えの判断について</strong>
          <br />
          {t("alt.compareNote")}
        </div>

        <section className="section">
          <h2 className="h3">この候補の詳細</h2>
          <ul>
            {c.tools.map((tool) => (
              <li key={tool.id} style={{ marginBottom: "0.5rem" }}>
                <Link href={`/tools/${tool.id}/`}>{tool.name}</Link>
                <br />
                <span className="muted" style={{ fontSize: "0.8125rem" }}>
                  {tool.description_ja?.slice(0, 80) ?? ""}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="section">
          <h2 className="h3">ほかのSaaSの代替を探す</h2>
          <p>
            <Link href="/alternatives/">代替対象SaaSの一覧へ</Link>
          </p>
        </section>
      </main>
      <SiteFooter meta={meta} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `${c.name} のオープンソース代替`,
          numberOfItems: c.tools.length,
          inLanguage: "ja",
          isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.url },
          itemListElement: c.tools.map((tool, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: tool.name,
            url: `${SITE.url}/tools/${tool.id}/`,
          })),
        }}
      />
    </>
  );
}
