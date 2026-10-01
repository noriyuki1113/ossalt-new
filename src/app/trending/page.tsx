import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getActiveTools, getMeta } from "@/lib/data";
import { getCategory } from "@/lib/categories";
import { formatCompactJa, formatDate, type Tool } from "@/lib/tools";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "急上昇中のオープンソース｜GitHubのスターが伸びているOSS【毎日更新】",
  description:
    "SaaSの代わりになるオープンソースのうち、直近でGitHubのスターが多く増えたものを毎日更新でまとめています。増えた数と伸び率の2つのランキングで、いま注目されているOSSが分かります。",
  path: "/trending/",
});

const TOP_N = 20;
/** 伸び率のランキングに入れる最低のスター数（小さいリポジトリの伸び率は大きく振れるため） */
const RATE_MIN_STARS = 1000;

type Row = { tool: Tool; gain: number; days: number; rate: number };

function rows(): Row[] {
  return getActiveTools()
    .filter((t) => t.star_gain && t.star_gain.gain > 0 && t.stars_num != null)
    .map((t) => {
      const g = t.star_gain!;
      const base = (t.stars_num ?? 0) - g.gain;
      return { tool: t, gain: g.gain, days: g.days, rate: base > 0 ? g.gain / base : 0 };
    });
}

function Ranking({ items, metric }: { items: Row[]; metric: "gain" | "rate" }) {
  const max = Math.max(...items.map((r) => (metric === "gain" ? r.gain : r.rate)));
  return (
    <ol className="trend">
      {items.map((r, i) => {
        const v = metric === "gain" ? r.gain : r.rate;
        const category = getCategory(r.tool.category);
        return (
          <li key={r.tool.id} className="trend__row">
            <span className="trend__rank">{i + 1}</span>
            <span className="trend__main">
              <Link href={`/tools/${r.tool.id}/`} className="trend__name">
                {r.tool.name}
              </Link>
              <span className="trend__meta">
                {`${r.tool.primary_competitor_ja || r.tool.primary_competitor}の代替`}
                {category ? `・${category.nameJa}` : ""}
              </span>
              <span className="numbar trend__bar" aria-hidden="true">
                <span style={{ width: `${Math.max(2, (v / max) * 100)}%` }} />
              </span>
            </span>
            <span className="trend__value">
              <strong>
                {metric === "gain" ? `+${r.gain.toLocaleString("ja-JP")}` : `+${(r.rate * 100).toFixed(1)}%`}
              </strong>
              <small>
                {metric === "gain"
                  ? `${r.days}日間・計${formatCompactJa(r.tool.stars_num)}`
                  : `+${r.gain.toLocaleString("ja-JP")}／${r.days}日間`}
              </small>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function TrendingPage() {
  const meta = getMeta();
  const all = rows();
  const byGain = [...all].sort((a, b) => b.gain - a.gain).slice(0, TOP_N);
  const byRate = [...all]
    .filter((r) => (r.tool.stars_num ?? 0) >= RATE_MIN_STARS)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, TOP_N);
  const maxDays = Math.max(0, ...all.map((r) => r.days));

  return (
    <>
      <SiteHeader current="/tools" />
      <main className="wrap page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: "急上昇中のオープンソース" }]} />
        <h1 className="h2">急上昇中のオープンソース</h1>
        <p className="lede">
          {`SaaSの代わりになるオープンソースのうち、GitHubのスターが最近多く増えたものです。直近${maxDays}日間の記録をもとに、${formatDate(meta.built_at)}に更新しました。`}
        </p>

        {all.length === 0 ? (
          <div className="empty">集計できる記録がまだありません。</div>
        ) : (
          <div className="grid-2 mt2">
            <section>
              <h2 className="h3 mt0">スターが増えた数</h2>
              <p className="muted" style={{ fontSize: "0.8125rem" }}>
                注目を集めている勢いが分かります。もともと人気のあるツールが上位に来やすいランキングです。
              </p>
              <Ranking items={byGain} metric="gain" />
            </section>
            <section>
              <h2 className="h3 mt0">スターの伸び率</h2>
              <p className="muted" style={{ fontSize: "0.8125rem" }}>
                {`規模に対して急に伸びているツールが分かります（スター${RATE_MIN_STARS.toLocaleString("ja-JP")}以上のツールのみ）。`}
              </p>
              <Ranking items={byRate} metric="rate" />
            </section>
          </div>
        )}

        <div className="notice notice--info mt2">
          <strong>集計の方法と注意点</strong>
          <br />
          {"スター数はGitHubの公開データを毎日取得していますが、取得の回数の制限のため、ツールによっては数日おきの更新になります。そのため、ツールごとに集計の期間（「◯日間」）が少し異なります。スターは注目度の目安で、品質や安全性を表すものではありません。導入を検討する際は、ツールのページで更新状況やライセンス、セキュリティ評価もあわせて確認してください。"}
        </div>

        <p className="mt2">
          <Link href="/tools/">ツール一覧へ</Link>
          {"　"}
          <Link href="/blog/how-to-read-github/">GitHubのスターの見方</Link>
        </p>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
