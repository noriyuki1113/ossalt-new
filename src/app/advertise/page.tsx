import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getMeta } from "@/lib/data";
import { SITE } from "@/lib/site";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "広告・スポンサー掲載",
  description:
    "SaaSからの乗り換えを検討している日本のチームに向けて、ossalt.jpのスポンサー枠を提供しています。掲載の順番や評価は、スポンサーかどうかで変わりません。",
  path: "/advertise/",
});

export default function AdvertisePage() {
  const meta = getMeta();
  const mail = SITE.contactEmail;

  return (
    <>
      <SiteHeader />
      <main className="wrap page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: "広告・スポンサー掲載" }]} />
        <h1 className="h2">広告・スポンサー掲載</h1>
        <p className="lede">
          {`${SITE.name}は、SaaSの代わりにオープンソースを自前で動かすことを検討している、日本のチーム向けのサイトです。サーバー・ホスティング、運用支援、開発者向けツールなど、読者の検討に役立つサービスのスポンサー掲載を受け付けています。`}
        </p>

        <div className="prose">
          <h2>読者</h2>
          <ul>
            <li>{"使っているSaaSの代わりになるオープンソースを探している、企業のエンジニア・情報システム担当者"}</li>
            <li>{"セルフホストの導入や運用を検討している、中小企業やスタートアップのチーム"}</li>
            <li>{"ライセンス・セキュリティ・更新状況を比べて、導入の判断材料を集めている人"}</li>
          </ul>
          <p>
            {`現在、${meta.tool_count}件のオープンソースと、${meta.competitors ?? "—"}種類のSaaSの代替を掲載しています。アクセス数などの資料は、お問い合わせいただいた際にお送りします。`}
          </p>

          <h2>掲載できる場所</h2>
          <ul>
            <li>
              <strong>SaaSの代替ページ・ブログ記事のスポンサー枠</strong>
              {"：本文の下に、「スポンサー」と明記した枠で表示します。用途に合うページ（例：チャットの代替ページに、チャットのホスティングサービス）に絞った掲載も相談できます。"}
            </li>
          </ul>
          <p>{"料金と期間は、掲載する場所と内容に合わせて個別にご相談します。"}</p>

          <h2>お約束（中立性について）</h2>
          <ul>
            <li>{"スポンサーかどうかで、ツールの掲載の順番・評価・比較の内容が変わることはありません（並び順は公開データの健全度スコアなどにもとづきます）。"}</li>
            <li>{"スポンサー枠は、通常の掲載と見分けがつくよう、必ず「スポンサー」と表示します。"}</li>
            <li>{"記事の中身をスポンサーの意向で書き換えることはありません。"}</li>
            <li>{"サイトの読者に合わないと判断した場合は、掲載をお断りすることがあります。"}</li>
          </ul>
          <p>
            {"オープンソースの掲載そのものは無料です。掲載を希望する場合は"}
            <Link href="/submit/">掲載リクエスト</Link>
            {"からお送りください。"}
          </p>

          <h2>お問い合わせ</h2>
          <p>
            {"件名に「スポンサー掲載について」と書いて、"}
            {mail ? (
              <a href={`mailto:${mail}?subject=${encodeURIComponent("スポンサー掲載について")}`}>{mail}</a>
            ) : (
              <Link href="/contact/">お問い合わせ</Link>
            )}
            {"までご連絡ください。会社名、掲載したいサービス、希望の時期を添えていただけるとスムーズです。"}
          </p>
        </div>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
