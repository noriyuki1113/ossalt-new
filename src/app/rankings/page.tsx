import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { RankingTabs } from "@/components/ranking-tabs";
import { getActiveTools, getMeta } from "@/lib/data";
import { GROWTH_WEIGHTS, POPULARITY_WEIGHTS, RECOMMEND_WEIGHTS } from "@/lib/rankings";
import { growthViews, popularViews, recommendedViews } from "@/lib/ranking-views";
import { BROWSER_DATA_PATH } from "@/lib/tool-browser-data";
import { pageMeta } from "@/lib/seo";
import { formatDate } from "@/lib/tools";

export const metadata: Metadata = pageMeta({
  title: "OSSランキング｜人気・急成長・おすすめを分けて比べる",
  description:
    "SaaSの代わりになるオープンソースを、人気（Stars・Forks・Contributors）、急成長（直近7日・30日のStar純増）、おすすめ（用途・保守・ライセンス・日本語・導入のしやすさ）の3つに分けて表示。計算の根拠と観測日を確認できます。",
  path: "/rankings/",
});

const pct = (w: number) => `${Math.round(w * 100)}%`;

export default function RankingsPage() {
  const meta = getMeta();
  const tools = getActiveTools();
  const asOf = formatDate(meta.stars_as_of ?? meta.built_at);

  // 初期HTMLには人気のタブだけを入れる。急成長・おすすめは、同じデータ（/data/tools.json）からブラウザで計算する
  const popular = popularViews(tools, asOf);
  const growthUnobserved = growthViews(tools).unobserved;
  const recommendedSaas = recommendedViews(tools, asOf).map((g) => ({ saas: g.saas, label: g.label }));

  const weights = {
    popular: `Stars ${pct(POPULARITY_WEIGHTS.stars)}・Forks ${pct(POPULARITY_WEIGHTS.forks)}・Contributors ${pct(POPULARITY_WEIGHTS.contributors)}で、`,
    growth: `直近7日の純増 ${pct(GROWTH_WEIGHTS.gain7d)}・直近30日の純増 ${pct(GROWTH_WEIGHTS.gain30d)}・規模補正した成長率 ${pct(GROWTH_WEIGHTS.rate)}を、`,
    recommended: `用途適合度 ${pct(RECOMMEND_WEIGHTS.fit)}・保守・更新状況 ${pct(RECOMMEND_WEIGHTS.maintenance)}・ライセンス適合性 ${pct(RECOMMEND_WEIGHTS.license)}・ドキュメント（日本語の対応）${pct(RECOMMEND_WEIGHTS.docs)}・導入・運用のしやすさ ${pct(RECOMMEND_WEIGHTS.ease)}の合計（100点満点）です。`,
  };

  return (
    <>
      <SiteHeader current="/rankings" />
      <main className="wrap page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: "OSSランキング" }]} />
        <h1 className="h2">OSSランキング</h1>
        <p className="lede">
          {`「よく使われている」「いま伸びている」「選ぶと失敗しにくい」は別のものです。人気・急成長・おすすめの3つに分けて、計算の根拠と観測日をすべて確認できるようにしています。データの取得日は${asOf}です。`}
        </p>

        <ul className="rank-kinds" aria-label="3つのランキングの違い">
          <li>
            <a href="#popular">
              <strong>人気</strong>
              <span>長く多くの人に知られているか</span>
              <small>Stars・Forks・Contributorsの掲載中での順位。注目度の目安で、品質の保証ではありません。</small>
            </a>
          </li>
          <li>
            <a href="#growth">
              <strong>急成長</strong>
              <span>最近、注目が増えているか</span>
              <small>直近7日・30日のStar数の実測だけ。記録が足りないものは順位を付けません。</small>
            </a>
          </li>
          <li>
            <a href="#recommended">
              <strong>おすすめ</strong>
              <span>選ぶと失敗しにくいか</span>
              <small>用途適合・保守・ライセンス・日本語・導入のしやすさ。機能データのある5つのSaaSの代替だけです。</small>
            </a>
          </li>
        </ul>

        <RankingTabs
          popular={popular.rows}
          dataUrl={BROWSER_DATA_PATH}
          recommendedSaas={recommendedSaas}
          counts={{ popularTotal: popular.total, growthTotal: tools.length, growthUnobserved }}
          asOf={asOf}
          weights={weights}
        />

        <div className="notice notice--info mt2">
          <strong>読み方の注意</strong>
          <br />
          {"ランキングは、掲載しているOSSの中での相対的な順位です。品質や安全性を保証するものではありません。重みは初期案で、データが増えたら見直します。一覧の既定の並び順（健全度）は、このランキングとは別の指標のままです。導入を検討する際は、各ツールのページで更新状況・ライセンス・セキュリティ評価もあわせて確認してください。"}
        </div>
        <p className="mt2">
          <Link href="/trending/">急上昇ランキング（増加数・伸び率）</Link>
          {"　"}
          <Link href="/changes/">OSSの変化レポート</Link>
          {"　"}
          <Link href="/diagnosis/">自分の条件でOSSを診断</Link>
          {"　"}
          <Link href="/tools/">ツール一覧</Link>
        </p>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
