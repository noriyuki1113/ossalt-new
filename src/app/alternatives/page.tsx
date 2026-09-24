import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getCompetitors, getMeta } from "@/lib/data";
import { t } from "@/lib/site";

export const metadata: Metadata = {
  title: "SaaSから探す",
  description:
    "使っているSaaSを選ぶと、そのオープンソース代替候補を一覧できます。Notion・Slack・Airtable・Google Analytics など。",
  alternates: { canonical: "/alternatives/" },
};

export default function AlternativesPage() {
  const competitors = getCompetitors();
  const meta = getMeta();

  return (
    <>
      <SiteHeader current="/alternatives" />
      <main className="wrap page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: "SaaSから探す" }]} />
        <h1 className="h2">{t("alt.title")}</h1>
        <p className="lede">{t("alt.lede")}</p>

        <div className="panel">
          <div className="panel__head">
            <h2 className="panel__title">代替対象SaaS</h2>
            <span className="panel__meta">{competitors.length}件</span>
          </div>
          <div className="panel__body">
            <div className="chips">
              {competitors.map((c) => (
                <Link
                  key={c.slug}
                  href={`/alternatives/${c.slug}/`}
                  className="chip"
                  style={{ textDecoration: "none" }}
                >
                  {c.name}
                  <span className="chip__n">{c.tools.length}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
