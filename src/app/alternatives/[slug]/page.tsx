import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, JsonLd, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ComparisonTable } from "@/components/tool-views";
import { HouseAd } from "@/components/house-ad";
import { getAlternativeGuide } from "@/lib/alternative-guides";
import { getCompetitor, getCompetitors, getMeta, getTool } from "@/lib/data";
import { SITE, t } from "@/lib/site";
import { formatDate } from "@/lib/tools";

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
  const guide = getAlternativeGuide(slug);
  return {
    title: `${c.name} のオープンソース代替 ${c.tools.length}選`,
    description:
      guide?.description ||
      `${c.name} の代わりに自前で動かせるオープンソースソフトを、ライセンス・スター数・セキュリティ評価つきで比較できます。`,
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
  const guide = getAlternativeGuide(slug);

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
        {guide?.intro && <p>{guide.intro}</p>}

        <ComparisonTable tools={c.tools} />

        <div className="notice notice--info mt2">
          <strong>乗り換えの判断について</strong>
          <br />
          {t("alt.compareNote")}
        </div>

        <HouseAd placement={`alternative_${c.slug}`} />

        {guide && guide.picks.length > 0 && (
          <section className="section">
            <h2 className="h3">用途別の候補</h2>
            <p className="muted" style={{ fontSize: "0.8125rem" }}>
              {"編集部が機能と性格から整理した目安です。上の比較表の並び（健全度順）とは別の観点です。"}
            </p>
            <ul>
              {guide.picks.map((p) => (
                <li key={p.tool} style={{ marginBottom: "0.5rem" }}>
                  <Link href={`/tools/${p.tool}/`}>{getTool(p.tool)?.name ?? p.tool}</Link>
                  {"："}
                  {p.fit}
                </li>
              ))}
            </ul>
          </section>
        )}

        {guide && (
          <section className="section">
            <div className="prose" dangerouslySetInnerHTML={{ __html: guide.contentHtml }} />
            {guide.updated && (
              <p className="muted" style={{ fontSize: "0.75rem" }}>
                {`最終更新：${formatDate(guide.updated)}。機能・ライセンス・提供条件は変わることがあるため、導入前に各ツールの公式情報をご確認ください。`}
              </p>
            )}
          </section>
        )}

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
