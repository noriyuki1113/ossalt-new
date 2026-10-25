import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getComparePairs, getMeta, getTool } from "@/lib/data";
import { getCompareGuide } from "@/lib/compare-guides";
import { pageMeta } from "@/lib/seo";
import { slugifyCompetitor } from "@/lib/tools";

export const metadata: Metadata = pageMeta({
  title: "オープンソースの代替を2つずつ比較",
  description:
    "同じSaaSの代わりになるオープンソースを2つずつ並べ、ライセンス・更新状況・Docker対応・日本語対応・セキュリティの違いを比べられます。",
  path: "/compare/",
});

export default function CompareIndexPage() {
  const meta = getMeta();
  const pairs = getComparePairs();
  // 過去のGSCで関心が確認でき、編集解説が存在する組を優先表示。
  // 特集欄は実在する組だけにし、生成ページのnoindexと食い違わないようにする。
  const prioritySlugs = [
    "libreoffice-vs-onlyoffice",
    "collabora-online-vs-libreoffice",
    "borg-vs-restic",
    "outline-vs-wikijs",
    "headscale-vs-netbird",
  ];
  const featuredPairs = prioritySlugs.flatMap((slug) => {
    const pair = pairs.find((p) => p.slug === slug);
    return pair && getCompareGuide(slug) ? [pair] : [];
  });

  // 代替対象SaaSごとにまとめ、比較の多い順に並べる
  const groups = new Map<string, typeof pairs>();
  for (const p of pairs) {
    const list = groups.get(p.competitor) ?? [];
    list.push(p);
    groups.set(p.competitor, list);
  }
  const sorted = [...groups.entries()].sort((x, y) => y[1].length - x[1].length || x[0].localeCompare(y[0]));

  return (
    <>
      <SiteHeader current="/alternatives" />
      <main className="wrap page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: "2つずつ比較" }]} />
        <h1 className="h2">オープンソースの代替を2つずつ比較</h1>
        <p className="lede">
          {`同じSaaSの代わりになるオープンソースのうち、よく候補に挙がるものを2つずつ並べて比べられます（${pairs.length}件）。各SaaSの代替のうち、健全度の上位3件どうしを組み合わせています。`}
        </p>

        {featuredPairs.length > 0 && (
          <section className="section section--first" aria-labelledby="featured-comparisons">
            <h2 id="featured-comparisons" className="h3">まず読みたい、OSSの比較ガイド</h2>
            <p className="muted">
              導入目的や運用環境に合わせて候補を選べるよう、違いと判断のポイントを整理しています。
            </p>
            <div className="grid-2">
              {featuredPairs.map((p) => {
                const a = getTool(p.a);
                const b = getTool(p.b);
                const guide = getCompareGuide(p.slug);
                return (
                  <div className="panel" key={p.slug}>
                    <div className="panel__head">
                      <h3 className="panel__title">
                        <Link href={"/compare/" + p.slug + "/"}>
                          {a?.name ?? p.a} と {b?.name ?? p.b}
                        </Link>
                      </h3>
                    </div>
                    {guide?.description && (
                      <div className="panel__body">
                        <p style={{ margin: 0 }} className="muted">{guide.description}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="grid-2">
          {sorted.map(([competitor, list]) => {
            const first = getTool(list[0].a);
            const name = first?.primary_competitor_ja || competitor;
            const cslug = slugifyCompetitor(competitor);
            return (
              <div className="panel" key={competitor}>
                <div className="panel__head">
                  <h2 className="panel__title">
                    {cslug ? <Link href={`/alternatives/${cslug}/`}>{`${name} の代替`}</Link> : `${name} の代替`}
                  </h2>
                  <span className="panel__meta">{list.length}件</span>
                </div>
                <div className="panel__body">
                  <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                    {list.map((p) => (
                      <li key={p.slug}>
                        <Link href={`/compare/${p.slug}/`}>
                          {`${getTool(p.a)?.name ?? p.a} と ${getTool(p.b)?.name ?? p.b}`}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
