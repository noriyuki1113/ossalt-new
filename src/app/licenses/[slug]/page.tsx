import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ToolRow } from "@/components/tool-views";
import { getMeta, getToolsByLicenseClass } from "@/lib/data";
import { LICENSE_PAGES, getLicensePage } from "@/lib/licenses";
import { pageMeta } from "@/lib/seo";
import { licenseLabel } from "@/lib/tools";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return LICENSE_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const def = getLicensePage(slug);
  if (!def) return { title: "ページが見つかりません" };
  const n = getToolsByLicenseClass(def.slug).length;
  return pageMeta({
    title: `${def.title}ライセンスのオープンソース ${n}件`,
    description: `${def.examples}など、${def.title}のライセンスで公開されているオープンソースのツール${n}件の一覧。ライセンスの性格と、使うときの注意点もまとめています。`,
    path: `/licenses/${def.slug}/`,
  });
}

export default async function LicenseClassPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const def = getLicensePage(slug);
  if (!def) notFound();
  const meta = getMeta();
  const tools = getToolsByLicenseClass(def.slug);

  // ライセンス名ごとの件数（多い順）
  const byName = new Map<string, number>();
  for (const t of tools) byName.set(licenseLabel(t.license), (byName.get(licenseLabel(t.license)) ?? 0) + 1);
  const names = [...byName.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  return (
    <>
      <SiteHeader current="/tools" />
      <main className="wrap page">
        <Breadcrumbs
          items={[
            { href: "/", label: "トップ" },
            { href: "/licenses/", label: "ライセンスの種類から探す" },
            { label: def.title },
          ]}
        />
        <h1 className="h2">{`${def.title}のライセンスのツール`}</h1>
        <p className="lede">{def.summary}</p>

        <div className="notice mt1">
          <strong>使うときの注意</strong>
          <br />
          {def.caution}
        </div>

        <section className="section">
          <h2 className="h3">{`ライセンスの内訳（${tools.length}件）`}</h2>
          <p>
            {names.map(([name, n]) => (
              <span className="tag" key={name}>
                {`${name}：${n}件`}
              </span>
            ))}
          </p>
        </section>

        <section className="section section--first">
          <h2 className="h3">ツールの一覧（健全度順）</h2>
          <div className="ledger">
            {tools.map((tool) => (
              <ToolRow key={tool.id} tool={tool} />
            ))}
          </div>
        </section>

        <p className="muted mt2" style={{ fontSize: "0.8125rem" }}>
          {"ライセンスはGitHubの情報をもとに、必要に応じて補足しています。変わることがあるため、導入前には各リポジトリのライセンスの原文を確認してください。ほかの種類は"}
          <Link href="/licenses/">ライセンスの種類から探す</Link>
          {"、違いの解説は"}
          <Link href="/blog/oss-license-guide/">ライセンスの分類の記事</Link>
          {"をご覧ください。"}
        </p>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
