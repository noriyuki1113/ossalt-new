import type { Metadata } from "next";
import { ForYouLink } from "@/components/for-you-link";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, JsonLd, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ComparisonTable } from "@/components/tool-views";
import { TrackView } from "@/components/track-view";
import { HouseAd } from "@/components/house-ad";
import { SponsorSlot } from "@/components/sponsor-slot";
import { getAlternativeGuide } from "@/lib/alternative-guides";
import { AlternativeDecisionPanel } from "@/components/alternative-decision";
import { buildAlternativeDecision } from "@/lib/alternative-decision";
import { TOOL_DIAGNOSIS } from "@/lib/diagnosis-data";
import { getStanding } from "@/lib/ranking-positions";
import { getComparePairs, getCompetitor, getCompetitors, getMeta, getTool } from "@/lib/data";
import { SITE, t } from "@/lib/site";
import { pageMeta } from "@/lib/seo";
import { alternativeDescription, alternativeTitle } from "@/lib/seo-copy";
import { buildAlternativeFaq } from "@/lib/alternative-faq";
import { JAPAN_SAAS_GROUPS } from "@/lib/japan-saas";
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
  return pageMeta({
    title: guide?.title
      ? guide.title.replace("{n}", String(c.tools.length)).replace("{year}", String(new Date(getMeta().built_at).getFullYear()))
      : alternativeTitle(c.name, c.tools, new Date(getMeta().built_at).getFullYear()),
    description: guide?.description || alternativeDescription(c.name, c.tools),
    path: `/alternatives/${c.slug}/`,
    type: "article",
    markdown: `/md/alternatives/${c.slug}.md`,
  });
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
  const toolIds = new Set(c.tools.map((tl) => tl.id));
  const comparePairs = getComparePairs().filter((p) => toolIds.has(p.a) && toolIds.has(p.b));
  const faq = buildAlternativeFaq(c.name, c.tools);
  const decision = buildAlternativeDecision(slug, c.name, c.tools, Object.values(TOOL_DIAGNOSIS), (id) => getStanding(id));
  // 手書きの解説に、移行の注意・「のままのほうがよい場合」の見出しがあれば、要約からそこへ飛べるようにする
  let guideHtml = guide?.contentHtml ?? "";
  const hasMigration = /<h2>移行するときの注意<\/h2>/.test(guideHtml);
  const hasStay = /<h2>[^<]*のままの(ほう|方)がよい場合<\/h2>/.test(guideHtml);
  guideHtml = guideHtml
    .replace(/<h2>(移行するときの注意)<\/h2>/, '<h2 id="migration">$1</h2>')
    .replace(/<h2>([^<]*のままの(?:ほう|方)がよい場合)<\/h2>/, '<h2 id="stay">$1</h2>');

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
        <TrackView event="saas_alternative_viewed" props={{ slug: c.slug, candidate_count: c.tools.length }} dedupeKey={c.slug} />
        <h1 className="h2">{t("alt.h1", { competitor: c.name })}</h1>
        <p className="lede">
          {t("alt.ledeOne", { competitor: c.name, n: c.tools.length })}
        </p>
        {guide?.intro && <p>{guide.intro}</p>}

        <nav className="alt-jump" aria-label="このページの内容">
          {decision.rows.length > 0 && <a href="#choose">結局どれを選ぶ？</a>}
          <a href="#all-candidates">全候補の比較表</a>
          {hasMigration && <a href="#migration">移行の注意</a>}
          {comparePairs.length > 0 && <a href="#pairs">2つずつ比べる</a>}
          <Link href={`/cost-lab/?saas=${c.slug}`}>費用を試算</Link>
        </nav>

        <AlternativeDecisionPanel
          saasName={c.name}
          slug={c.slug}
          decision={decision}
          picks={(guide?.picks ?? []).map((p) => ({ ...p, name: getTool(p.tool)?.name ?? p.tool }))}
          hasMigration={hasMigration}
          hasStay={hasStay}
          asOf={formatDate(meta.stars_as_of ?? meta.built_at)}
        />

        <div className="notice notice--info mt2">
          <strong>乗り換えの判断について</strong>
          <br />
          {t("alt.compareNote")}
          <br />
          <Link href={`/cost-lab/?saas=${c.slug}`} data-umami-event="cost_lab_entry" data-umami-event-from="alternative">
            {c.name}を使い続ける場合との費用を、Cost Labで比べる
          </Link>
        </div>

        <section id="all-candidates" className="section" aria-label="全候補の比較表">
          <ComparisonTable tools={c.tools} />
        </section>

        <ForYouLink query={{ saas: c.slug }}>{`条件を指定して、${c.name}の代替を理由つきで並べ替える（OSSALT For You）`}</ForYouLink>

        <SponsorSlot placement="alternative" slug={c.slug} />
        <HouseAd placement={`alternative_${c.slug}`} />

        {guide && (
          <section className="section">
            <div className="prose" dangerouslySetInnerHTML={{ __html: guideHtml }} />
            {guide.updated && (
              <p className="muted" style={{ fontSize: "0.75rem" }}>
                {`最終更新：${formatDate(guide.updated)}。機能・ライセンス・提供条件は変わることがあるため、導入前に各ツールの公式情報をご確認ください。`}
              </p>
            )}
          </section>
        )}

        {faq.length > 0 && (
          <section className="section">
            <h2 className="h3">{`${c.name}の代替についてよくある質問`}</h2>
            <p className="muted" style={{ fontSize: "0.8125rem" }}>
              {"回答は掲載データ（GitHubの公開情報）から自動でまとめています。"}
            </p>
            <dl className="faq">
              {faq.map((f) => (
                <div key={f.q}>
                  <dt>{f.q}</dt>
                  <dd>{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {comparePairs.length > 0 && (
          <section id="pairs" className="section">
            <h2 className="h3">2つずつ比べる</h2>
            <ul>
              {comparePairs.map((p) => (
                <li key={p.slug}>
                  <Link href={`/compare/${p.slug}/`}>
                    {`${getTool(p.a)?.name ?? p.a} と ${getTool(p.b)?.name ?? p.b} の違い`}
                  </Link>
                </li>
              ))}
            </ul>
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
          {JAPAN_SAAS_GROUPS.some((g) => g.slugs.includes(c.slug)) && (
            <p>
              <Link href="/alternatives/japan/">日本のSaaSの代わりになるオープンソースのまとめ</Link>
            </p>
          )}
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
