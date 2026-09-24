import type { Metadata } from "next";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getMeta } from "@/lib/data";
import { SITE, t } from "@/lib/site";

export const metadata: Metadata = {
  title: "このサイトについて",
  description:
    "ossalt.jp は、日本のチームがオープンソースソフトへ乗り換える判断をするための情報をまとめたディレクトリです。",
  alternates: { canonical: "/about/" },
};

export default function AboutPage() {
  const meta = getMeta();
  return (
    <>
      <SiteHeader />
      <main className="wrap page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: "このサイトについて" }]} />
        <h1 className="h2">{t("about.title")}</h1>
        <div className="prose">
          <p>
            {SITE.name} は、<strong>「SaaSの月額をやめて自前で動かす」</strong>
            という選択を検討する日本のチームに向けた、オープンソースソフトのディレクトリです。
          </p>
          <p>
            海外の同種サービスは数多くありますが、多くは英語圏の利用を前提としています。
            日本では、ライセンス表記の意味、社内稟議に必要な情報、
            「誰が運用するのか」という現実的な論点が異なります。
            そこで、日本語の説明と、判断に必要な数値（ライセンス・セキュリティ評価・更新状況）を
            並べて確認できる場所として作りました。
          </p>

          <h2>掲載データについて</h2>
          <ul>
            <li>スター数・フォーク数・最終コミット日：GitHubの公開情報</li>
            <li>セキュリティ評価：OpenSSF Scorecard（第三者の機械採点）</li>
            <li>説明文：各プロジェクトの公式説明をもとに日本語で要約</li>
          </ul>
          <p>
            数値は日次の自動処理で更新しています。データの更新日時は各ページ下部に表示されます。
            現在の収録数は{meta.tool_count}件、うちセキュリティ評価を取得できているものは
            {meta.scored_count}件です。取得できていないものは「未評価」と表示し、
            推測値では埋めていません。
          </p>

          <h2>編集方針</h2>
          <ul>
            <li>
              <strong>推測値を載せない。</strong>
              取得できていないデータは「未取得」「未評価」と明示します。
            </li>
            <li>
              <strong>中立に並べる。</strong>
              掲載順は広告費ではなく、公開データ（健全度スコア）にもとづきます。
            </li>
            <li>
              <strong>限界を書く。</strong>
              健全度スコアは規模の大きいプロジェクトほど有利になる指標です。
              その性質を各所に明記しています。
            </li>
          </ul>

          <h2>訂正・追加のリクエスト</h2>
          <p>
            掲載内容に誤りがある場合や、掲載してほしいツールがある場合は
            <a href="/contact/">お問い合わせ</a>からご連絡ください。
          </p>
        </div>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
