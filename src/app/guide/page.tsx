import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getMeta } from "@/lib/data";
import { t } from "@/lib/site";

export const metadata: Metadata = {
  title: "自前で動かすソフトの選び方",
  description:
    "オープンソースへの乗り換えで後悔しないための確認項目。ライセンス、セキュリティ、更新の継続性、運用コストの見積もり方。",
  alternates: { canonical: "/guide/" },
};

/**
 * 健全度スコアの目安をキリのよい数字で示すための丸め。
 * 実際の値（meta.health）はビルドごとに動くため、「以上」と言う数字は
 * 切り捨て、「未満」と言う数字は切り上げて、丸めた後も文言が
 * 常に成立するようにする。
 */
function roundDownTo500(n: number): number {
  return Math.floor(n / 500) * 500;
}
function roundUpTo500(n: number): number {
  return Math.ceil(n / 500) * 500;
}

const SECTIONS = [
  { id: "sec-1", label: "まず「やめたい理由」を特定する" },
  { id: "sec-2", label: "ライセンスを必ず確認する" },
  { id: "sec-3", label: "更新が続いているかを見る" },
  { id: "sec-4", label: "健全度スコアは「相対比較」に使う" },
  { id: "sec-5", label: "セキュリティは「未評価」を恐れず、確認する" },
  { id: "sec-6", label: "運用コストを先に見積もる" },
  { id: "sec-7", label: "Docker対応かどうかで難易度が変わる" },
  { id: "sec-8", label: "小さく始める" },
  { id: "sec-9", label: "それでも迷う場合" },
] as const;

export default function GuidePage() {
  const meta = getMeta();
  const health = meta.health;
  const asOf = new Date(meta.built_at);
  const asOfLabel = `${asOf.getFullYear()}年${asOf.getMonth() + 1}月`;

  const healthTable = health && (
    <div className="ctable-scroll guide-table-wrap">
      <table className="guide-table">
        <caption className="skip">健全度スコアの分布による目安</caption>
        <thead>
          <tr>
            <th scope="col">位置</th>
            <th scope="col">スコアの目安</th>
            <th scope="col">読み方</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td data-label="位置">収録全体の上位25%</td>
            <td className="num" data-label="スコアの目安">{roundDownTo500(health.p75).toLocaleString("ja-JP")} 以上</td>
            <td data-label="読み方">非常に活発。大規模プロジェクトが中心です</td>
          </tr>
          <tr>
            <td data-label="位置">上位50%（中央より上）</td>
            <td className="num" data-label="スコアの目安">{roundDownTo500(health.p50).toLocaleString("ja-JP")} 以上</td>
            <td data-label="読み方">活発。多くの著名プロジェクトがこの帯にあります</td>
          </tr>
          <tr>
            <td data-label="位置">下位25%</td>
            <td className="num" data-label="スコアの目安">{roundUpTo500(health.p25).toLocaleString("ja-JP")} 未満</td>
            <td data-label="読み方">小規模、または新しめ。勢いの指標としては低めです</td>
          </tr>
        </tbody>
      </table>
      <p className="muted" style={{ fontSize: "0.75rem", padding: "0 0.85rem 0.85rem" }}>
        {asOfLabel}時点・収録{health.count}件の分布にもとづく目安です。
      </p>
    </div>
  );

  return (
    <>
      <SiteHeader current="/guide" />
      <main className="wrap page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: "選び方" }]} />
        <h1 className="h2">{t("guide.title")}</h1>
        <p className="lede">{t("guide.lede")}</p>

        <nav className="guide-toc" aria-label="目次">
          <p className="guide-toc__title">目次</p>
          <ol>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.label}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="prose">
          <h2 id="sec-1">1. まず「やめたい理由」を特定する</h2>
          <p>
            乗り換えの動機は大きく3つに分かれます。<strong>費用</strong>、
            <strong>データの所在</strong>、<strong>機能の不足</strong>{"です。この3つは必要な対策がまったく違います。"}</p>
          <ul>
            <li>
              <strong>費用が理由</strong>{"なら、月額の差額とサーバ代・運用工数を並べて比較します。利用者が数名でデータ量も少ない場合、VPS代（月1,000〜3,000円程度）で足りることが多く、元が取れるまでの期間を計算できます。"}</li>
            <li>
              <strong>データの所在が理由</strong>{"なら、費用は二の次です。顧客情報・認証情報・ソースコードは、外部に出したくない度合いが特に高い領域です。"}</li>
            <li>
              <strong>機能が理由</strong>{"なら、乗り換えではなく併用を検討します。代替ソフトが目的の機能を持っていない場合、乗り換えは失敗します。"}</li>
          </ul>

          <h2 id="sec-2">2. ライセンスを必ず確認する</h2>
          <p>{"オープンソースとはいえ、条件は同じではありません。商用利用や再販売に制限があるもの、ネットワーク越しに提供する場合にソース公開義務が生じるもの（AGPL）があります。"}
            {"社内利用だけなら多くの場合問題になりませんが、"}<strong>自社サービスに組み込んで提供する場合は必ず確認してください</strong>。
          </p>
          <p>{"また、近年は「オープンソースを名乗っていたソフトが、途中でライセンスを変更する」ケースが増えています。"}
            {"導入時点のライセンスだけでなく、そのプロジェクトの運営主体（単一企業か、財団か、コミュニティか）も見ておくと安全です。"}</p>

          <h2 id="sec-3">3. 更新が続いているかを見る</h2>
          <p>{"最終コミット日が1年以上前のプロジェクトは、注意が必要です。ただし「更新が止まっている＝使えない」ではありません。"}
            {"完成して安定しているソフトは、更新が少なくなります。判断の材料は"}<strong>最終コミット日</strong>と<strong>アーカイブされているか</strong>{"の2つです。リポジトリがアーカイブされている場合は、開発終了が明示されています。"}</p>

          <h2 id="sec-4">4. 健全度スコアは「相対比較」に使う</h2>
          <p>{"健全度スコアは、スター・フォーク・コントリビュータ・ウォッチャー・更新の新しさの5項目から算出した、プロジェクトの「勢い」の目安です。内訳と算出式はツール詳細ページの「健全度」パネルで確認できます。"}</p>
          <p>{"式は合計値なので上限がありません。したがって「何点以上なら良い」という絶対的な基準は存在しません。"}{"正しい使い方は、"}<strong>同じカテゴリ内で比べる、または一覧の並び順として使う</strong>{"ことです。"}</p>
          {healthTable}
          <p>{"スコアが低いことの主な理由は「規模が小さい」ことです。小規模でも目的の機能を満たし、メンテナンスが続いていれば十分に使えます。"}<strong>乗り換えの判断はスコアではなく、最終コミット日・ライセンス・Docker対応で行ってください。</strong></p>
          <p>{"スコアが「—」と表示されている場合は、追加されたばかりでデータ取得前の「未取得」であり、危険という意味ではありません。"}</p>
          <p>{"更新の新しさによる減点は、最終コミットから90日で頭打ち（最大−45点）になります。つまり、91日放置でも2年放置でも減点は変わりません。"}<strong>スコアだけでは「メンテナンスが止まっている」ことを見抜けない</strong>{"ため、最終コミット日は必ず別途確認してください（収録"}{meta.tool_count}{"件中"}{meta.health?.within_90d_count ?? "—"}{"件は90日以内にコミットがあります）。"}</p>

          <h2 id="sec-5">5. セキュリティは「未評価」を恐れず、確認する</h2>
          <p>{"OpenSSF Scorecard は、プロジェクトのセキュリティ対策を第三者が機械的に採点する仕組みです。"}
            {"ただし"}<strong>スコアが無い＝危険、ではありません</strong>{"。大規模で活発なプロジェクトでも未スキャンのものは多くあります。"}</p>
          <p>スコアが無い場合は、次の3点を自分の目で確認してください。</p>
          <ul>
            <li>リポジトリに <code>SECURITY.md</code>（脆弱性の報告窓口）があるか</li>
            <li>依存ライブラリの自動更新（Dependabot等）が設定されているか</li>
            <li>リリースが定期的に出ているか</li>
          </ul>
          <p>{"逆に、スコアが高くても導入すれば安全という意味ではありません。スコアは「開発プロセスの健全さ」を見ているのであって、あなたの運用（公開設定、認証、バックアップ）は別問題です。"}</p>

          <h2 id="sec-6">6. 運用コストを先に見積もる</h2>
          <p>
            セルフホストの最大のコストは、ソフト本体ではなく<strong>運用</strong>{"です。具体的には次のような作業が発生します。"}</p>
          <ul>
            <li>アップデート適用（月1回程度、破壊的変更への対応を含む）</li>
            <li>バックアップと、復元できることの確認</li>
            <li>証明書の更新、ドメインとDNSの管理</li>
            <li>障害時の一次対応（業務時間外も含む）</li>
          </ul>
          <p>{"これらを内製できない場合、外注費（月1〜3万円程度が目安）が加わります。それでもSaaSの月額を下回ることは多いですが、必ず数字を出してから決めてください。"}</p>

          <h2 id="sec-7">7. Docker対応かどうかで難易度が変わる</h2>
          <p>{"Docker（またはDocker Compose）でのインストール手順が用意されているソフトは、導入と更新の難易度が大きく下がります。"}
            {"逆に、「ソースからビルド」「特定のOSのみ対応」のソフトは、運用を引き継げる人が限られます。"}</p>

          <h2 id="sec-8">8. 小さく始める</h2>
          <p>
            いきなり全社の基幹を移すのではなく、
            <strong>影響の小さいものから1つだけ</strong>{"試してください。たとえばアクセス解析やドキュメント共有は、止まっても業務が即座に止まりません。"}
            {"そこで運用手順を確立してから、認証や顧客データへ進むのが安全です。"}</p>

          <h2 id="sec-9">9. それでも迷う場合</h2>
          <p>{"候補を2〜3件に絞れたら、まずは"}<strong>Docker で小さく試す</strong>{"のがいちばん確実です。実際に動かしてみると、ドキュメントだけでは分からない使用感が見えてきます。"}</p>
          <p>{"判断に迷う観点（ライセンス、更新の継続性、Docker対応）は、各ツールの詳細ページにまとめて表示しています。候補を比較するときはそちらを確認してください。"}</p>
          <p>
            サイトの内容についてお気づきの点があれば、
            <Link href="/contact/">お問い合わせ</Link>{"からご連絡ください。"}</p>
        </div>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
