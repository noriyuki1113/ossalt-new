import Link from "next/link";
import { SiteFooter, SiteHeader, JsonLd } from "@/components/site-chrome";
import { HouseAd } from "@/components/house-ad";
import { HomeRankings, type HomeRow } from "@/components/home-rankings";
import { PopularSaas, SaasSearch, type SaasEntry } from "@/components/saas-search";
import { getActiveTools, getCompetitors, getMeta } from "@/lib/data";
import { TOOL_DIAGNOSIS } from "@/lib/diagnosis-data";
import { SAAS_IDS, SAAS_LABELS } from "@/lib/diagnosis-types";
import { buildGrowth, buildPopularity, buildRecommended } from "@/lib/rankings";
import { CATEGORIES } from "@/lib/categories";
import { SITE, t } from "@/lib/site";
import { formatCompactJa, formatDate, slugifyCompetitor } from "@/lib/tools";
import { buildActivityReport } from "@/lib/watch-changes";
import { getWatchSignalFeed } from "@/lib/watch-signals";

export default function HomePage() {
  const tools = getActiveTools();
  const meta = getMeta();
  const changes = buildActivityReport(getActiveTools(), getWatchSignalFeed());
  const asOf = formatDate(meta.stars_as_of ?? meta.built_at);

  // SaaS名から探す：このSaaS自身を指す名前（英語名・日本語名・指定した別名）だけを候補に使う。
  // 同じグループのツールが、別のSaaSの代替でもある場合に、その名前を拾わないようにする。
  const saasEntries: SaasEntry[] = getCompetitors().map((c) => {
    const names = new Set<string>();
    for (const tl of c.tools) {
      if (slugifyCompetitor(tl.primary_competitor) === c.slug) {
        names.add(tl.primary_competitor);
        if (tl.primary_competitor_ja) names.add(tl.primary_competitor_ja);
      }
      for (const n of tl.also_competitors ?? []) if (slugifyCompetitor(n) === c.slug) names.add(n);
    }
    names.delete(c.name);
    return { slug: c.slug, name: c.name, aliases: [...names], count: c.tools.length };
  });

  // トップのランキング（3種類。計算の根拠は /rankings/）
  const row = (t: (typeof tools)[number], headline: string, sub: string): HomeRow => ({
    id: t.id, name: t.name, headline, sub,
    meta: `${t.primary_competitor_ja || t.primary_competitor}の代替`,
  });
  const popularRows = buildPopularity(tools).rows.slice(0, 5)
    .map((r) => row(r.tool, `★${formatCompactJa(r.tool.stars_num)}`, `Fork ${formatCompactJa(r.tool.forks_num)}`));
  const growthRows = buildGrowth(tools).rows.slice(0, 5)
    .map((r) => row(r.tool, r.parts[0].value, `7日間（実測${r.window7.days}日）`));
  const rec = buildRecommended(tools, Object.values(TOOL_DIAGNOSIS));
  const recommendedGroups = SAAS_IDS.filter((s) => rec.bySaas[s]?.length).map((s) => ({
    saas: s,
    label: SAAS_LABELS[s],
    rows: rec.bySaas[s]!.slice(0, 3).map((r) => row(r.tool, `${r.score}点`, "100点満点")),
  }));
  const categoriesWithCount = CATEGORIES.map((c) => ({
    ...c,
    count: tools.filter((tl) => tl.category === c.slug).length,
  })).filter((c) => c.count > 0);

  return (
    <>
      <SiteHeader current="/" />
      <main className="wrap home-page">
        <section className="hero">
          <p className="hero__eyebrow">Open Source Alternatives / for Japanese teams</p>
          <h1 className="hero__title">
            そのSaaS、
            <br />
            <em>自分のサーバ</em>で
            <span className="hl">動かせる。</span>
          </h1>
          <SaasSearch entries={saasEntries} />
          <PopularSaas entries={saasEntries} />
          <p className="hero__lede">
            {t("home.lede", { n: meta.tool_count })}{"料金だけでは判断できない、ライセンス・セキュリティ・更新の勢いまで並べて出します。"}</p>
          <div className="hero__actions">
            <Link className="btn" href="/tools/">
              {t("home.cta.browse")}
            </Link>
            <Link className="btn" href="/guide/">
              {t("home.cta.guide")}
            </Link>
          </div>
        </section>

        <div className="home-cards">
          <section className="panel" aria-labelledby="home-diag">
            <div className="panel__body">
              <div>
                <h2 id="home-diag" style={{ margin: "0 0 0.25rem", fontSize: "var(--step-1)" }}>
                  どのOSSを選べばいいか迷っていますか？
                </h2>
                <p className="muted" style={{ margin: 0, fontSize: "0.875rem" }}>
                  7つの質問（日本語・商用利用・予算も）に答えるだけで、条件に合うOSSと、向かない点を示します。約2分・登録不要。
                </p>
              </div>
              <div>
                <Link className="btn btn--primary" href="/diagnosis/">
                  OSS診断をはじめる →
                </Link>
              </div>
            </div>
          </section>
          <section className="panel" aria-labelledby="home-cost">
            <div className="panel__body">
              <div>
                <h2 id="home-cost" style={{ margin: "0 0 0.25rem", fontSize: "var(--step-1)" }}>
                  乗り換えると、いくら変わる？
                </h2>
                <p className="muted" style={{ margin: 0, fontSize: "0.875rem" }}>
                  人数・サーバー代・運用の手間から、SaaSとOSSの総費用を比べます。入力は端末の中だけで計算します。
                </p>
              </div>
              <div>
                <Link className="btn" href="/cost-lab/">
                  Cost Labで試算する →
                </Link>
              </div>
            </div>
          </section>
        </div>

        <div className="stats" style={{ marginTop: "2.5rem" }}>
          <div className="stat">
            <span className="stat__num">
              {meta.tool_count}
              <small>件</small>
            </span>
            <span className="stat__label">{t("stats.tools")}</span>
          </div>
          <div className="stat">
            <span className="stat__num">
              {meta.competitors ?? "—"}
              <small>SaaS</small>
            </span>
            <span className="stat__label">{t("stats.alternatives")}</span>
          </div>
          <div className="stat">
            <span className="stat__num">{meta.categories ?? categoriesWithCount.length}</span>
            <span className="stat__label">{t("stats.categories")}</span>
          </div>
          <div className="stat">
            <span className="stat__num">
              {meta.scored_count}
              <small>
                /{meta.tool_count}
              </small>
            </span>
            <span className="stat__label">{t("stats.scored")}</span>
          </div>
        </div>

        {changes.rows.length > 0 && (
          <section className="panel" aria-labelledby="watch-home-heading"
            style={{ marginTop: "1.4rem", borderTop: "3px solid var(--indigo)" }}>
            <div className="panel__body" style={{ display: "flex", gap: "1.2rem",
              alignItems: "center", flexWrap: "wrap", paddingTop: "1.2rem", paddingBottom: "1.2rem" }}>
              <div style={{ flex: "1 1 20rem" }}>
                <span className="mono" style={{ fontSize: ".72rem", color: "var(--shu)" }}>
                  OSSALT / OBSERVATION DESK
                </span>
                <h2 id="watch-home-heading" style={{ fontSize: "1.25rem", margin: ".35rem 0" }}>
                  重要な変化を、見逃さない。
                </h2>
                <p className="muted" style={{ fontSize: ".85rem", margin: 0 }}>
                  {changes.rows.length}件のOSSを継続観測中。
                  {changes.changed > 0 ? "直近で" + changes.changed + "件の注目シグナルを確認しています。" :
                    "観測した活動と、検証できた変化だけを紹介します。"}
                  履歴が足りない項目は推測しません。
                </p>
              </div>
              <Link className="btn" href="/changes/">OSSの変化レポートを見る →</Link>
            </div>
          </section>
        )}

        <section className="section section--first" aria-labelledby="home-rank-h">
          <div className="section__head">
            <h2 id="home-rank-h">ランキングで見る</h2>
            <Link className="more" href="/tools/">
              全{meta.tool_count}件 →
            </Link>
          </div>
          <HomeRankings popular={popularRows} growth={growthRows} recommended={recommendedGroups} asOf={asOf} />
        </section>

        <section className="section">
          <div className="section__head">
            <h2>用途から探す</h2>
            <Link className="more" href="/categories/">
              カテゴリ一覧 →
            </Link>
          </div>
          <div className="grid-2">
            {categoriesWithCount.slice(0, 6).map((c) => (
              <div className="panel" key={c.slug}>
                <div className="panel__head">
                  <h3 className="panel__title">
                    <Link href={`/categories/${c.slug}/`}>{c.nameJa}</Link>
                  </h3>
                  <span className="panel__meta">{c.count}件</span>
                </div>
                <div className="panel__body">
                  <p className="muted" style={{ margin: "0 0 0.75rem", fontSize: "0.875rem" }}>
                    {c.ledeJa}
                  </p>
                  <p className="mono" style={{ margin: 0, fontSize: "0.8125rem" }}>
                    {tools
                      .filter((tl) => tl.category === c.slug)
                      .slice(0, 3)
                      .map((tl) => tl.name)
                      .join(" / ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <HouseAd placement="home_bottom" />

        <section className="section">
          <div className="section__head">
            <h2>乗り換えを検討するときの注意</h2>
          </div>
          <div className="grid-2">
            <div className="notice notice--info">
              <strong>「オープンソースなら安全」ではありません。</strong>
              <br />{"第三者が機械的に採点した OpenSSF Scorecard を掲載し、未スキャンのものは「未評価」と明記しています。"}
              {"スコアが無いことを安全の証拠として扱わないでください。"}</div>
            <div className="notice">
              <strong>人気と、いま伸びていることは別です。</strong>
              <br />{"スターやフォークの数は規模の大きいプロジェクトほど有利になります。人気・急成長・おすすめは「ランキング」で分けて、計算の根拠つきで確認できます。更新が止まっていないか（最終コミット日）もあわせて確認してください。"}</div>
          </div>
        </section>
      </main>
      <SiteFooter meta={meta} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE.name,
          url: SITE.url,
          description: SITE.description,
          inLanguage: "ja",
          potentialAction: {
            "@type": "SearchAction",
            target: `${SITE.url}/tools/?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />
    </>
  );
}
