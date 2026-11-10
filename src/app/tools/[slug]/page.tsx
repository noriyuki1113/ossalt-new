import type { Metadata } from "next";
import { ForYouLink } from "@/components/for-you-link";
import Link from "next/link";
import { ToolGlance } from "@/components/tool-glance";
import { VerificationNote } from "@/components/verification-note";
import { Ja } from "@/components/ja";
import { notFound } from "next/navigation";
import { Breadcrumbs, JsonLd, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ToolLogo } from "@/components/tool-logo";
import { VpsRecommendation } from "@/components/vps-recommendation";
import { WatchSignalPanel } from "@/components/watch-signal-panel";
import { ListingBadge } from "@/components/listing-badge";
import {
  ComparisonTable,
  HealthLegend,
  HealthMeter,
  ScorecardPanel,
  KeyFacts,
  SpecTable,
} from "@/components/tool-views";
import { getActiveTools, getComparePairsForTool, getMeta, getRequirement, getTool, getTools } from "@/lib/data";
import { RequirementPanel } from "@/components/requirement-panel";
import { getBlogPosts } from "@/lib/blog";
import { getCategory } from "@/lib/categories";
import { SITE, t } from "@/lib/site";
import { pageMeta } from "@/lib/seo";
import { isSourceAvailable, toolDescription, toolTitle } from "@/lib/seo-copy";
import { getToolGuide } from "@/lib/tool-guides";
import { isToolNoindex } from "@/lib/search-index";
import { starContext } from "@/lib/star-context";
import { buildToolFaq } from "@/lib/tool-faq";
import { ARCHIVE_REASON_LABELS, archiveNoticeTone } from "@/lib/archive-reason";
import { getAlternativeGuide } from "@/lib/alternative-guides";
import { ToolBriefPanel } from "@/components/tool-brief";
import { TrackView } from "@/components/track-view";
import { TOOL_DIAGNOSIS } from "@/lib/diagnosis-data";
import { getStanding } from "@/lib/ranking-positions";
import { buildToolBrief } from "@/lib/tool-brief";
import { LICENSE_CLASS_LABELS, LICENSE_GROUP_LABELS, classifyLicense, licenseGroupOf, licenseReason } from "@/lib/compare";
import { getLicensePage } from "@/lib/licenses";
import { formatDate, getMaintenanceWarning, slugifyCompetitor } from "@/lib/tools";
import { vpsPlacementFor } from "@/lib/affiliate-context";
import { toSearchParams as costLabParams } from "@/lib/cost-lab";

const toCostLabParams = (saas: string, oss: string) => costLabParams({}, { saas, oss });

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
  return pageMeta({
    title: toolTitle(tool),
    description: getToolGuide(tool.id)?.description || toolDescription(tool),
    image: tool.preview ?? null,
    markdown: tool.github_archived ? undefined : `/md/tools/${tool.id}.md`,
    path: `/tools/${tool.id}/`,
    type: "article",
    // 解説がなく検索の需要もないページは、検索の登録対象から外す（ページとリンクは残す。解説が付けば index に戻る）
    noindex: isToolNoindex(tool.id),
  });
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
  const guide = getToolGuide(tool.id);
  const competitor = tool.primary_competitor_ja || tool.primary_competitor;
  // VPSの紹介枠は、自分のサーバーで動かすツールにだけ出す（src/lib/affiliate-context.ts）
  // このツールを扱った公開済みのブログ記事（記事の relatedTools から。予約投稿は含まない）
  const relatedPosts = getBlogPosts().filter((p) => p.relatedTools.includes(tool.id)).slice(0, 5);
  const vps = vpsPlacementFor(tool);
  // 公式の資料に数値があるときだけ（推測で埋めない）
  const requirement = vps.show ? getRequirement(tool.id) : null;
  // Cost Lab への導線も、サーバーで動かすツールにだけ出す（パソコンのアプリはサーバー代の比較にならない）
  const costLabHref =
    vps.show && competitorSlug ? `/cost-lab/?${toCostLabParams(competitorSlug, tool.id)}` : null;
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

  // 代替ページの「用途別の候補」に書いた一言（編集部の手書き）を、このツールの位置づけとして出す
  const positions = [
    { name: competitor, raw: tool.primary_competitor },
    ...(tool.also_competitors ?? []).map((n) => ({ name: n, raw: n })),
  ]
    .map(({ name, raw }) => {
      const slug = slugifyCompetitor(raw);
      const pick = slug ? getAlternativeGuide(slug)?.picks.find((p) => p.tool === tool.id) : undefined;
      return pick ? { name, slug, fit: pick.fit } : null;
    })
    .filter((x): x is { name: string; slug: string; fit: string } => x !== null);

  const faq = buildToolFaq(tool, {
    competitor: competitorSlug ? competitor : null,
    others: [tool, ...alternatives],
  });
  const comparePairs = getComparePairsForTool(tool.id);

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

        <TrackView
          event="oss_detail_viewed"
          props={{ slug: tool.id, category: tool.category ?? "unknown", license_class: classifyLicense(tool.license) }}
          dedupeKey={tool.id}
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
              {isSourceAvailable(tool.license) ? `${competitor} の代替（ソース公開型のライセンス。OSI承認のオープンソースではありません）。` : `${competitor} のオープンソース代替。`}
              {tool.description_ja ? ` ${tool.description_ja}` : ""}
            </p>

            <div className="hero__actions" style={{ marginBottom: "1.25rem" }}>
              <a className="btn btn--primary" href={tool.url} rel="noopener" data-ph-link="official" data-ph-slug={tool.id}>
                公式サイト
              </a>
              <a className="btn" href={tool.github_url} rel="noopener" data-ph-link="github" data-ph-slug={tool.id}>
                GitHub
              </a>
              {competitorSlug && (
                <Link className="btn" href={`/alternatives/${competitorSlug}/`}>
                  {competitor} の代替を全部見る
                </Link>
              )}
            </div>

            {tool.github_archived && (() => {
              const reason = tool.archive_reason;
              const successor = reason?.successor_id ? getTool(reason.successor_id) : null;
              return (
                <p className={`notice notice--${archiveNoticeTone(reason?.kind)}`} style={{ marginBottom: "1.25rem" }}>
                  <strong>{reason ? ARCHIVE_REASON_LABELS[reason.kind] : ARCHIVE_REASON_LABELS.unknown}</strong>{" "}
                  {reason ? (
                    <>
                      {reason.text}{"（"}
                      <a href={reason.source_url} rel="noopener">出典</a>
                      {`・${reason.checked_at}確認）`}
                      {successor && (
                        <> {"後継："}<Link href={`/tools/${successor.id}/`}>{successor.name}</Link>{"。"}</>
                      )}
                    </>
                  ) : (
                    "GitHubのアーカイブは、開発の終了・移転・保守の終了を区別しません。このページでは、公式の記載をまだ確認できていないため、理由は断定していません。"
                  )}
                  {" このツールは一覧・カテゴリ・比較のページには表示していません（このページのみ残しています）。"}
                  {"新規に導入する場合は、下記の「"}{competitor} の代替を全部見る」から他の候補もあわせてご確認ください。
                </p>
              );
            })()}

            {!tool.github_archived && !tool.maintenance_notice && getMaintenanceWarning(tool)?.level === "stale" && (
              <p className="notice notice--warn" style={{ marginBottom: "1.25rem" }}>
                <strong>更新が1年以上ありません</strong>{" "}
                {`最終コミットは${formatDate(tool.last_commit)}です。完成して安定しているソフトは更新が少なくなりますが、脆弱性の修正が行われない可能性があります。導入前に、公式の最新の状況を確認してください。`}
              </p>
            )}

            {tool.development_move && (
              <p className="notice notice--info" style={{ marginBottom: "1.25rem" }}>
                <strong>開発場所が移転しました</strong>{" "}
                {"開発者は、旧GitHubリポジトリ（アーカイブ済み）から、新しい開発場所へ移ったと発表しています（"}
                <a href={tool.development_move.source_url} rel="noopener">公式の発表</a>
                {`・${tool.development_move.announced_on}）。新しい開発場所：`}
                <a href={tool.development_move.to_url} rel="noopener">{tool.development_move.to_url.replace(/^https:\/\//, "")}</a>
                {"。このページの Star・最終コミット・リリースの数値は旧GitHubリポジトリのもので、新しい開発場所の更新は反映していません。"}
                {tool.development_move.note ? ` ${tool.development_move.note}` : ""}
                {`（${tool.development_move.checked_at}確認）`}
              </p>
            )}

            {tool.source_mirror && (
              <p className="notice notice--info" style={{ marginBottom: "1.25rem" }}>
                <strong>GitHubはミラーです</strong>{" "}
                {"このツールのGitHubのリポジトリは、別の場所で行われている開発のミラー（複製）です（"}
                <a href={tool.source_mirror.source_url} rel="noopener">リポジトリの記載</a>
                {"）。開発の場：「"}
                <a href={tool.source_mirror.primary_url} rel="noopener">{tool.source_mirror.primary_url.replace(/^https:\/\//, "")}</a>
                {"」。ミラーの設定を採点する OpenSSF Scorecard や、ミラーには無い Releases・SECURITY.md・Dependabot・アドバイザリは、実際の開発の状況を表さないため、「未確認」と表示しています。実際の状況は、開発の場で確認してください"}
                {`（${tool.source_mirror.checked_at}確認）。`}
              </p>
            )}

            {tool.maintenance_notice && (
              <p className="notice notice--warn" style={{ marginBottom: "1.25rem" }}>
                <strong>保守停止の公式警告</strong>{" "}
                {tool.maintenance_notice.text}
                {"（"}
                <a href={tool.maintenance_notice.source_url} rel="noopener">公式の表示</a>
                {`・${tool.maintenance_notice.checked_at}確認）`}
              </p>
            )}

            {guide?.glance && <ToolGlance name={tool.name} g={guide.glance} />}

            <KeyFacts tool={tool} stars={starContext(tool, getActiveTools())} categoryName={category?.nameJa} />

            {positions.length > 0 && (
              <section className="positioning">
                <h2 className="h3 mt0">{`${tool.name}が向いている使い方`}</h2>
                <ul>
                  {positions.map((p) => (
                    <li key={p.slug}>
                      <strong>{`${p.name}の代わりとして`}</strong>
                      {"："}
                      {p.fit}
                      {"（"}
                      <Link href={`/alternatives/${p.slug}/`}>{`${p.name}の代替をすべて見る`}</Link>
                      {"）"}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <ToolBriefPanel
              name={tool.name}
              brief={buildToolBrief(tool, TOOL_DIAGNOSIS[tool.id], getStanding(tool.id))}
              asOf={formatDate(meta.stars_as_of ?? meta.built_at)}
            />

            <WatchSignalPanel githubUrl={tool.github_url} />

            {tool.preview && (
              <figure className="tool-preview">
                {/* eslint-disable-next-line @next/next/no-img-element -- 静的書き出しのため next/image の最適化は使わない */}
                <img
                  src={tool.preview.src}
                  width={tool.preview.width}
                  height={tool.preview.height}
                  alt={`${tool.name}の共有用画像`}
                  loading="lazy"
                  decoding="async"
                />
                <figcaption>
                  {tool.preview.source === "official"
                    ? `画像：${tool.name} 公式サイトの共有用画像より`
                    : `画像：GitHub（${tool.github_url.replace(/^https:\/\/github\.com\//, "")}）の共有用画像より`}
                </figcaption>
              </figure>
            )}

            {(tool.also_competitors ?? []).length > 0 && (
              <p className="muted" style={{ marginTop: "-1rem", marginBottom: "2rem", fontSize: "0.875rem" }}>
                {"ほかに、次のサービスの代わりにも使えます："}
                {(tool.also_competitors ?? []).map((name, i) => (
                  <span key={name}>
                    {i > 0 && "、"}
                    <Link href={`/alternatives/${slugifyCompetitor(name)}/`}>{`${name}の代替`}</Link>
                  </span>
                ))}
              </p>
            )}

            {guide && (
              <nav className="toc" aria-label="このページの目次">
                <p className="toc__title">目次</p>
                <ol>
                  <li><a href="#about">{`${tool.name}とは`}</a></li>
                  <li><a href="#health">健全度スコア</a></li>
                  <li><a href="#spec">スペック</a></li>
                  <li><a href="#faq">よくある質問</a></li>
                  <li><a href="#security">セキュリティ</a></li>
                  <li><a href="#selfhost">自前で動かすには</a></li>
                  {compareSet.length > 1 && <li><a href="#compare">{`${competitor} の代替候補を比較`}</a></li>}
                </ol>
              </nav>
            )}

            {guide && (
              <section id="about" className="section" style={{ paddingTop: 0, marginBottom: "2.5rem" }}>
                <h2 className="h3 mt0">{`${tool.name}とは`}</h2>
                <VerificationNote v={guide.verification} checkedAtLabel={guide.verification.checked_at ? formatDate(guide.verification.checked_at) : undefined} />
                <div className="prose" dangerouslySetInnerHTML={{ __html: guide.contentHtml }} />
                {guide.updated && (
                  <p className="muted" style={{ fontSize: "0.75rem" }}>
                    {`解説の最終更新：${formatDate(guide.updated)}。機能や提供条件は変わることがあるため、導入前に公式の情報をご確認ください。`}
                  </p>
                )}
              </section>
            )}

            <section id="health">
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
                  <details className="more">
                    <summary>健全度スコアの説明</summary>
                    <p className="muted" style={{ fontSize: "0.75rem" }}>
                      {t("health.explain")} {t("health.formulaNote")}
                    </p>
                    <p className="muted" style={{ fontSize: "0.75rem", marginBottom: 0 }}>
                      {"スコアの読み方と目安は"}
                      <Link href="/guide/">選び方のページ</Link>
                      {"に、スターやフォークなど各数字の意味は"}
                      <Link href="/blog/how-to-read-github/">GitHubの見方</Link>
                      {"にまとめています。"}
                    </p>
                  </details>
                </div>
              </div>
            </section>

            <section id="spec">
              <h2 className="h3">スペック</h2>
              <SpecTable tool={tool} compact />
              <p className="muted" style={{ fontSize: "0.75rem" }}>
                ライセンス表記は「{tool.license?.trim() || "不明"}」。最終コミット
                {formatDate(tool.last_commit)}時点の情報です。
                {tool.github_archived && " ※このリポジトリはアーカイブされています。"}
                {tool.development_move && " ※旧GitHubリポジトリはアーカイブされ、開発は移転しています（上の案内を参照）。"}
              </p>
              <div className={`license-verdict license-verdict--${licenseGroupOf(tool.license)}`}>
                <p className="license-verdict__head">
                  <span className="license-verdict__badge">{LICENSE_GROUP_LABELS[licenseGroupOf(tool.license)]}</span>
                  {getLicensePage(classifyLicense(tool.license)) && (
                    <span>
                      {`分類：${LICENSE_CLASS_LABELS[classifyLicense(tool.license)]}（`}
                      <Link href={`/licenses/${classifyLicense(tool.license)}/`}>同じ種類のツール一覧</Link>
                      {"）"}
                    </span>
                  )}
                </p>
                <p className="license-verdict__reason">
                  {tool.license_note ?? licenseReason(tool.license)}
                  {tool.license_source === "github" && " 出典：GitHub APIのライセンス判定（SPDX）。"}
                  {tool.license_source === "manual" && " 出典：OSSALTがリポジトリのLICENSEファイルを確認して設定。"}
                </p>
              </div>
            </section>

            <section id="faq">
              <h2 className="h3"><Ja>{`${tool.name}についてよくある質問`}</Ja></h2>
              <dl className="faq">
                {faq.map((f) => (
                  <div key={f.q}>
                    <dt>{f.q}</dt>
                    <dd>{f.a}</dd>
                  </div>
                ))}
              </dl>
              <p className="muted" style={{ fontSize: "0.75rem" }}>
                {`回答は掲載データ（GitHubの公開情報と、リポジトリの自動調査）から作成しています（${formatDate(meta.built_at)}時点）。`}
              </p>
            </section>

            {relatedPosts.length > 0 && (
              <section id="articles">
                <h2 className="h3">{tool.name}を扱った記事</h2>
                <ul>
                  {relatedPosts.map((p) => (
                    <li key={p.slug}>
                      <Link href={`/blog/${p.slug}/`}>{p.title}</Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

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

          <aside id="security" className="detail-aside stack">
            <ScorecardPanel tool={tool} />
            <p className="muted" style={{ fontSize: "0.75rem", margin: 0 }}>
              {t("footer.disclaimer")}
            </p>
          </aside>
        </div>

        {requirement && <RequirementPanel name={tool.name} req={requirement} />}

        {costLabHref && (
          <aside className="notice notice--info mt2 costlab-cta">
            <strong>{competitor}を使い続ける場合と、{tool.name}に移る場合の費用を比べる</strong>
            <br />
            サーバー代だけでなく、運用の手間と移行の費用も含めて計算できます。{" "}
            <Link href={costLabHref} data-umami-event="cost_lab_entry" data-umami-event-from="tool_detail">
              Cost Labで試算する
            </Link>
          </aside>
        )}

        {vps.show && (
          <div id="selfhost">
            <VpsRecommendation path={`/tools/${tool.id}/`} placement="tool_detail" variant={vps.variant} title={vps.title} lede={vps.lede} />
          </div>
        )}

        {/* 比較表・同じカテゴリの一覧は横長になりやすいため、2カラムグリッドの外に出して
            ページ全幅で表示する（detail-layout の中に置くと、aside が grid-row: 1/-1 で
            全行にまたがっているため、追加の行を横幅いっぱいに置けなくなる）。 */}
        {compareSet.length > 1 && (
          <section id="compare" className="mt2">
            <h2 className="h3">{competitor} の代替候補を比較</h2>
            <ComparisonTable tools={compareSet} />
            {competitorSlug && (
              <ForYouLink query={{ saas: competitorSlug }}>{`あなたの条件（ライセンス・Docker・日本語など）で、${competitor}の代替を並べ替える`}</ForYouLink>
            )}
            <p className="muted mt1" style={{ fontSize: "0.75rem" }}>
              {t("alt.compareNote")}
            </p>
          </section>
        )}

        {comparePairs.length > 0 && (
          <section className="mt2">
            <h2 className="h3">{tool.name} とほかの候補を比べる</h2>
            <ul>
              {comparePairs.map((p) => {
                const other = getTool(p.a === tool.id ? p.b : p.a);
                return (
                  <li key={p.slug}>
                    <Link href={`/compare/${p.slug}/`}>
                      {tool.name} と {other?.name ?? (p.a === tool.id ? p.b : p.a)} の違い
                    </Link>
                  </li>
                );
              })}
            </ul>
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
        {!tool.github_archived && <ListingBadge toolId={tool.id} toolName={tool.name} />}
      </main>
      <SiteFooter meta={meta} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: tool.name,
          url: tool.url,
          applicationCategory: category?.nameJa ?? "BusinessApplication",
          description: tool.description_ja ?? undefined,
          license: tool.license ?? undefined,
          sameAs: tool.github_url,
          offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
          // OpenSSF Scorecard は第三者の自動の採点で、利用者のレビューではないため、
          // Review / Rating としては出さない（2026-10-09 の監査で削除。Googleのレビューの指針に合わないおそれ）
          isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.url },
        }}
      />
    </>
  );
}
