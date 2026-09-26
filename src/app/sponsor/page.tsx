import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getMeta } from "@/lib/data";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "スポンサー・広告掲載",
  description:
    "ossalt.jp のスポンサー・広告掲載メニュー。OSS、クラウド、VPS、開発者向けサービスを、関連性の高い読者に届けます。",
  alternates: { canonical: "/sponsor/" },
};

const plans = [
  {
    name: "Sponsored Card",
    price: "9,800円/月〜",
    fit: "まず1枠から試したい企業向け",
    items: [
      "関連性の高い1ページにスポンサー枠を掲載",
      "「Sponsored / 広告」を明示",
      "ロゴまたはサービス名・短い紹介文・CTA",
      "Umamiで表示数・クリック数を計測",
    ],
  },
  {
    name: "Category Sponsor",
    price: "29,800円/月〜",
    fit: "カテゴリ単位で認知を取りたい企業向け",
    items: [
      "関連カテゴリ・SaaS代替ページなど複数箇所に掲載",
      "競合しない範囲で掲載面を調整",
      "表示数・クリック数の月次サマリー",
      "掲載文面は公開前に双方で確認",
    ],
  },
  {
    name: "Partner",
    price: "個別見積",
    fit: "継続的な共同企画・複数枠向け",
    items: [
      "複数カテゴリ・複数ページへの展開",
      "特集・検証企画などは広告であることを明示",
      "期間・掲載面・レポート内容を個別設計",
      "編集評価やランキングへの介入は不可",
    ],
  },
] as const;

export default function SponsorPage() {
  const meta = getMeta();
  const mailto = SITE.contactEmail
    ? `mailto:${SITE.contactEmail}?subject=${encodeURIComponent("ossalt.jp スポンサー掲載について")}`
    : null;

  return (
    <>
      <SiteHeader />
      <main className="wrap page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: "スポンサー・広告掲載" }]} />

        <p className="hero__eyebrow">For sponsors / OSSALT.JP</p>
        <h1 className="h2">スポンサー・広告掲載</h1>
        <p className="lede">
          OSS、クラウド、VPS、開発者向けサービスを、
          SaaSの乗り換えやセルフホストを検討している読者に届けるための広告メニューです。
        </p>

        <div className="notice notice--info" style={{ marginBottom: "2rem" }}>
          <strong>広告と編集評価は分離します。</strong>
          <br />
          スポンサーの有無や広告料金によって、ツールのランキング、健全度スコア、
          OpenSSF Scorecard、比較表の並び順を変更することはありません。
        </div>

        <section className="section section--first">
          <div className="section__head">
            <h2>掲載メニュー</h2>
            <span className="panel__meta">立ち上げ期の料金目安</span>
          </div>
          <div className="grid-2">
            {plans.map((plan) => (
              <div className="panel" key={plan.name}>
                <div className="panel__head">
                  <h3 className="panel__title">{plan.name}</h3>
                  <span className="panel__meta">{plan.price}</span>
                </div>
                <div className="panel__body">
                  <p style={{ fontWeight: 700, marginTop: 0 }}>{plan.fit}</p>
                  <ul style={{ paddingLeft: "1.2rem", marginBottom: 0 }}>
                    {plan.items.map((item) => (
                      <li key={item} style={{ marginBottom: "0.45rem" }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
          <p className="muted" style={{ fontSize: "0.8125rem" }}>
            料金は掲載面・期間・制作量によって変わります。契約前に掲載内容と金額を確定します。
          </p>
        </section>

        <section className="section">
          <div className="section__head">
            <h2>相性のよいサービス</h2>
          </div>
          <div className="panel">
            <div className="panel__body">
              <p style={{ marginTop: 0 }}>
                VPS、クラウド、Dockerホスティング、バックアップ、監視、
                セキュリティ、ストレージ、CI/CD、メール配信など、
                OSS導入・運用と直接関係するサービスを想定しています。
              </p>
              <p className="muted" style={{ marginBottom: 0, fontSize: "0.875rem" }}>
                読者との関連性が低い広告や、比較結果に影響を与える条件での掲載はお受けしません。
              </p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section__head">
            <h2>計測とレポート</h2>
          </div>
          <div className="panel">
            <div className="panel__body">
              <p style={{ marginTop: 0 }}>
                広告枠の表示とクリックはUmamiのカスタムイベントで計測します。
                提供できる指標は、掲載面ごとの表示数、クリック数、CTRを基本とします。
              </p>
              <p className="muted" style={{ marginBottom: 0, fontSize: "0.875rem" }}>
                個人を特定する情報は広告レポートに含めません。
              </p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section__head">
            <h2>掲載までの流れ</h2>
          </div>
          <ol>
            <li>サービス名・希望する掲載面・希望期間を連絡</li>
            <li>ossalt.jp側で関連性と掲載可否を確認</li>
            <li>掲載内容・期間・料金を確定</li>
            <li>広告表示と計測を開始</li>
            <li>期間終了後または月次で実績を共有</li>
          </ol>

          <div className="hero__actions" style={{ marginTop: "1.5rem" }}>
            {mailto ? (
              <a className="btn btn--primary" href={mailto}>
                {SITE.contactEmail} に問い合わせる
              </a>
            ) : (
              <Link className="btn btn--primary" href="/contact/">
                お問い合わせ
              </Link>
            )}
            <Link className="btn" href="/about/">
              編集方針を見る
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
