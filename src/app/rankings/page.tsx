import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { RankingTabs, type RankView } from "@/components/ranking-tabs";
import { getActiveTools, getMeta } from "@/lib/data";
import { TOOL_DIAGNOSIS } from "@/lib/diagnosis-data";
import { SAAS_IDS, SAAS_LABELS } from "@/lib/diagnosis-types";
import {
  GROWTH_WEIGHTS, POPULARITY_WEIGHTS, RECOMMEND_WEIGHTS,
  buildGrowth, buildPopularity, buildRecommended,
} from "@/lib/rankings";
import { pageMeta } from "@/lib/seo";
import { formatDate } from "@/lib/tools";

export const metadata: Metadata = pageMeta({
  title: "OSSランキング｜人気・急成長・おすすめを分けて比べる",
  description:
    "SaaSの代わりになるオープンソースを、人気（Stars・Forks・Contributors）、急成長（直近7日・30日のStar純増）、おすすめ（用途・保守・ライセンス・日本語・導入のしやすさ）の3つに分けて表示。計算の根拠と観測日を確認できます。",
  path: "/rankings/",
});

const TOP_N = 30;
const pct = (w: number) => `${Math.round(w * 100)}%`;
const competitorOf = (t: { primary_competitor_ja?: string | null; primary_competitor: string }) =>
  `${t.primary_competitor_ja || t.primary_competitor}の代替`;

export default function RankingsPage() {
  const meta = getMeta();
  const tools = getActiveTools();
  const asOf = formatDate(meta.stars_as_of ?? meta.built_at);

  const pop = buildPopularity(tools);
  const popular: RankView[] = pop.rows.slice(0, TOP_N).map((r) => ({
    id: r.tool.id,
    name: r.tool.name,
    meta: competitorOf(r.tool),
    score: r.score,
    headline: `★${(r.tool.stars_num ?? 0).toLocaleString("ja-JP")}`,
    sub: `Fork ${(r.tool.forks_num ?? 0).toLocaleString("ja-JP")}`,
    parts: r.parts.map((p) => ({ label: p.label, weight: p.weight, value: p.value, pct: p.pct, points: p.points })),
    observed: `Stars・Forks・Contributorsの取得日：${asOf}`,
  }));

  const gr = buildGrowth(tools);
  const growth: RankView[] = gr.rows.slice(0, TOP_N).map((r) => ({
    id: r.tool.id,
    name: r.tool.name,
    meta: competitorOf(r.tool),
    score: r.score,
    headline: r.parts[0].value,
    sub: `7日間（実測${r.window7.days}日）`,
    parts: r.parts.map((p) => ({ label: p.label, weight: p.weight, value: p.value, pct: p.pct, points: p.points, note: p.note })),
    observed: `7日：${r.window7.from}→${r.window7.to}／30日：${r.window30.from}→${r.window30.to}（OSSALTが記録したStar数の実測）`,
  }));

  const rec = buildRecommended(tools, Object.values(TOOL_DIAGNOSIS));
  const recommended = SAAS_IDS.filter((s) => rec.bySaas[s]?.length).map((s) => ({
    saas: s,
    label: SAAS_LABELS[s],
    rows: rec.bySaas[s]!.map((r): RankView => ({
      id: r.tool.id,
      name: r.tool.name,
      meta: competitorOf(r.tool),
      score: r.score,
      headline: `${r.score}点`,
      sub: "100点満点",
      evidencePct: r.evidencePct,
      parts: r.parts.map((p) => ({ label: p.label, weight: p.weight, value: "", points: p.points, note: p.note, known: p.known })),
      observed: `最終コミット：${formatDate(r.tool.last_commit)}／データの取得日：${asOf}`,
    })),
  }));

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

        <RankingTabs
          popular={popular}
          growth={growth}
          recommended={recommended}
          counts={{ popularTotal: pop.rows.length, growthTotal: tools.length, growthUnobserved: gr.unobserved.length }}
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
