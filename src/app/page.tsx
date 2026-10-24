import Link from "next/link";
import { SiteFooter, SiteHeader, JsonLd } from "@/components/site-chrome";
import { HouseAd } from "@/components/house-ad";
import { ToolRow } from "@/components/tool-views";
import { getActiveTools, getMeta } from "@/lib/data";
import { CATEGORIES } from "@/lib/categories";
import { SITE, t } from "@/lib/site";
import { formatCompactJa } from "@/lib/tools";
import { buildActivityReport } from "@/lib/watch-changes";
import { getWatchSignalFeed } from "@/lib/watch-signals";

export default function HomePage() {
  const tools = getActiveTools();
  const meta = getMeta();
  const changes = buildActivityReport(getActiveTools(), getWatchSignalFeed());
  const top = tools.slice(0, 8);
  const categoriesWithCount = CATEGORIES.map((c) => ({
    ...c,
    count: tools.filter((tl) => tl.category === c.slug).length,
  })).filter((c) => c.count > 0);

  return (
    <>
      <SiteHeader current="/" />
      <main className="wrap">
        <section className="hero">
          <p className="hero__eyebrow">Open Source Alternatives / for Japanese teams</p>
          <h1 className="hero__title">
            そのSaaS、
            <br />
            <em>自分のサーバ</em>で
            <span className="hl">動かせる。</span>
          </h1>
          <p className="hero__lede">
            {t("home.lede", { n: meta.tool_count })}{"料金だけでは判断できない、ライセンス・セキュリティ・更新の勢いまで並べて出します。"}</p>
          <div className="hero__actions">
            <Link className="btn btn--primary" href="/tools/">
              {t("home.cta.browse")}
            </Link>
            <Link className="btn" href="/guide/">
              {t("home.cta.guide")}
            </Link>
          </div>
        </section>

        <div className="panel" style={{ marginTop: "1.5rem" }}>
          <div className="panel__body" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem" }}>
            <div style={{ flex: "1 1 20rem" }}>
              <p style={{ margin: "0 0 0.25rem", fontWeight: 700, fontSize: "var(--step-1)" }}>
                どのOSSを選べばいいか迷っていますか？
              </p>
              <p className="muted" style={{ margin: 0, fontSize: "0.875rem" }}>
                7つの質問に答えるだけで、あなたの条件に合うOSSを探します。
              </p>
            </div>
            <div>
              <Link className="btn btn--primary" href="/diagnosis/">
                OSS診断をはじめる →
              </Link>
              <p className="muted" style={{ margin: "0.4rem 0 0", fontSize: "0.75rem" }}>
                約2分・登録不要
              </p>
            </div>
          </div>
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

        <section className="section section--first">
          <div className="section__head">
            <h2>勢いのある順に見る</h2>
            <Link className="more" href="/tools/">
              全{meta.tool_count}件 →
            </Link>
          </div>
          <div className="ledger">
            {top.map((tool) => (
              <ToolRow key={tool.id} tool={tool} />
            ))}
          </div>
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
              <strong>健全度スコアは「勢い」の目安です。</strong>
              <br />{"スターやフォークの数は規模の大きいプロジェクトほど有利になります。更新が止まっていないか（最終コミット日）を必ずあわせて確認してください。"}</div>
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
