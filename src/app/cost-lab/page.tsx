import type { Metadata } from "next";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { CostLab, type CostLabSaas } from "@/components/cost-lab";
import { getCompetitors, getMeta } from "@/lib/data";
import { pageMeta } from "@/lib/seo";
import { runtimeKind } from "@/lib/affiliate-context";

export const metadata: Metadata = pageMeta({
  title: "Cost Lab：SaaSとOSSの総費用を比べる",
  description:
    "今のSaaSを使い続ける場合と、オープンソースを自分のサーバーで動かす場合の総費用を、1年・3年・5年で比べられる計算ツールです。サーバー代だけでなく、運用の手間と移行の費用も含めて計算します。",
  path: "/cost-lab/",
});

export default function CostLabPage() {
  const meta = getMeta();
  // ブラウザに渡すのは、選択肢に必要な最小限のデータだけにする
  const saasList: CostLabSaas[] = getCompetitors()
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      tools: c.tools.map((t) => ({ id: t.id, name: t.name, selfHostable: runtimeKind(t.id) === "server" })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ja"));

  return (
    <>
      <SiteHeader />
      <main className="wrap page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: "Cost Lab" }]} />
        <h1 className="h2">Cost Lab：SaaSとOSSの総費用を比べる</h1>
        <p className="lede">
          SaaSの月額をやめてオープンソースを自分のサーバーで動かすと、本当に安くなるのか。サーバー代だけでなく、
          <strong>運用の手間と移行の費用</strong>も含めて、期間の合計で比べます。
        </p>
        <p className="notice notice--info">
          金額はすべてご自分で入力します。当サイトは価格を確認していません。入力した金額は、このブラウザの外には送りません（「URLをコピー」で共有するURLにだけ、入力した数字が入ります）。
        </p>
        <div className="mt2">
          <CostLab saasList={saasList} />
        </div>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
