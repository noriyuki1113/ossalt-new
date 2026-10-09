import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { CATEGORIES } from "@/lib/categories";
import { getMeta } from "@/lib/data";
import { SITE } from "@/lib/site";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "広告・スポンサー掲載（媒体資料）",
  description:
    "SaaSからの乗り換えを検討している日本のチームに向けた、ossalt.jpのスポンサー枠のご案内です。掲載の順番・スコア・評価は販売しません。",
  path: "/advertise/",
});

/**
 * 媒体資料の初版（docs/revenue/REVENUE_STRATEGY.md）。
 * 数値は、ビルド時のデータから出せる掲載数だけを載せる。アクセス数・読者の属性は計測できていないので
 * 「計測中」と書き、推測の数値を載せない。料金は実績がないため公開せず、個別に相談する。
 */
export default function AdvertisePage() {
  const meta = getMeta();
  const mail = SITE.contactEmail;
  const subject = encodeURIComponent("スポンサー掲載について");

  return (
    <>
      <SiteHeader />
      <main className="wrap page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: "広告・スポンサー掲載" }]} />
        <h1 className="h2">広告・スポンサー掲載</h1>
        <p className="lede">
          {`${SITE.name}は、SaaSの代わりにオープンソースを自分のサーバーで動かすことを検討している、日本のチーム向けの比較サイトです。サーバー・ホスティング、バックアップ、運用支援、開発者向けのサービスなど、読者の導入の検討に役立つサービスのスポンサー掲載を受け付けています。`}
        </p>

        <div className="prose">
          <h2>媒体の概要</h2>
          <div className="table-scroll">
            <table>
              <tbody>
                <tr>
                  <th scope="row">掲載しているオープンソース</th>
                  <td>{`${meta.tool_count}件`}</td>
                </tr>
                <tr>
                  <th scope="row">SaaSの代替ページ</th>
                  <td>{meta.competitors ? `${meta.competitors}種類のSaaS` : "—"}</td>
                </tr>
                <tr>
                  <th scope="row">カテゴリ</th>
                  <td>{`${CATEGORIES.length}分類`}</td>
                </tr>
                <tr>
                  <th scope="row">月間の訪問数・表示回数</th>
                  <td>計測中（実績の数値がそろったら、ここに掲載します）</td>
                </tr>
                <tr>
                  <th scope="row">読者の属性（業種・役職など）</th>
                  <td>取得していません（Cookieを使わない計測のため）</td>
                </tr>
                <tr>
                  <th scope="row">データの更新</th>
                  <td>毎日（GitHubのスター数・更新状況・セキュリティの評価など）</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2>想定している読者</h2>
          <ul>
            <li>{"使っているSaaSの代わりになるオープンソースを探している、企業のエンジニア・情報システム担当者"}</li>
            <li>{"セルフホストの導入や運用を検討している、中小企業やスタートアップのチーム"}</li>
            <li>{"ライセンス・セキュリティ・更新状況を比べて、導入の判断材料を集めている人"}</li>
          </ul>
          <p className="muted">{"読者像はサイトの内容から想定したもので、調査の結果ではありません。"}</p>

          <h2>掲載の方法</h2>
          <ul>
            <li>
              <strong>掲載できる場所</strong>
              {"：SaaSの代替ページ・カテゴリのページ・ブログ記事の、本文と比較の後。1ページに1枠だけです。用途に合うページ（例：チャットの代替ページに、チャットのホスティングサービス）に絞った掲載もできます。"}
            </li>
            <li>
              <strong>形式</strong>
              {"：文字の枠（広告主の名前、見出し40字以内、説明120字以内、リンク1つ）。ページの表示を遅くしないよう、画像・動画・追従する表示・ポップアップは使いません。"}
            </li>
            <li>
              <strong>表示</strong>
              {"：枠には必ず「スポンサー」と表示し、リンクには有料のリンクであることを示す属性（rel=\"sponsored\"）を付けます。"}
            </li>
            <li>
              <strong>報告</strong>
              {"：掲載の終了後に、枠が画面内で見られた回数と、リンクが押された回数をお知らせします（Cookieを使わない計測のため、個人や会社を特定する情報はお渡しできません）。"}
            </li>
          </ul>

          <h2>試験掲載（1社限定）</h2>
          <p>
            {"現在は、1社限定・1か月の試験掲載をご相談しています。料金は、掲載する場所と期間に合わせて個別にお見積もりします（アクセスの実績がそろうまで、定価は公開しません）。"}
          </p>

          <h2>販売しないもの・お断りするもの</h2>
          <ul>
            <li>{"ツールの掲載の順番、健全度スコア、比較の内容、記事の評価は販売しません。スポンサーかどうかで変わることはありません。"}</li>
            <li>{"記事の中身を、スポンサーの意向で書き換えることはありません。"}</li>
            <li>{"読者の個人情報を広告主に提供することはありません。"}</li>
            <li>{"確認できない価格・割引・性能の表現、読者の検討に関係のない広告はお断りします。サイトの読者に合わないと判断した場合も、掲載をお断りすることがあります。"}</li>
          </ul>
          <p>
            {"オープンソースの掲載そのものは無料です。掲載を希望する場合は"}
            <Link href="/submit/">掲載リクエスト</Link>
            {"からお送りください。編集の方針は"}
            <Link href="/editorial/">編集方針</Link>
            {"をご覧ください。"}
          </p>

          <h2>お問い合わせ</h2>
          <p>
            {"件名に「スポンサー掲載について」と書いて、"}
            {mail ? (
              <a
                href={`mailto:${mail}?subject=${subject}`}
                data-umami-event="advertise_inquiry"
                data-umami-event-via="mail"
              >
                {mail}
              </a>
            ) : (
              <Link href="/contact/" data-umami-event="advertise_inquiry" data-umami-event-via="contact">
                お問い合わせ
              </Link>
            )}
            {"までご連絡ください。会社名、掲載したいサービス、希望の時期と場所を添えていただけるとスムーズです。"}
          </p>
        </div>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
