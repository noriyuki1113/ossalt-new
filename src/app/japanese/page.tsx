import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ToolRow } from "@/components/tool-views";
import { getJapaneseTools, getMeta } from "@/lib/data";
import { CATEGORIES } from "@/lib/categories";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "日本語に対応したオープンソース",
  description:
    "画面の日本語翻訳や、日本語のドキュメントがあるオープンソースのツールを、用途別に一覧できます。リポジトリのファイルを自動で調べた結果です。",
  path: "/japanese/",
});

export default function JapanesePage() {
  const meta = getMeta();
  const tools = getJapaneseTools();
  const uiCount = tools.filter((t) => t.ja_ui === true).length;
  const docsCount = tools.filter((t) => t.ja_docs === "official" || t.ja_docs === "community").length;

  const groups = CATEGORIES.map((c) => ({
    ...c,
    items: tools.filter((t) => t.category === c.slug),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <SiteHeader current="/tools" />
      <main className="wrap page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: "日本語に対応したオープンソース" }]} />
        <h1 className="h2">日本語に対応したオープンソース</h1>
        <p className="lede">
          {`画面の日本語翻訳、または日本語のドキュメントがあるツールは${tools.length}件です（画面の翻訳あり${uiCount}件、日本語のドキュメントあり${docsCount}件）。社内に英語が苦手なメンバーがいる場合の候補選びに使えます。`}
        </p>

        <div className="notice notice--info">
          <strong>調べ方と注意点</strong>
          <br />
          {"各リポジトリのファイル一覧とREADMEを自動で調べ、日本語の翻訳ファイル（例：locales/ja.json）や日本語版のドキュメント（例：README.ja.md）があるかを確認しています。翻訳ファイルがあっても、すべての画面が訳されているとは限りません。また、ここに無いツールは「日本語非対応」ではなく、「まだ確認できていない」場合も含みます。"}
        </div>

        <nav className="chips mt2" aria-label="カテゴリへ移動">
          {groups.map((g) => (
            <a key={g.slug} className="chip" href={`#${g.slug}`}>
              {g.nameJa}
              <span className="chip__n">{g.items.length}</span>
            </a>
          ))}
        </nav>

        {groups.map((g) => (
          <section className="section" key={g.slug} id={g.slug}>
            <div className="section__head">
              <h2>{g.nameJa}</h2>
              <Link className="more" href={`/categories/${g.slug}/`}>
                カテゴリのすべてのツール →
              </Link>
            </div>
            <div className="ledger">
              {g.items.map((tool) => (
                <ToolRow key={tool.id} tool={tool} />
              ))}
            </div>
          </section>
        ))}

        <p className="muted mt2" style={{ fontSize: "0.8125rem" }}>
          {"ツールの一覧でも「日本語の画面・資料あり」で絞り込めます。"}
          <Link href="/tools/">ツール一覧へ</Link>
        </p>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
