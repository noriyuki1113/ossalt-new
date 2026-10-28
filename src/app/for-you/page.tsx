import type { Metadata } from "next";
import Link from "next/link";
import { Ja } from "@/components/ja";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ForYou, type PurposeOption } from "@/components/for-you";
import { getCompetitors, getMeta } from "@/lib/data";
import { getCategories } from "@/lib/categories";
import { SAAS_IDS } from "@/lib/diagnosis-types";
import {
  DIVERSITY, EMPHASIS_MULTIPLIER, NEUTRAL, PROFILE_LABELS, PROFILE_WEIGHTS, RELATION_POINTS, SIGNAL_LABELS,
} from "@/lib/recommend/ranking-config";
import type { Profile, SignalKey } from "@/lib/recommend/types";
import { pageMeta } from "@/lib/seo";
import { FEATURES } from "@/lib/site";
import { formatDate } from "@/lib/tools";

export const metadata: Metadata = pageMeta({
  title: "OSSALT For You｜あなたに合うOSSを、理由とともに",
  description:
    "置き換えたいSaaSや用途、技術レベル、ライセンス、Docker・日本語・商用利用の条件を選ぶと、合うオープンソースを推薦理由と注意点つきで表示します。計算の根拠もすべて公開しています。",
  path: "/for-you/",
  // 機能フラグが有効になるまでは、検索エンジンに登録しない（段階公開）
  noindex: !FEATURES.forYou,
});

const pct = (w: number) => `${Math.round(w * 100)}%`;
const KEYS: SignalKey[] = ["fit", "maintenance", "security", "ease"];

export default function ForYouPage() {
  const meta = getMeta();
  const groups = getCompetitors();
  // 診断データのある5つのSaaSを先頭に、その後は代替の件数が多い順（同数は名前順）
  const saasOptions: PurposeOption[] = [
    ...SAAS_IDS.map((s) => groups.find((g) => g.slug === s)).filter((g) => g != null),
    ...groups.filter((g) => !(SAAS_IDS as string[]).includes(g.slug)).sort((a, b) => b.tools.length - a.tools.length || a.name.localeCompare(b.name, "ja")),
  ].map((g) => ({ slug: g.slug, label: g.name, count: g.tools.length }));
  const categoryOptions: PurposeOption[] = getCategories().map((c) => ({ slug: c.slug, label: c.nameJa, count: c.count }));

  return (
    <>
      <SiteHeader current="/for-you" />
      <main className="wrap page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: "OSSALT For You" }]} />
        <h1 className="h2">
          OSSALT For You
          {!FEATURES.forYou && <span className="fy-beta">試験公開</span>}
        </h1>
        <p className="lede">
          <Ja>{"あなたに合うOSSを、理由とともに発見する。置き換えたいSaaSと、あなたの条件を選ぶと、掲載データから合う候補を並べ、なぜおすすめなのか・何を確かめるべきかを表示します。ログインは不要で、入力した条件はこの画面のURLにだけ保存されます。"}</Ja>
        </p>

        <ForYou saasOptions={saasOptions} featureSaas={[...SAAS_IDS]} categoryOptions={categoryOptions} />

        <section className="fy-method mt2" aria-labelledby="fy-method-h">
          <h2 id="fy-method-h" className="h3">
            推薦の仕組みと計算の根拠
          </h2>
          <ol className="fy-steps">
            <li>
              <strong>候補を集める：</strong>
              {"選んだSaaSの代替として掲載しているOSS、編集部が代わりになると指定したOSS、OSS診断のデータ、同じカテゴリの類似のOSS、人気・急成長ランキングの上位から集め、同じOSSは1件にまとめます。"}
            </li>
            <li>
              <strong>条件に合わない候補を外す：</strong>
              {"ライセンス・Docker・日本語・必要な機能などの必須条件に「合わないことを確認済み」のもの、公式に保守停止が告知されているものは、減点ではなく候補から外し、理由を表示します。未確認のものは外さず、注意として表示します。"}
            </li>
            <li>
              <strong>4つの項目で採点する：</strong>
              {`各項目を0〜100点にそろえてから、あなたのタイプに合わせた重みで足します（100点満点）。確認できない項目は、0点や「安全」とせず、中立の${NEUTRAL}点で計算し、根拠の確認率として別に示します。`}
            </li>
            <li>
              <strong>似た候補ばかりにならないよう並べ替える：</strong>
              {`同じ組織・同じ用途・同じトピックの候補が続くときは、最大${DIVERSITY.penalty}点ぶん下げて並べ、別の候補にも目が届くようにします。ただし、用途の適合度が低い候補を、多様性のために上げることはしません。上位${DIVERSITY.topK}件に比較的小規模なOSSが無ければ、近い点の小規模なOSSに1枠を確保します。`}
            </li>
            <li>
              <strong>理由と注意を表示する：</strong>
              {"理由は、採点に使った数値と判定から決まった文面で作ります。文章の生成AIは使わず、データに無い機能や対応状況は書きません。"}
            </li>
          </ol>

          <div className="ctable-scroll">
            <table className="ctable fy-weights">
              <caption className="muted">あなたのタイプごとの重み（初期値）</caption>
              <thead>
                <tr>
                  <th scope="col">項目</th>
                  {(Object.keys(PROFILE_LABELS) as Profile[]).map((p) => (
                    <th key={p} scope="col">
                      {PROFILE_LABELS[p]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {KEYS.map((k) => (
                  <tr key={k}>
                    <th scope="row">{SIGNAL_LABELS[k]}</th>
                    {(Object.keys(PROFILE_LABELS) as Profile[]).map((p) => (
                      <td key={p} className="num">
                        {pct(PROFILE_WEIGHTS[p][k])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="fy-defs">
            <li>
              <strong>{SIGNAL_LABELS.fit}：</strong>
              {`主な代替対象が選んだSaaS＝${RELATION_POINTS.primary}点、編集部の指定で代わりになる＝${RELATION_POINTS.also}点、同じカテゴリの類似のOSS＝${RELATION_POINTS.similar}点。必要な機能を選んだときは、診断データで対応を確認できた割合を半分の重みで加えます（未確認の機能は半分として数えます）。`}
            </li>
            <li>
              <strong>{SIGNAL_LABELS.maintenance}：</strong>
              {"最終コミットからの日数（70%）と、直近12か月のリリース回数（30%）。コミットの頻度だけで品質を決めつけないよう、点は段階的にしています。"}
            </li>
            <li>
              <strong>{SIGNAL_LABELS.security}：</strong>
              {"OpenSSF Scorecard（60%）、脆弱性の報告窓口（SECURITY.md、20%）、Dependabotの設定（20%）のうち、確認できたものだけで計算します。安全性を保証するものではありません。"}
            </li>
            <li>
              <strong>{SIGNAL_LABELS.ease}：</strong>
              {"導入の手間（80%）と、日本語の画面・資料（20%）。導入の手間は、診断データの導入難易度（必要な技術レベルがあなたより高い分は減点）で、診断データが無いOSSはDockerで動かす手段を確認できたかで判断します。"}
            </li>
            <li>
              {`「重視すること」を選ぶと、その項目の重みを${EMPHASIS_MULTIPLIER}倍にしてから、合計が100%になるように割り戻します。成長性（Starの増え方）はこの合計に入れず、`}
              <Link href="/rankings/">急成長ランキング</Link>
              {"で別に扱います。"}
            </li>
          </ul>
          <p className="muted">
            {`データの取得日：${formatDate(meta.stars_as_of ?? meta.built_at)}。推薦は掲載しているOSSの中での相対的なもので、品質や安全性を保証するものではありません。導入の前に、各ツールのページで最新の状況を確認してください。考え方は、xAIが公開しているXの推薦アルゴリズム（xai-org/x-algorithm、Apache-2.0）の「候補の取得→絞り込み→複数の指標の加重和→多様性の調整」という段階の分け方を参考にしています（コードの流用はしていません）。`}
          </p>
        </section>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
