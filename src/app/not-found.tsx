import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getMeta } from "@/lib/data";

export default function NotFound() {
  const meta = getMeta();
  return (
    <>
      <SiteHeader />
      <main className="wrap page">
        <p className="hero__eyebrow">404 / Not Found</p>
        <h1 className="h2">ページが見つかりません</h1>
        <p className="lede">
          掲載を終了したツールか、URLが変わった可能性があります。
          ツール一覧から探し直してください。
        </p>
        <div className="hero__actions">
          <Link className="btn btn--primary" href="/tools/">
            ツール一覧へ
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
