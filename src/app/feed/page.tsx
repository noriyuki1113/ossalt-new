import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getMeta } from "@/lib/data";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "RSSで更新を受け取る",
  description: "ossalt.jp のブログ記事や、更新されたツールの情報をRSSリーダーで受け取る方法。",
  alternates: { canonical: "/feed/" },
};

export default function FeedPage() {
  const meta = getMeta();
  const feedUrl = `${SITE.url.replace(/\/$/, "")}/feed.xml`;
  return (
    <>
      <SiteHeader />
      <main className="wrap page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: "RSS" }]} />
        <h1 className="h2">RSSで更新を受け取る</h1>
        <div className="prose">
          <p>
            {"ブログの新しい記事や、最近更新されたツールの情報を、RSSリーダー（更新をまとめて読むアプリ）で受け取れます。"}
          </p>

          <h2>フィードのURL</h2>
          <p>次のURLを、お使いのRSSリーダーに登録してください。</p>
          <p style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
            <code style={{ wordBreak: "break-all" }}>{feedUrl}</code>
            <CopyButton text={feedUrl} label="URLをコピー" />
          </p>
          <p className="muted" style={{ fontSize: "0.8125rem" }}>
            {"多くのRSSリーダーは、サイトのURL（"}
            {SITE.url.replace(/\/$/, "")}
            {"）を入れるだけでもフィードを見つけられます。"}
          </p>

          <h2>届く内容</h2>
          <ul>
            <li>ブログの記事</li>
            <li>最近更新されたツール（最大30件）</li>
          </ul>

          <h2>RSSリーダーについて</h2>
          <p>
            {"RSSリーダーには、スマホのアプリやWebサービスのほか、自前のサーバーで動かせるオープンソースのものもあります。"}
            <Link href="/alternatives/feedly/">Feedlyの代替</Link>
            {"のページで、自前で運用できるRSSリーダーを紹介しています。"}
          </p>
        </div>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
