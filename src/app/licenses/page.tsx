import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getActiveTools, getMeta, getToolsByLicenseClass } from "@/lib/data";
import { LICENSE_CLASS_LABELS } from "@/lib/compare";
import { LICENSE_MINOR_CLASSES, LICENSE_PAGES } from "@/lib/licenses";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "ライセンスの種類から探す",
  description:
    "掲載しているオープンソースのツールを、許容型・コピーレフト・ネットワーク型コピーレフト・ソース公開型などライセンスの種類ごとに一覧できます。",
  path: "/licenses/",
});

export default function LicensesIndexPage() {
  const meta = getMeta();
  const total = getActiveTools().length;

  return (
    <>
      <SiteHeader current="/tools" />
      <main className="wrap page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: "ライセンスの種類から探す" }]} />
        <h1 className="h2">ライセンスの種類から探す</h1>
        <p className="lede">
          {`掲載中の${total}件を、ライセンスの性格で分類しました。社内で使うだけか、自社のサービスに組み込んで社外に提供するかで、確認すべき条件が変わります。`}
        </p>

        <div className="grid-2">
          {LICENSE_PAGES.map((p) => {
            const n = getToolsByLicenseClass(p.slug).length;
            return (
              <div className="panel" key={p.slug}>
                <div className="panel__head">
                  <h2 className="panel__title">
                    <Link href={`/licenses/${p.slug}/`}>{p.title}</Link>
                  </h2>
                  <span className="panel__meta">{n}件</span>
                </div>
                <div className="panel__body">
                  <p className="muted" style={{ margin: "0 0 0.5rem", fontSize: "0.8125rem" }}>
                    {`代表例：${p.examples}`}
                  </p>
                  <p style={{ margin: 0, fontSize: "0.875rem" }}>{p.summary}</p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="muted mt2" style={{ fontSize: "0.8125rem" }}>
          {"このほか、"}
          {LICENSE_MINOR_CLASSES.map((c, i) => (
            <span key={c}>
              {i > 0 && "、"}
              {`${LICENSE_CLASS_LABELS[c]}が${getToolsByLicenseClass(c).length}件`}
            </span>
          ))}
          {"あります。これらは各ツールのページでライセンスを確認してください。"}
        </p>

        <div className="notice notice--info mt2">
          {"分類ごとの違いと、使い方（社内利用・改変・社外提供・納品）ごとの確認ポイントは、"}
          <Link href="/blog/oss-license-guide/">ライセンスの分類の記事</Link>
          {"で詳しく解説しています。分類は目安です。導入前には必ず各ツールのライセンスの原文を確認してください。"}
        </div>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
