import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { CopyButton } from "@/components/copy-button";
import { badgeSnippets } from "@/components/listing-badge";
import { getMeta } from "@/lib/data";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "掲載バッジ",
  description:
    "ossalt.jpに掲載されているオープンソースの開発者向けに、READMEなどに貼れる「Listed on ossalt.jp」バッジを用意しています。",
  path: "/badge/",
});

export default function BadgePage() {
  const meta = getMeta();
  const example = badgeSnippets("<ツールのid>");

  return (
    <>
      <SiteHeader />
      <main className="wrap page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: "掲載バッジ" }]} />
        <h1 className="h2">掲載バッジ</h1>
        <p className="lede">
          {"当サイトに掲載されているオープンソースの開発者の方は、READMEやWebサイトにこのバッジを貼れます。日本の利用者に、日本語でツールの情報を確認できる場所を案内できます。"}
        </p>

        <p className="badge-box__preview">
          <img src="/badges/listed-en.svg" alt="Listed on ossalt.jp" height={28} />
          <img src="/badges/listed-ja.svg" alt="ossalt.jp に掲載" height={28} />
        </p>

        <div className="prose">
          <h2>使い方</h2>
          <ol>
            <li>
              <Link href="/tools/">ツール一覧</Link>
              {"から、ご自身のツールのページを開きます。"}
            </li>
            <li>{"ページの下の方にある「開発者の方へ：掲載バッジ」を開きます。"}</li>
            <li>{"Markdown（英語・日本語）かHTMLのコードをコピーして、READMEなどに貼ります。"}</li>
          </ol>
          <p>{"ツールのページで表示されるコードには、そのツールのページへのリンクが最初から入っています。形式は次のとおりです。"}</p>
        </div>

        {example.map((s) => (
          <div className="badge-box__snippet" key={s.label}>
            <div className="badge-box__label">
              <span>{s.label}</span>
              <CopyButton text={s.code} />
            </div>
            <code>{s.code}</code>
          </div>
        ))}

        <div className="prose mt2">
          <h2>お約束</h2>
          <ul>
            <li>{"バッジの利用は無料で、申し込みや連絡は要りません。"}</li>
            <li>{"バッジを貼っているかどうかで、掲載の順番や評価が変わることはありません。"}</li>
            <li>{"バッジの画像は改変せずにお使いください。大きさは、高さ28pxを基準に拡大・縮小して構いません。"}</li>
          </ul>
          <p>
            {"まだ掲載されていないツールは、"}
            <Link href="/submit/">掲載リクエスト</Link>
            {"から教えてください。"}
          </p>
        </div>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
