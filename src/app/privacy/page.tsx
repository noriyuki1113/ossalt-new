import type { Metadata } from "next";
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
          <p className="notice notice--warn">
            <strong>公開前に必ずご確認ください。</strong>
            このページは雛形です。運営者名・連絡先・利用する解析ツールと広告配信の有無を確定させ、
            内容を確認したうえで公開してください。とくに広告配信（Google AdSense等）を導入する場合、
            パーソナライズ広告に関する記載が必要になります。
          </p>

          <h2>1. 取得する情報</h2>
          <p>
            当サイトは、お問い合わせフォームまたはメールでご連絡いただいた場合に、
            お名前・メールアドレス・本文に記載された情報を取得します。
            また、アクセス解析のために、閲覧ページ・参照元・端末やブラウザの種類などの
            統計情報を取得することがあります。
          </p>

          <h2>2. 利用目的</h2>
          <ul>
            <li>お問い合わせへの回答、および導入相談に関するご連絡</li>
            <li>サイトの改善（どのページが読まれているかの把握）</li>
            <li>掲載内容の訂正・追加の確認</li>
          </ul>

          <h2>3. Cookie とアクセス解析</h2>
          <p>
            当サイトは、アクセス状況の把握のためにアクセス解析ツールを利用することがあります。
            解析ツールはCookieを使用する場合がありますが、個人を特定する情報は含みません。
            Cookieの利用はブラウザの設定で拒否できます。
          </p>

          <h2>4. 広告について</h2>
          <p>
            当サイトは、広告配信サービスを利用する場合があります。
            広告配信事業者がCookie等を使用して、
            利用者の興味関心に応じた広告を表示することがあります。
            この場合、当サイトは個人を特定できる情報を広告配信事業者へ提供しません。
          </p>
          <p className="muted">
            ※ 広告配信を導入する場合は、利用するサービス名とオプトアウトの方法をここに追記してください。
          </p>

          <h2>5. 第三者提供</h2>
          <p>
            法令に基づく場合を除き、取得した個人情報を本人の同意なく第三者へ提供することはありません。
          </p>

          <h2>6. 掲載情報について</h2>
          <p>
            当サイトが掲載するソフトウェアの情報は、公開情報をもとに自動取得・要約したものです。
            各ソフトウェアのライセンス条件・提供条件は変更されることがあるため、
            導入前に必ず公式サイトで最新の条件をご確認ください。
            当サイトは、掲載情報にもとづく導入の結果について責任を負いません。
          </p>

          <h2>7. お問い合わせ</h2>
          <p>
            個人情報の開示・訂正・削除のご請求は、
            <a href="/contact/">お問い合わせページ</a>よりご連絡ください。
          </p>

          <h2>8. 改定</h2>
          <p>
            本ポリシーの内容は、必要に応じて予告なく改定することがあります。
            改定後の内容は、本ページに掲載した時点から効力を生じます。
          </p>

          <p className="muted">制定日：［公開日を記入してください］</p>
          <p className="muted">運営者：［運営者名を記入してください］</p>
        </div>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
