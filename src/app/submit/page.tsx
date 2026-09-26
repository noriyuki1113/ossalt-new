import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getMeta } from "@/lib/data";

export const metadata: Metadata = {
  title: "掲載リクエスト",
  description:
    "ossalt.jp に掲載してほしいオープンソースのツールを受け付けています。掲載の条件と、リクエストの送り方を説明します。",
  alternates: { canonical: "/submit/" },
};

const REQUEST_URL =
  "https://github.com/noriyuki1113/ossalt-new/issues/new?template=tool-request.yml";

export default function SubmitPage() {
  const meta = getMeta();

  return (
    <>
      <SiteHeader />
      <main className="wrap page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: "掲載リクエスト" }]} />
        <h1 className="h2">掲載リクエスト</h1>
        <p className="lede">
          当サイトに載っていないオープンソースのツールをご存じでしたら、ぜひ教えてください。開発者の方からのリクエストも歓迎します。
        </p>

        <div className="prose">
          <h2>掲載の条件</h2>
          <p>次の条件をすべて満たすツールを掲載しています。</p>
          <ul>
            <li>
              <strong>ソースコードが公開されている</strong>
              {"：一般的なオープンソースライセンスでないもの（ソース公開型）も対象です。その場合は、ツールのページでライセンスの注意を表示します。"}
            </li>
            <li>
              <strong>GitHub でリポジトリが公開されている</strong>
              {"：スター数・更新状況・セキュリティの情報を GitHub から自動で取得しているためです。"}
            </li>
            <li>
              <strong>自分のサーバーやパソコンで動かせる</strong>
              {"：開発元のクラウド版しか使えないものは対象外です。"}
            </li>
            <li>
              <strong>代わりになる有料のサービス（SaaS）がある</strong>
              {"：当サイトは「このサービスの代わりになるもの」を探すためのサイトです。"}
            </li>
            <li>
              <strong>開発が続いている</strong>
              {"：アーカイブ（開発終了）されたリポジトリは掲載しません。"}
            </li>
          </ul>

          <h2>リクエストの送り方</h2>
          <p>
            {"GitHub の入力フォームから送ってください。ツール名・リポジトリのURL・代わりになるサービス・簡単な説明を入力するだけで済みます。送るには GitHub のアカウント（無料）が必要です。"}
          </p>
          <p>
            <a className="btn btn--primary" href={REQUEST_URL} rel="noopener">
              掲載リクエストを送る（GitHub）
            </a>
          </p>
          <p className="muted" style={{ fontSize: "0.875rem" }}>
            {"送った内容は GitHub 上で公開されます。個人情報は書かないでください。GitHub のアカウントが無い場合は、"}
            <Link href="/contact/">お問い合わせ</Link>
            {"からもお送りいただけます。"}
          </p>

          <h2>掲載までの流れ</h2>
          <ol>
            <li>運営者が内容を確認し、掲載するかどうかを判断します。</li>
            <li>掲載する場合は、スター数やライセンスなどの情報を GitHub から自動で取得して、ツールのページを作ります。</li>
            <li>結果は、リクエストのページでお知らせします。</li>
          </ol>
          <p>
            {"掲載料はかかりません。また、リクエストの有無や、送り主が開発者かどうかによって、掲載の順番や評価が変わることはありません。条件を満たしていても、掲載をお断りしたり、時間がかかったりする場合があります。"}
          </p>
        </div>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
