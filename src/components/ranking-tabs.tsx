"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** 画面に渡す1行分（サーバーで計算済み。ここでは計算しない） */
export type RankView = {
  id: string;
  name: string;
  meta: string;
  score: number;
  /** 右側に出す主な値と補足 */
  headline: string;
  sub: string;
  parts: Array<{ label: string; weight: number; value: string; pct?: number; points: number; note?: string; known?: boolean }>;
  /** 最終観測（取得日・期間など） */
  observed: string;
  evidencePct?: number;
};

export type RankingTabsProps = {
  popular: RankView[];
  growth: RankView[];
  recommended: Array<{ saas: string; label: string; rows: RankView[] }>;
  counts: { popularTotal: number; growthTotal: number; growthUnobserved: number };
  asOf: string;
  weights: { popular: string; growth: string; recommended: string };
};

const TABS = [
  { id: "popular", label: "人気", sub: "Stars・Forks・Contributors" },
  { id: "growth", label: "急成長", sub: "直近7日・30日の実測" },
  { id: "recommended", label: "おすすめ", sub: "用途に合うか・使い続けやすいか" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function Rows({ rows, kind }: { rows: RankView[]; kind: TabId }) {
  return (
    <ol className="trend rank-list">
      {rows.map((r, i) => (
        <li key={r.id} className="trend__row rank-row">
          <span className="trend__rank">{i + 1}</span>
          <span className="trend__main">
            <Link href={`/tools/${r.id}/`} className="trend__name">{r.name}</Link>
            <span className="trend__meta">{r.meta}</span>
            <details className="rank-why">
              <summary>計算の根拠を見る</summary>
              <table className="rank-why__table">
                <thead>
                  <tr>
                    <th scope="col">項目</th>
                    <th scope="col">重み</th>
                    {kind !== "recommended" && <th scope="col">値</th>}
                    <th scope="col">{kind === "recommended" ? "点（0〜100）" : "順位"}</th>
                    <th scope="col">加点</th>
                  </tr>
                </thead>
                <tbody>
                  {r.parts.map((p) => (
                    <tr key={p.label} className={p.known === false ? "rank-why__unknown" : undefined}>
                      <th scope="row">{p.label}{p.note ? <small>{p.note}</small> : null}</th>
                      <td>{Math.round(p.weight * 100)}%</td>
                      {kind !== "recommended" && <td>{p.value}</td>}
                      <td>{p.pct != null ? `上位${Math.max(1, Math.round(100 - p.pct))}%` : `${p.points}`}</td>
                      <td>{Math.round((p.pct ?? p.points) * p.weight * 10) / 10}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="muted rank-why__obs">
                {r.observed}
                {r.evidencePct != null && r.evidencePct < 100 ? `／確認できた項目の重みは${r.evidencePct}%（未確認の項目は0点で計算）` : ""}
              </p>
            </details>
          </span>
          <span className="trend__value">
            <strong>{r.headline}</strong>
            <small>{r.sub}</small>
            {kind !== "recommended" && <span className="rank-score" title="合計点（0〜100）">{r.score}点</span>}
            <span className="rank-bar" role="presentation" title={`合計 ${r.score}点（100点満点）`}>
              <span style={{ width: `${Math.max(0, Math.min(100, r.score))}%` }} />
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function RankingTabs({ popular, growth, recommended, counts, asOf, weights }: RankingTabsProps) {
  const [tab, setTab] = useState<TabId>("popular");
  const [saas, setSaas] = useState(recommended[0]?.saas ?? "");

  useEffect(() => {
    const fromHash = () => {
      try {
        const h = window.location.hash.replace("#", "");
        if (TABS.some((t) => t.id === h)) setTab(h as TabId);
      } catch { /* 取れなくても既定のタブで表示する */ }
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  function select(id: TabId) {
    setTab(id);
    try { window.history.replaceState(null, "", `#${id}`); } catch { /* 無視 */ }
  }

  return (
    <div className="rankings">
      <div className="rank-tabs" role="tablist" aria-label="ランキングの種類">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            className="rank-tab"
            onClick={() => select(t.id)}
          >
            <strong>{t.label}</strong>
            <small>{t.sub}</small>
          </button>
        ))}
      </div>

      <section id="panel-popular" role="tabpanel" aria-labelledby="tab-popular" hidden={tab !== "popular"}>
        <h2 className="h3">人気ランキング</h2>
        <p className="muted rank-note">
          {`長く多くの人に使われ、知られているかを見るランキングです。${weights.popular}掲載${counts.popularTotal}件の中での順位（上位何%か）を足し合わせています。Starsは利用者数や品質ではなく、注目度の目安です。データの取得日：${asOf}。`}
        </p>
        <Rows rows={popular} kind="popular" />
      </section>

      <section id="panel-growth" role="tabpanel" aria-labelledby="tab-growth" hidden={tab !== "growth"}>
        <h2 className="h3">急成長ランキング</h2>
        <p className="muted rank-note">
          {`最近どれだけ注目が増えたかを見るランキングです。OSSALTが記録しているStar数の実測だけで、${weights.growth}掲載中の${counts.growthTotal}件のうち、7日・30日とも記録がそろったものを順位づけしています。`}
          {counts.growthUnobserved > 0 && `残りの${counts.growthUnobserved}件は、実測の記録が足りない（新しく掲載したばかりなど）ため「未観測」で、順位は付けていません（0としては扱っていません）。`}
          {"規模補正した成長率は、30日の純増 ÷（30日前のStar数 + 1,000）です。Starがごく少ないリポジトリの小さな増加が、大きな率にならないようにしています。"}
        </p>
        <Rows rows={growth} kind="growth" />
      </section>

      <section id="panel-recommended" role="tabpanel" aria-labelledby="tab-recommended" hidden={tab !== "recommended"}>
        <h2 className="h3">おすすめランキング</h2>
        <p className="muted rank-note">
          {`「どれを選ぶと失敗しにくいか」を見るランキングです。${weights.recommended}`}
          <strong>用途適合度は、置き換え元のSaaSの主要機能に対する対応の確認率なので、機能データのある次の5つのSaaSの代替だけで算出できます。</strong>
          それ以外のSaaSの代替は、用途適合度を算出できないため、おすすめの順位を付けていません（人気・急成長は全ツールで見られます）。
        </p>
        <div className="chips" role="group" aria-label="置き換え元のSaaS">
          {recommended.map((g) => (
            <button key={g.saas} type="button" className="chip" aria-pressed={saas === g.saas} onClick={() => setSaas(g.saas)}>
              {g.label}の代替
            </button>
          ))}
        </div>
        {recommended.map((g) => (
          <div key={g.saas} hidden={saas !== g.saas}>
            <Rows rows={g.rows} kind="recommended" />
          </div>
        ))}
      </section>
    </div>
  );
}
