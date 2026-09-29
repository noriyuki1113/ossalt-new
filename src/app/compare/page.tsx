import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getComparePairs, getMeta, getTool } from "@/lib/data";
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
