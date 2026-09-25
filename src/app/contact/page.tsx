import type { Metadata } from "next";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getMeta } from "@/lib/data";
import { t } from "@/lib/site";

export const metadata: Metadata = {
  title: "お問い合わせ・導入相談",
  description:
    "掲載情報の訂正、ツールの追加リクエスト、オープンソース導入のご相談を受け付けています。",
  alternates: { canonical: "/contact/" },
};

export default function ContactPage() {
  const meta = getMeta();
  return (
    <>
      <SiteHeader />
      <main className="wrap page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: "お問い合わせ" }]} />
        <h1 className="h2">{t("contact.title")}</h1>
        <p className="lede">{t("contact.lede")}</p>

        <div className="grid-2">
          <div className="panel">
            <div className="panel__head">
              <h2 className="panel__title">掲載内容について</h2>
            </div>
            <div className="panel__body prose" style={{ maxWidth: "none" }}>
              <ul style={{ paddingLeft: "1.2rem" }}>
                <li>情報の誤りのご指摘</li>
                <li>ツールの追加リクエスト</li>
                <li>ライセンス表記の訂正</li>
              </ul>
              <p className="muted" style={{ fontSize: "0.875rem" }}>
                連絡先：
                <code>［お問い合わせ用メールアドレスを設定してください］</code>
              </p>
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <h2 className="panel__title">{t("contact.business")}</h2>
            </div>
            <div className="panel__body prose" style={{ maxWidth: "none" }}>
              <p style={{ marginTop: 0 }}>{t("contact.businessBody")}</p>
              <ul style={{ paddingLeft: "1.2rem" }}>
                <li>候補の比較・選定のご相談</li>
                <li>自社サーバへの導入作業</li>
                <li>運用手順の文書化・引き継ぎ</li>
              </ul>
              <p className="muted" style={{ fontSize: "0.875rem" }}>{"※ 料金は内容と規模によりお見積もりします。初回のご相談（30分）は無料です。"}</p>
            </div>
          </div>
        </div>

        <div className="notice notice--warn mt2">
          <strong>公開前に設定が必要です。</strong>
          お問い合わせ先のメールアドレス、またはフォームサービス（Googleフォーム等）のURLを
          <code>src/app/contact/page.tsx</code> に設定してください。
        </div>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
