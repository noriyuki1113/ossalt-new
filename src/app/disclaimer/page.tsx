import type { Metadata } from "next";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getMeta } from "@/lib/data";

export const metadata: Metadata = {
  title: "免責事項",
  description: "掲載情報の正確性、外部サイトへのリンク、スポンサー掲載の扱いについてOSSアルタナティブの免責事項を説明します。",
  alternates: { canonical: "/disclaimer/" },
};

export default function DisclaimerPage() {
  const meta = getMeta();
  return (
    <>
      <SiteHeader />
      <main className="wrap page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: "免責事項" }]} />
        <h1 className="h2">免責事項</h1>
        <div className="prose">
          <h2>掲載情報の正確性</h2>
          <p>
            当サイトに掲載されている情報の正確性・完全性については万全を期しておりますが、
            その内容を保証するものではありません。掲載情報の利用は、
            利用者ご自身の責任において行ってください。
          </p>

          <h2>外部リンクについて</h2>
          <p>
            当サイトからリンクされている外部サイトのコンテンツについて、
            当サイトは一切の責任を負いません。外部サイトの利用は、
            各サイトの利用規約に従ってください。
          </p>

          <h2>掲載ツールの使用</h2>
          <p>
            当サイトに掲載されているオープンソースツールの使用により生じた
            いかなる損害（データの損失、システム障害、セキュリティ問題等）についても、
            当サイトは責任を負いません。ツールの導入・使用は自己責任で行ってください。
          </p>

          <h2>情報の最新性</h2>
          <p>
            スター数、ライセンス情報、その他の統計データは取得時点のものであり、
            最新の情報でない場合があります。最新情報は各ツールの公式サイトまたは
            GitHubリポジトリでご確認ください。
          </p>

          <h2>広告・スポンサー掲載</h2>
          <p>
            当サイトはスポンサー広告やアフィリエイトリンクを掲載することがあります。
            広告・スポンサー枠はその旨を明示し、広告料金や紹介料の有無によって
            ツールのランキング、健全度スコア、セキュリティ評価、比較表の並び順を
            変更することはありません。
          </p>

          <h2>サービスの中断</h2>
          <p>
            当サイトは、メンテナンスやその他の理由により、予告なくサービスを
            中断・停止する場合があります。これにより生じた損害について、
            当サイトは責任を負いません。
          </p>
        </div>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
