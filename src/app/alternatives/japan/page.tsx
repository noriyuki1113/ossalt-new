import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getAlternativeGuide } from "@/lib/alternative-guides";
import { getCompetitor, getMeta } from "@/lib/data";
import { JAPAN_SAAS_GROUPS } from "@/lib/japan-saas";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "kintone・freee・SmartHRなど、日本のSaaSの代わりになるオープンソース",
  description:
    "kintone・freee・マネーフォワード・SmartHR・Backlog・クラウドサインなど、国内で使われているSaaSの代わりに自前で動かせるオープンソースをまとめました。日本の制度への対応など、乗り換える前に確かめたいことも整理しています。",
  path: "/alternatives/japan/",
  type: "article",
});

/** 導入文の最初の1文（一覧で短く見せるため） */
function firstSentence(text: string): string {
  const m = text.match(/^[^。]*。/);
  // 個別ページ向けの「このページの候補は」は、まとめページでは「候補は」にする
  return (m ? m[0] : text).replace(/^このページの候補は/, "候補は");
}

export default function JapanSaasPage() {
  const meta = getMeta();
  const groups = JAPAN_SAAS_GROUPS.map((g) => ({
    label: g.label,
    items: g.slugs
      .map((slug) => {
        const c = getCompetitor(slug);
        if (!c) return null;
        const guide = getAlternativeGuide(slug);
        return { slug, name: c.name, n: c.tools.length, intro: guide?.intro ? firstSentence(guide.intro) : "" };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
  })).filter((g) => g.items.length > 0);
  const total = groups.reduce((s, g) => s + g.items.length, 0);

  return (
    <>
      <SiteHeader current="/alternatives" />
      <main className="wrap page">
        <Breadcrumbs
          items={[
            { href: "/", label: "トップ" },
            { href: "/alternatives/", label: "SaaSから探す" },
            { label: "日本のSaaS" },
          ]}
        />
        <h1 className="h2">日本のSaaSの代わりになるオープンソース</h1>
        <p className="lede">
          {`kintone・freee・SmartHRなど、国内で使われているSaaS${total}件について、代わりに自前で動かせるオープンソースをまとめました。`}
        </p>

        <div className="prose">
          <p>
            日本のSaaSには、日本の制度や商習慣に合わせた機能があります。たとえば、インボイス制度に沿った請求書、社会保険の手続き、銀行の明細の自動取り込みなどです。海外で作られたオープンソースの多くは、こうした日本ならではの機能を持っていません。
          </p>
          <p>
            そのため、日本のSaaSをオープンソースに置き換えるときは「すべてを置き換える」のではなく、「自前で持ちたい部分だけを置き換え、日本の制度に関わる部分は国内のサービスや専門家に任せる」という分け方が現実的です。各ページでは、代わりにできることと、SaaSのままのほうがよい場合の両方を書いています。
          </p>
        </div>

        {groups.map((g) => (
          <section key={g.label} className="section">
            <h2 className="h3">{g.label}</h2>
            <ul>
              {g.items.map((it) => (
                <li key={it.slug} style={{ marginBottom: "0.875rem" }}>
                  <Link href={`/alternatives/${it.slug}/`}>
                    <strong>{`${it.name}の代わり`}</strong>
                  </Link>
                  <span className="muted">{`（${it.n}件）`}</span>
                  {it.intro && (
                    <>
                      <br />
                      <span className="muted" style={{ fontSize: "0.875rem" }}>
                        {it.intro}
                      </span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="section">
          <h2 className="h3">乗り換える前に確かめたいこと</h2>
          <div className="prose">
            <ul>
              <li>
                <strong>日本の制度への対応</strong>
                ：税、労務、電子帳簿保存法などに関わる業務は、ツールが日本の制度に合っているかを自分で確かめる必要があります。迷う場合は、税理士や社会保険労務士などの専門家に相談してください。
              </li>
              <li>
                <strong>画面とドキュメントの言語</strong>
                ：画面の日本語翻訳があっても、ドキュメントや質問できるコミュニティは英語が中心のことが多いです。日本語に対応したツールは「
                <Link href="/japanese/">日本語で使えるオープンソース</Link>
                」にまとめています。
              </li>
              <li>
                <strong>困ったときの相談先</strong>
                ：国内のSaaSのような日本語のサポート窓口はありません。社内で運用できる人がいるか、外部に頼める先があるかを先に考えましょう。
              </li>
              <li>
                <strong>取引先や従業員への影響</strong>
                ：請求書や契約書は相手があるものです。切り替えで相手に手間をかけないか、事前に確認しておきましょう。
              </li>
            </ul>
          </div>
        </section>

        <section className="section">
          <p>
            <Link href="/alternatives/">ほかのSaaSの代替を探す</Link>
          </p>
        </section>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
