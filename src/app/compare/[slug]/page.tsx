import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Breadcrumbs, JsonLd, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ToolLogo } from "@/components/tool-logo";
import { getComparePairs, getMeta, getTool } from "@/lib/data";
import { LICENSE_CLASS_LABELS, buildDifferences, classifyLicense } from "@/lib/compare";
import { SAAS_IDS, SAAS_LABELS } from "@/lib/diagnosis-types";
import { SITE } from "@/lib/site";
import { pageMeta } from "@/lib/seo";
import { getCompareGuide } from "@/lib/compare-guides";
import {
  advisoriesLabel,
  dependabotLabel,
  dockerLabel,
  formatDate,
  formatFull,
  formatRelativeDays,
  jaDocsLabel,
  jaUiLabel,
  licenseLabel,
  securityMdLabel,
  slugifyCompetitor,
  type Tool,
} from "@/lib/tools";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return getComparePairs().map((p) => ({ slug: p.slug }));
}

function resolve(slug: string) {
  const pair = getComparePairs().find((p) => p.slug === slug);
  if (!pair) return null;
  const a = getTool(pair.a);
  const b = getTool(pair.b);
  if (!a || !b) return null;
  const competitor = a.primary_competitor_ja || a.primary_competitor;
  return { pair, a, b, competitor };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const r = resolve(slug);
  if (!r) return { title: "比較が見つかりません" };
  const { a, b, competitor } = r;
  return pageMeta({
    title: `${a.name} と ${b.name} の違い — ${competitor} の代替OSSを比較`,
    description:
      getCompareGuide(slug)?.description ||
      `${competitor}の代わりになるオープンソース、${a.name}と${b.name}を、ライセンス・更新状況・Docker対応・日本語対応・セキュリティの公開データで比べます。`,
    path: `/compare/${slug}/`,
    type: "article",
  });
}

function scorecardText(t: Tool): string {
  return t.scorecard_score != null ? `${t.scorecard_score.toFixed(1)} / 10` : "未評価";
}

export default async function ComparePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const r = resolve(slug);
  if (!r) notFound();
  const guide = getCompareGuide(slug);
  const { pair, a, b, competitor } = r;
  const meta = getMeta();
  const differences = buildDifferences(a, b);
  const competitorSlug = slugifyCompetitor(a.primary_competitor);
  const siblings = getComparePairs().filter((p) => p.competitor === pair.competitor && p.slug !== pair.slug);
  const diagnosisSaas = SAAS_IDS.find((id) => SAAS_LABELS[id] === a.primary_competitor);

  const rows: Array<[string, (t: Tool) => ReactNode]> = [
    ["概要", (t) => t.description_ja ?? "—"],
    ["ライセンス", (t) => `${licenseLabel(t.license)}（${LICENSE_CLASS_LABELS[classifyLicense(t.license)]}）`],
    ["GitHubのスター", (t) => formatFull(t.stars_num)],
    ["フォーク", (t) => formatFull(t.forks_num)],
    ["コントリビュータ", (t) => formatFull(t.contributors_num)],
    [
      "最終コミット",
      (t) => (
        <>
          {formatDate(t.last_commit)} <small className="muted">{formatRelativeDays(t.freshness_days)}</small>
        </>
      ),
    ],
    ["直近12か月のリリース", (t) => (t.releases_12mo != null ? `${t.releases_12mo}回` : "未確認")],
    ["Docker", (t) => dockerLabel(t.docker_available)],
    ["画面の日本語化", (t) => jaUiLabel(t.ja_ui)],
    ["日本語ドキュメント", (t) => jaDocsLabel(t.ja_docs)],
    ["OpenSSF Scorecard", scorecardText],
    ["脆弱性の報告窓口（SECURITY.md）", (t) => securityMdLabel(t.security_md)],
    ["依存関係の自動更新（Dependabot）", (t) => dependabotLabel(t.dependabot_configured)],
    ["公開されたセキュリティアドバイザリ", (t) => advisoriesLabel(t.advisories_count)],
  ];

  return (
    <>
      <SiteHeader current="/alternatives" />
      <main className="wrap page">
        <Breadcrumbs
          items={[
            { href: "/", label: "トップ" },
            { href: "/alternatives/", label: "SaaSから探す" },
            ...(competitorSlug ? [{ href: `/alternatives/${competitorSlug}/`, label: `${competitor} の代替` }] : []),
            { label: `${a.name} と ${b.name}` },
          ]}
        />
        <h1 className="h2">
          {a.name} と {b.name} の違い
        </h1>
        <p className="lede">
          {`どちらも${competitor}の代わりになるオープンソースです。当サイトが公開データから取得したライセンス・更新状況・Docker対応・日本語対応・セキュリティの情報を並べて比べます。`}
        </p>

        <div className="compare-heads">
          {[a, b].map((t) => (
            <Link key={t.id} href={`/tools/${t.id}/`} className="compare-head">
              <ToolLogo githubUrl={t.github_url} name={t.name} size={40} />
              <span className="compare-head__name">{t.name}</span>
            </Link>
          ))}
        </div>

        <section className="section section--first">
          <h2 className="h3">主な違い</h2>
          <ul className="compare-diffs">
            {differences.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          <p className="muted" style={{ fontSize: "0.75rem" }}>
            {`掲載データ（${formatDate(meta.built_at)}時点）から自動で作成した比較です。機能の細かな違いや提供条件は、各ツールの公式情報で確認してください。`}
          </p>
        </section>

        {guide && (
          <section className="section">
            <h2 className="h3">{`${a.name}と${b.name}、どっちを選ぶ？`}</h2>
            <div className="prose" dangerouslySetInnerHTML={{ __html: guide.contentHtml }} />
            {guide.updated && (
              <p className="muted" style={{ fontSize: "0.75rem" }}>
                {`編集部のまとめ（最終更新：${formatDate(guide.updated)}）。機能や提供条件は変わることがあるため、導入前に公式の情報をご確認ください。`}
              </p>
            )}
          </section>
        )}

        <section className="section">
          <h2 className="h3">項目ごとの比較</h2>
          <div className="ctable-scroll">
            <table className="ctable compare-table">
              <caption className="skip">{`${a.name}と${b.name}の比較表`}</caption>
              <thead>
                <tr>
                  <th scope="col">項目</th>
                  <th scope="col">
                    <Link href={`/tools/${a.id}/`}>{a.name}</Link>
                  </th>
                  <th scope="col">
                    <Link href={`/tools/${b.id}/`}>{b.name}</Link>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, render]) => (
                  <tr key={label} className="ctable__row">
                    <th scope="row">{label}</th>
                    <td>{render(a)}</td>
                    <td>{render(b)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ fontSize: "0.75rem" }}>
            {"「未確認」は、当サイトでまだ確認できていないという意味で、「無い」「非対応」という意味ではありません。"}
          </p>
        </section>

        <section className="section">
          <h2 className="h3">どちらを選ぶか迷ったら</h2>
          <ul>
            <li>
              {"ライセンスの性格の違いは、"}
              <Link href="/blog/oss-license-guide/">ライセンスの分類</Link>
              {"の記事で解説しています。"}
            </li>
            <li>
              {"スターや更新状況の読み方は、"}
              <Link href="/blog/how-to-read-github/">GitHubの見方</Link>
              {"を参照してください。"}
            </li>
            {diagnosisSaas && (
              <li>
                {"利用人数や技術レベルから候補を絞りたい場合は、"}
                <Link href="/diagnosis/">あなたに合うOSS診断</Link>
                {"を試してみてください。"}
              </li>
            )}
            {competitorSlug && (
              <li>
                <Link href={`/alternatives/${competitorSlug}/`}>{`${competitor}の代替をすべて見る`}</Link>
              </li>
            )}
          </ul>
        </section>

        {siblings.length > 0 && (
          <section className="section">
            <h2 className="h3">{`${competitor}の代替のほかの比較`}</h2>
            <ul>
              {siblings.map((p) => (
                <li key={p.slug}>
                  <Link href={`/compare/${p.slug}/`}>
                    {`${getTool(p.a)?.name ?? p.a} と ${getTool(p.b)?.name ?? p.b}`}
                  </Link>
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
          "@type": "ItemList",
          name: `${a.name} と ${b.name} の比較`,
          inLanguage: "ja",
          isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.url },
          itemListElement: [a, b].map((t, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: t.name,
            url: `${SITE.url}/tools/${t.id}/`,
          })),
        }}
      />
    </>
  );
}
