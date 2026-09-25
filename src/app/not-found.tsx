import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getMeta } from "@/lib/data";

// Next.js の特殊ファイル not-found.tsx も他のページと同じく metadata を
// 上書きできる。これが無いとルートレイアウトのタイトル（トップページと同じ
// 「ossalt.jp — 国産SaaSの代わりに、自前で動かす」）がそのまま出てしまう。
export const metadata: Metadata = {
  title: "ページが見つかりません",
  description: "お探しのページは見つかりませんでした。ツール一覧またはカテゴリから探し直してください。",
};

export default function NotFound() {
  const meta = getMeta();
  return (
    <>
      <SiteHeader />
      <main className="wrap page">
        <p className="hero__eyebrow">404 / Not Found</p>
        <h1 className="h2">お探しのページは見つかりませんでした</h1>
        <p className="lede">{"掲載を終了したツールか、URLが変わった可能性があります。ツール一覧またはカテゴリから探し直してください。"}</p>
        <div className="hero__actions">
          <Link className="btn btn--primary" href="/tools/">
            ツール一覧へ
          </Link>
          <Link className="btn" href="/categories/">
            カテゴリから探す
          </Link>
          <Link className="btn" href="/">
            トップへ戻る
          </Link>
        </div>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
