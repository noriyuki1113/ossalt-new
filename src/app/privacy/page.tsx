import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getMeta } from "@/lib/data";
import { SITE, t } from "@/lib/site";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: "ossalt.jp における個人情報の取り扱い、Cookie、アクセス解析について。",
  alternates: { canonical: "/privacy/" },
};

export default function PrivacyPage() {
  const meta = getMeta();
  return (
    <>
      <SiteHeader />
      <main className="wrap page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: "プライバシーポリシー" }]} />
        <h1 className="h2">{t("privacy.title")}</h1>
        <div className="prose">
          <h2>1. 取得する情報</h2>
          <p>{"当サイトは、お問い合わせフォームまたはメールでご連絡いただいた場合に、お名前・メールアドレス・本文に記載された情報を取得します。"}
            {"また、アクセス解析のために、閲覧ページ・参照元・端末やブラウザの種類などの統計情報を取得します。"}</p>

          <h2>2. 利用目的</h2>
          <ul>
            <li>お問い合わせへの回答に関するご連絡</li>
            <li>サイトの改善（どのページが読まれているかの把握）</li>
            <li>掲載内容の訂正・追加の確認</li>
          </ul>

          <h2>3. Cookie とアクセス解析</h2>
          <p>{"当サイトは、アクセス状況の把握のためにアクセス解析ツール Umami を利用しています。Umami はCookieを使用せず、個人を特定できる情報も取得しません。取得するのはページビューなどの統計情報のみです。"}</p>
          <p>{"Cookieを使用していないため、当サイトでは（アクセス解析に関する）Cookie同意バナーを設けていません。"}</p>

          <h2>4. 広告・紹介リンクについて</h2>
          <p>{"当サイトは、一部のリンクに、紹介先のサービスと提携した成果報酬型の紹介リンク（アフィリエイト）を含みます。読者がリンク経由でサービスを利用・申込みした場合、当サイトが紹介料を受け取ることがあります。"}</p>
          <p>{"リンク先への遷移や成果の計測にあたり、遷移先の事業者がCookie等を使用する場合がありますが、これは当サイトが直接収集・管理するものではありません。"}</p>
          <p>{"掲載するツールの並び順・評価は、公開データ（健全度スコアなど）にもとづいており、紹介料の有無や金額によって変わることはありません。詳しくは"}<Link href="/about/">このサイトについて</Link>{"をご覧ください。"}</p>

          <h2>5. 第三者提供</h2>
          <p>
            法令に基づく場合を除き、取得した個人情報を本人の同意なく第三者へ提供することはありません。
          </p>

          <h2>6. 掲載情報について</h2>
          <p>{"当サイトが掲載するソフトウェアの情報は、公開情報をもとに自動取得・要約したものです。各ソフトウェアのライセンス条件・提供条件は変更されることがあるため、導入前に必ず公式サイトで最新の条件をご確認ください。"}
            {"当サイトは、掲載情報にもとづく導入の結果について責任を負いません。"}</p>

          <h2>7. お問い合わせ</h2>
          <p>
            個人情報の開示・訂正・削除のご請求は、
            <Link href="/contact/">お問い合わせページ</Link>よりご連絡ください。
          </p>

          <h2>8. 改定</h2>
          <p>{"本ポリシーの内容は、必要に応じて予告なく改定することがあります。改定後の内容は、本ページに掲載した時点から効力を生じます。"}</p>

          <p className="muted">
            制定日：{SITE.privacyEffectiveDate || "準備中"}
          </p>
          <p className="muted">
            運営者：{SITE.operatorName || "準備中"}
          </p>
        </div>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
