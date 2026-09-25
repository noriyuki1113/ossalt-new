import type { Metadata } from "next";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getMeta } from "@/lib/data";

export const metadata: Metadata = {
  title: "利用規約",
  description: "OSSアルタナティブの利用条件、掲載ツールの選定基準、禁止事項について定めた利用規約です。",
  alternates: { canonical: "/terms/" },
};

export default function TermsPage() {
  const meta = getMeta();
  return (
    <>
      <SiteHeader />
      <main className="wrap page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: "利用規約" }]} />
        <h1 className="h2">利用規約</h1>
        <div className="prose">
          <h2>第1条（適用）</h2>
          <p>
            本利用規約（以下「本規約」）は、OSSアルタナティブ（以下「当サイト」）の
            利用に関する条件を定めるものです。当サイトを利用することにより、
            本規約に同意したものとみなします。
          </p>

          <h2>第2条（掲載情報について）</h2>
          <p>
            当サイトに掲載されている情報は、正確性・完全性を保証するものではありません。
            掲載情報に基づいて利用者が行った行為について、当サイトは一切の責任を負いません。
          </p>

          <h2>第3条（掲載ツールの利用）</h2>
          <p>
            当サイトに掲載されているツールの利用は、各ツールが定める利用規約・
            ライセンスに従ってください。当サイトは掲載ツールの利用に関して
            いかなる保証も行いません。
          </p>

          <h2>第4条（著作権）</h2>
          <p>
            当サイトのコンテンツ（テキスト、デザイン、構成等）の無断転載・複製を禁止します。
            ただし、掲載ツールに関する情報はそれぞれの原著作者に帰属します。
          </p>

          <h2>第5条（サービスの変更・終了）</h2>
          <p>
            当サイトは、利用者への事前通知なしに、サービスの内容を変更または
            終了する場合があります。これにより利用者に生じた損害について、
            当サイトは一切の責任を負いません。
          </p>

          <h2>第6条（準拠法）</h2>
          <p>本規約の解釈および適用は、日本法に準拠するものとします。</p>
        </div>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
