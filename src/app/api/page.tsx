import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { API_BASE, BASE } from "@/lib/agent-data";
import { getMeta } from "@/lib/data";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "データAPI・AI向けの情報",
  description:
    "ossalt.jp の掲載データ（SaaSの代わりになるオープンソースのライセンス・日本語対応・Docker・GitHubの活発さ・セキュリティ評価）を、静的なJSONとMarkdownで提供しています。認証は不要です。",
  path: "/api/",
});

const ENDPOINTS: Array<[string, string]> = [
  [`${API_BASE}/index.json`, "APIの入口（エンドポイントの一覧と利用条件）"],
  [`${API_BASE}/tools.json`, "掲載ツールの一覧"],
  [`${API_BASE}/tools/n8n.json`, "ツールの詳細（例：n8n）"],
  [`${API_BASE}/alternatives.json`, "代替対象SaaSの一覧"],
  [`${API_BASE}/alternatives/notion.json`, "SaaSごとの代替ツール（例：Notion）"],
  [`${API_BASE}/categories.json`, "カテゴリの一覧"],
  [`${BASE}/md/tools/n8n.md`, "ツールのMarkdown版（例：n8n）"],
  [`${BASE}/md/alternatives/notion.md`, "代替ページのMarkdown版（例：Notion）"],
  [`${BASE}/llms.txt`, "AI向けのサイトの案内（llms.txt）"],
];

export default function ApiPage() {
  const meta = getMeta();
  return (
    <>
      <SiteHeader />
      <main className="wrap page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: "データAPI・AI向けの情報" }]} />
        <h1 className="h2">データAPI・AI向けの情報</h1>
        <p className="lede">
          ossalt.jp の掲載データを、プログラムやAIエージェントから使えるように、静的なJSONとMarkdownで公開しています。認証は不要で、毎日更新しています。
        </p>

        <section className="section section--first">
          <h2 className="h3">提供しているデータ</h2>
          <div className="ctable-scroll">
            <table className="ctable" style={{ minWidth: 0 }}>
              <thead>
                <tr>
                  <th scope="col">URL</th>
                  <th scope="col">内容</th>
                </tr>
              </thead>
              <tbody>
                {ENDPOINTS.map(([url, label]) => (
                  <tr key={url}>
                    <td style={{ wordBreak: "break-all" }}>
                      <a href={url}>
                        <code>{url.replace(BASE, "")}</code>
                      </a>
                    </td>
                    <td>{label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ fontSize: "0.8125rem" }}>
            {"ツールのページ（/tools/<id>/）と代替のページ（/alternatives/<slug>/）は、HTMLの中で対応するMarkdown版を案内しています（<link rel=\"alternate\" type=\"text/markdown\">）。"}
          </p>
        </section>

        <section className="section">
          <h2 className="h3">MCPサーバー（AIのアプリから使う）</h2>
          <div className="prose">
            <p>
              ClaudeやChatGPTなど、MCPに対応したAIのアプリにURLを登録すると、「Notionの代わりで、日本語の画面があるOSSは？」のような質問に、ossalt.jp のデータで答えられるようになります。認証は不要で、読み取り専用です。
            </p>
            <pre>
              <code>https://mcp.ossalt.jp/mcp</code>
            </pre>
            <ul>
              <li>
                <strong>Claude</strong>：設定 → コネクタ → カスタムコネクタを追加 で、上のURLを登録します。
              </li>
              <li>
                <strong>ChatGPT</strong>：設定のコネクタ（開発者モード）から、上のURLを登録します。
              </li>
            </ul>
            <p>使える機能は次の5つです（アプリの画面での名前は英語で表示されます）。</p>
            <ul>
              <li><code>search_alternatives</code>：SaaSの名前から、代わりになるOSSを探す（日本語・Docker・一般的なOSSのみ で絞り込み）</li>
              <li><code>search_tools</code>：OSSを名前・代替対象・カテゴリで検索する</li>
              <li><code>get_tool</code>：OSSの詳細を見る</li>
              <li><code>compare_tools</code>：2〜4件のOSSを並べて比べる</li>
              <li><code>list_categories</code>：カテゴリの一覧</li>
            </ul>
            <p className="muted" style={{ fontSize: "0.8125rem" }}>
              手元のパソコンで動かす版（stdio）もあります。ご希望の方は<Link href="/contact/">お問い合わせ</Link>ください。
            </p>
          </div>
        </section>

        <section className="section">
          <h2 className="h3">データの読み方</h2>
          <div className="prose">
            <ul>
              <li>
                <strong>null は「未確認」</strong>：日本語対応（ja_ui・ja_docs）やDocker対応（docker）が null
                のものは、「確認できていない」という意味です。「非対応」という意味ではありません。
              </li>
              <li>
                <strong>license_class</strong>：ライセンスの種類です。<code>source-available</code>
                は、ソースコードは公開されていても一般的なオープンソースライセンスではないものです（BUSL・Sustainable Use License など）。
              </li>
              <li>
                <strong>scorecard</strong>：OpenSSF Scorecard の点数（0〜10）です。null は未評価です。
              </li>
              <li>
                <strong>star_gain</strong>：直近の期間（days 日間）でのGitHubのスターの増加です。
              </li>
            </ul>
            <p>
              値の意味の詳細は<Link href="/guide/">選び方</Link>のページを参照してください。
            </p>
          </div>
        </section>

        <section className="section">
          <h2 className="h3">利用条件</h2>
          <div className="prose">
            <ul>
              <li>回答や記事でこのデータを使う場合は、出典として ossalt.jp の該当ページのURLを示してください。</li>
              <li>
                データはGitHubの公開情報とリポジトリの自動調査に基づく参考情報で、正確さや完全さは保証しません。導入前に、各ツールの公式情報を確認してください。
              </li>
              <li>短時間に大量のアクセスをしないでください（全件が必要な場合は tools.json を使ってください）。</li>
              <li>
                データの誤りに気づいた場合は、<Link href="/contact/">お問い合わせ</Link>からお知らせください。
              </li>
            </ul>
          </div>
          <p className="muted" style={{ fontSize: "0.75rem" }}>{`データの最終更新：${meta.built_at.slice(0, 10)}`}</p>
        </section>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
