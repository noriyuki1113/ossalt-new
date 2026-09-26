import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getMeta } from "@/lib/data";
import { SITE, t } from "@/lib/site";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description:
    "掲載情報の訂正、ツールの追加リクエスト、広告・スポンサーに関するお問い合わせを受け付けています。",
  alternates: { canonical: "/contact/" },
};

export default function ContactPage() {
  const meta = getMeta();
  const { contactEmail, contactUrl } = SITE;
  const hasContact = Boolean(contactEmail || contactUrl);

  return (
    <>
      <SiteHeader />
      <main className="wrap page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: "お問い合わせ" }]} />
        <h1 className="h2">{t("contact.title")}</h1>
        <p className="lede">{t("contact.lede")}</p>

        <div className="panel">
          <div className="panel__head">
            <h2 className="panel__title">お受けしている内容</h2>
          </div>
          <div className="panel__body prose" style={{ maxWidth: "none" }}>
            <ul style={{ paddingLeft: "1.2rem" }}>
              <li>掲載情報の誤りのご指摘</li>
              <li>
                ツールの追加リクエスト（<Link href="/submit/">掲載リクエストのページ</Link>からも送れます）
              </li>
              <li>ライセンス表記の訂正</li>
              <li>広告・スポンサーに関するお問い合わせ</li>
            </ul>
            {hasContact && (
              <p className="muted" style={{ fontSize: "0.875rem" }}>
                連絡先：
                {contactEmail && <a href={`mailto:${contactEmail}`}>{contactEmail}</a>}
                {contactEmail && contactUrl && " / "}
                {contactUrl && (
                  <a href={contactUrl} target="_blank" rel="noreferrer noopener">
                    GitHub で連絡する
                  </a>
                )}
              </p>
            )}
          </div>
        </div>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
