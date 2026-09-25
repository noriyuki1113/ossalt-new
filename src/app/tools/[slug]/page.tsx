import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, JsonLd, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ToolLogo } from "@/components/tool-logo";
import {
  ComparisonTable,
  HealthLegend,
  HealthMeter,
  ScorecardBadge,
  ScorecardPanel,
  SpecTable,
} from "@/components/tool-views";
import { getActiveTools, getMeta, getTool, getTools } from "@/lib/data";
import { getCategory } from "@/lib/categories";
import { SITE, t } from "@/lib/site";
import { formatDate, licenseLabel, slugifyCompetitor } from "@/lib/tools";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return getTools().map((tool) => ({ slug: tool.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) return { title: t("detail.notFound") };
  const competitor = tool.primary_competitor_ja || tool.primary_competitor;
  return {
    title: `${tool.name} — ${competitor} のオープンソース代替`,
    description:
      tool.description_ja?.slice(0, 110) ??
      `${tool.name}は${competitor}のオープンソース代替候補です。ライセンス・スター数・セキュリティ評価をまとめています。`,
    alternates: { canonical: `/tools/${tool.id}/` },
  };
}

export default async function ToolDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  const meta = getMeta();
  const category = getCategory(tool.category);
  const competitorSlug = slugifyCompetitor(tool.primary_competitor);
  const competitor = tool.primary_competitor_ja || tool.primary_competitor;
  // 「同じカテゴリのツール」「代替候補を比較」に挙げる候補は、アーカイブ済み
  // （開発停止）のツールを除く。閲覧中の tool 自身がアーカイブ済みでも、
  // その情報は本文中の警告表示で伝えるので、ここでは他のツールの推薦から外すだけでよい。
  const sameCategory = getActiveTools()
    .filter((tl) => tl.category === tool.category && tl.id !== tool.id)
    .slice(0, 5);
  const alternatives = getActiveTools()
    .filter(
      (tl) => tl.primary_competitor === tool.primary_competitor && tl.id !== tool.id
    )
    .slice(0, 6);

  const compareSet = [tool, ...alternatives];

  return (
    <>
      <SiteHeader current="/tools" />
      <main className="wrap page">
        <Breadcrumbs
          items={[
            { href: "/", label: "トップ" },
            { href: "/tools/", label: "ツール一覧" },
            ...(category ? [{ href: `/categories/${category.slug}/`, label: category.nameJa }] : []),
            { label: tool.name },
          ]}
        />

        <div className="detail-layout">
          <div>
            <p className="hero__eyebrow" style={{ marginBottom: "0.5rem" }}>
              {category?.nameJa ?? "ツール"} / Open Source
            </p>
            <div className="detail-head">
              <ToolLogo githubUrl={tool.github_url} name={tool.name} size={64} />
              <h1 className="h2" style={{ fontSize: "clamp(2rem, 5vw, 2.75rem)", margin: 0 }}>
                {tool.name}
              </h1>
            </div>
            <p className="lede" style={{ marginBottom: "1.25rem" }}>
              {competitor} のオープンソース代替。
              {tool.description_ja ? ` ${tool.description_ja}` : ""}
            </p>

            {tool.github_archived && (
              <p className="notice notice--warn" style={{ marginBottom: "1.25rem" }}>
                <strong>{t("health.archived")}</strong>{" "}{"このツールは一覧・カテゴリ・比較のページには表示していません（このページのみ残しています）。"}
                {"新規に導入する場合は、下記の「"}{competitor} の代替を全部見る」から他の候補もあわせてご確認ください。
              </p>
            )}

            <div className="hero__actions" style={{ marginBottom: "2rem" }}>
              <a className="btn btn--primary" href={tool.url} rel="noopener">
                公式サイト
              </a>
              <a className="btn" href={tool.github_url} rel="noopener">
                GitHub
              </a>
              {competitorSlug && (
                <Link className="btn" href={`/alternatives/${competitorSlug}/`}>
                  {competitor} の代替を全部見る
                </Link>
              )}
            </div>

            <section>
              <h2 className="h3 mt0">{t("health.title")}</h2>
              <div className="panel">
                <div className="panel__head">
                  <h3 className="panel__title">{t("metric.health")}</h3>
                  <span className="panel__meta">GitHub 公開情報</span>
                </div>
                <div className="panel__body">
                  <div style={{ marginBottom: "0.75rem" }}>
                    <HealthMeter tool={tool} />
                  </div>
                  <HealthLegend tool={tool} />
                  <p className="muted" style={{ fontSize: "0.75rem", marginBottom: 0 }}>
                    {t("health.explain")} {t("health.formulaNote")}
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="h3">スペック</h2>
              <SpecTable tool={tool} />
              <p className="muted" style={{ fontSize: "0.75rem" }}>
                ライセンス表記は「{licenseLabel(tool.license)}」。最終コミット
                {formatDate(tool.last_commit)}時点の情報です。
                {tool.github_archived && " ※このリポジトリはアーカイブされています。"}
              </p>
            </section>

            {tool.description_en && (
              <section>
                <h2 className="h3">公式の説明（英語）</h2>
                <p className="muted" style={{ fontSize: "0.9375rem" }}>
                  {tool.description_en}
                </p>
              </section>
            )}

            {tool.topics.length > 0 && (
              <section>
                <h2 className="h3">トピック</h2>
                <p>
                  {tool.topics.slice(0, 14).map((tp) => (
                    <span className="tag" key={tp}>
                      {tp}
                    </span>
                  ))}
                </p>
              </section>
            )}

          </div>

          <aside className="detail-aside stack">
            <ScorecardPanel tool={tool} />
            <div className="panel">
              <div className="panel__head">
                <h2 className="panel__title">要点</h2>
              </div>
              <div className="panel__body">
                <dl className="spec">
                  <div className="spec__row">
                    <dt className="spec__key">代替対象</dt>
                    <dd className="spec__val">{competitor}</dd>
                  </div>
                  <div className="spec__row">
                    <dt className="spec__key">ライセンス</dt>
                    <dd className="spec__val">{licenseLabel(tool.license)}</dd>
                  </div>
                  <div className="spec__row">
                    <dt className="spec__key">セキュリティ</dt>
                    <dd className="spec__val">
                      <ScorecardBadge tool={tool} />
                    </dd>
                  </div>
                </dl>
                <p className="muted" style={{ fontSize: "0.75rem", marginBottom: 0 }}>
                  {t("footer.disclaimer")}
                </p>
              </div>
            </div>
          </aside>
        </div>

        {/* 比較表・同じカテゴリの一覧は横長になりやすいため、2カラムグリッドの外に出して
            ページ全幅で表示する（detail-layout の中に置くと、aside が grid-row: 1/-1 で
            全行にまたがっているため、追加の行を横幅いっぱいに置けなくなる）。 */}
        {compareSet.length > 1 && (
          <section className="mt2">
            <h2 className="h3">{competitor} の代替候補を比較</h2>
            <ComparisonTable tools={compareSet} />
            <p className="muted mt1" style={{ fontSize: "0.75rem" }}>
              {t("alt.compareNote")}
            </p>
          </section>
        )}

        {sameCategory.length > 0 && (
          <section className="mt2">
            <h2 className="h3">同じカテゴリのツール</h2>
            <ul>
              {sameCategory.map((tl) => (
                <li key={tl.id}>
                  <Link href={`/tools/${tl.id}/`}>{tl.name}</Link>{" "}
                  <span className="muted" style={{ fontSize: "0.8125rem" }}>
                    （{tl.primary_competitor_ja || tl.primary_competitor} の代替）
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <SiteFooter meta={meta} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: tool.name,
          url: tool.url,
          applicationCategory: category?.nameJa ?? "BusinessApplication",
          operatingSystem: "Linux, macOS, Windows",
          description: tool.description_ja ?? undefined,
          license: tool.license ?? undefined,
          sameAs: tool.github_url,
          offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
          // スコアがある場合のみ評価を出力する（未評価を0として出さない）
          ...(tool.scorecard_score != null
            ? {
                review: {
                  "@type": "Review",
                  reviewRating: {
                    "@type": "Rating",
                    ratingValue: tool.scorecard_score,
                    bestRating: 10,
                    worstRating: 0,
                  },
                  author: { "@type": "Organization", name: "OpenSSF Scorecard" },
                },
              }
            : {}),
          isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.url },
        }}
      />
    </>
  );
}
