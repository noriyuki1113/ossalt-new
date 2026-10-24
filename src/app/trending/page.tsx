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
    "SaaSの代わりになるオープンソースのうち、直近1週間・30日間でGitHubのスターが多く増えたものを、OSSALTが毎日記録している実測値でまとめています。スター総数の人気ランキングとは分けて表示します。",
  path: "/trending/",
});

const TOP_N = 20;
/** 伸び率のランキングに入れる最低のスター数（小さいリポジトリの伸び率は大きく振れるため） */
const RATE_MIN_STARS = 1000;

type Gain = { gain: number; days: number; from: string };
type Row = { tool: Tool; gain: number; days: number; from: string; rate: number };
type Period = "7d" | "30d";

const PERIOD_GAIN: Record<Period, (t: Tool) => Gain | null | undefined> = {
  "7d": (t) => t.star_gain_7d,
  "30d": (t) => t.star_gain,
};

/** 期間ごとの実測の増加。記録が足りないツールは入れない（0として扱わない） */
function rows(tools: Tool[], period: Period): Row[] {
  return tools
    .filter((t) => t.stars_num != null && (PERIOD_GAIN[period](t)?.gain ?? 0) > 0)
    .map((t) => {
      const g = PERIOD_GAIN[period](t)!;
      const base = (t.stars_num ?? 0) - g.gain;
      return { tool: t, gain: g.gain, days: g.days, from: g.from, rate: base > 0 ? g.gain / base : 0 };
    });
}

function topBy(all: Row[], metric: "gain" | "rate"): Row[] {
  if (metric === "gain") return [...all].sort((a, b) => b.gain - a.gain).slice(0, TOP_N);
  return [...all]
    .filter((r) => (r.tool.stars_num ?? 0) >= RATE_MIN_STARS)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, TOP_N);
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
            <span className="trend__value" title={`${r.from}から${r.days}日間の実測`}>
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

/** 人気（スター総数）のランキング。成長のランキングとは別物として表示する */
function Popular({ tools }: { tools: Tool[] }) {
  const top = [...tools]
    .filter((t) => t.stars_num != null)
    .sort((a, b) => (b.stars_num ?? 0) - (a.stars_num ?? 0))
    .slice(0, TOP_N);
  return (
    <ol className="trend">
      {top.map((t, i) => (
        <li key={t.id} className="trend__row">
          <span className="trend__rank">{i + 1}</span>
          <span className="trend__main">
            <Link href={`/tools/${t.id}/`} className="trend__name">
              {t.name}
            </Link>
            <span className="trend__meta">{`${t.primary_competitor_ja || t.primary_competitor}の代替`}</span>
          </span>
          <span className="trend__value">
            <strong>{formatCompactJa(t.stars_num)}</strong>
            <small>スター総数</small>
          </span>
        </li>
      ))}
    </ol>
  );
}

function GrowthSection({ id, title, lead, all, total }: { id: string; title: string; lead: string; all: Row[]; total: number }) {
  return (
    <section id={id} className="mt2" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="h3">{title}</h2>
      <p className="muted" style={{ fontSize: "0.8125rem" }}>
        {lead}
        {`この期間の実測の記録があり、スターが増えたのは${all.length}件です（掲載中${total}件のうち）。記録が足りないツールは、0ではなく対象外として扱っています。`}
      </p>
      {all.length === 0 ? (
        <div className="empty">この期間を比べられる記録が、まだ集まっていません。</div>
      ) : (
        <div className="grid-2">
          <div>
            <h3 className="mt0" style={{ fontSize: "1rem" }}>スターが増えた数</h3>
            <p className="muted" style={{ fontSize: "0.75rem" }}>
              注目を集めている勢いが分かります。もともと人気のあるツールが上位に来やすいランキングです。
            </p>
            <Ranking items={topBy(all, "gain")} metric="gain" />
          </div>
          <div>
            <h3 className="mt0" style={{ fontSize: "1rem" }}>スターの伸び率</h3>
            <p className="muted" style={{ fontSize: "0.75rem" }}>
              {`規模に対して急に伸びているツールが分かります（スター${RATE_MIN_STARS.toLocaleString("ja-JP")}以上のツールのみ）。`}
            </p>
            <Ranking items={topBy(all, "rate")} metric="rate" />
          </div>
        </div>
      )}
    </section>
  );
}

export default function TrendingPage() {
  const meta = getMeta();
  const tools = getActiveTools();
  const week = rows(tools, "7d");
  const month = rows(tools, "30d");
  const maxDays = Math.max(0, ...month.map((r) => r.days));

  return (
    <>
      <SiteHeader current="/tools" />
      <main className="wrap page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: "急上昇中のオープンソース" }]} />
        <h1 className="h2">急上昇中のオープンソース</h1>
        <p className="lede">
          {`SaaSの代わりになるオープンソースのうち、GitHubのスターが最近多く増えたものです。OSSALTが毎日GitHubから取得して記録している実測値だけで集計し、推計の値は使っていません。スター数は${formatDate(meta.stars_as_of ?? meta.built_at)}までにGitHubから取得した最新の値です。`}
        </p>
        <nav className="chips mt1" aria-label="ランキングの種類">
          <a className="chip" href="#week">成長：直近1週間</a>
          <a className="chip" href="#month">成長：直近30日間</a>
          <a className="chip" href="#popular">人気：スター総数</a>
        </nav>

        <GrowthSection
          id="week"
          title="成長ランキング：直近1週間"
          lead="7日以上前の実測の記録と比べた増加です。取得は数日おきのため、期間は実際の記録の間隔（7〜10日間）で、各行に日数を示しています。"
          all={week}
          total={tools.length}
        />

        <GrowthSection
          id="month"
          title="成長ランキング：直近30日間"
          lead={`30日前（記録がそれより短いツールは最初の記録）と比べた増加です。いまの記録は最長${maxDays}日間です。`}
          all={month}
          total={tools.length}
        />

        <section id="popular" className="mt2" aria-labelledby="popular-h">
          <h2 id="popular-h" className="h3">人気ランキング：スター総数</h2>
          <p className="muted" style={{ fontSize: "0.8125rem" }}>
            これまでに集めたスターの合計です。最近の伸びではなく、長い期間の知名度を表します。上の成長ランキングとは別の指標です。
          </p>
          <Popular tools={tools} />
        </section>

        <div className="notice notice--info mt2">
          <strong>集計の方法と注意点</strong>
          <br />
          {"スター数はGitHubの公開データを毎日取得していますが、取得の回数の制限のため、ツールによっては数日おきの更新になります。そのため、ツールごとに集計の期間（「◯日間」）が少し異なります。期間を1日あたりに換算するなどの推計はしていません。スターは注目度の目安で、品質や安全性を表すものではありません。導入を検討する際は、ツールのページで更新状況やライセンス、セキュリティ評価もあわせて確認してください。"}
        </div>

        <p className="mt2">
          <Link href="/tools/">ツール一覧へ</Link>
          {"　"}
          <Link href="/changes/">OSSの変化レポート</Link>
          {"　"}
          <Link href="/blog/how-to-read-github/">GitHubのスターの見方</Link>
        </p>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
