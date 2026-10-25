"use client";

import Link from "next/link";
import { useState } from "react";

export type HomeRow = { id: string; name: string; meta: string; headline: string; sub: string };
export type HomeRankingsProps = {
  popular: HomeRow[];
  growth: HomeRow[];
  recommended: Array<{ saas: string; label: string; rows: HomeRow[] }>;
  asOf: string;
};

const TABS = [
  { id: "popular", label: "人気", note: "長く多くの人に使われている（Stars・Forks・Contributors）" },
  { id: "growth", label: "急成長", note: "いま注目が増えている（直近7日・30日の実測）" },
  { id: "recommended", label: "おすすめ", note: "選ぶと失敗しにくい（用途・保守・ライセンス・日本語・導入）" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function List({ rows }: { rows: HomeRow[] }) {
  return (
    <ol className="trend">
      {rows.map((r, i) => (
        <li key={r.id} className="trend__row">
          <span className="trend__rank">{i + 1}</span>
          <span className="trend__main">
            <Link href={`/tools/${r.id}/`} className="trend__name">{r.name}</Link>
            <span className="trend__meta">{r.meta}</span>
          </span>
          <span className="trend__value">
            <strong>{r.headline}</strong>
            <small>{r.sub}</small>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** トップ用の小さなランキング。計算の根拠は /rankings/ で確認できる */
export function HomeRankings({ popular, growth, recommended, asOf }: HomeRankingsProps) {
  const [tab, setTab] = useState<TabId>("popular");
  const [saas, setSaas] = useState(recommended[0]?.saas ?? "");
  const current = TABS.find((t) => t.id === tab)!;

  return (
    <div className="home-rank">
      <div className="rank-tabs" role="tablist" aria-label="ランキングの種類">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`home-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`home-panel-${t.id}`}
            className="rank-tab"
            onClick={() => setTab(t.id)}
          >
            <strong>{t.label}</strong>
          </button>
        ))}
      </div>
      <p className="muted rank-note">{current.note}。データの取得日：{asOf}。</p>

      <div id="home-panel-popular" role="tabpanel" aria-labelledby="home-tab-popular" hidden={tab !== "popular"}>
        <List rows={popular} />
      </div>
      <div id="home-panel-growth" role="tabpanel" aria-labelledby="home-tab-growth" hidden={tab !== "growth"}>
        <List rows={growth} />
      </div>
      <div id="home-panel-recommended" role="tabpanel" aria-labelledby="home-tab-recommended" hidden={tab !== "recommended"}>
        <div className="chips" role="group" aria-label="置き換え元のSaaS">
          {recommended.map((g) => (
            <button key={g.saas} type="button" className="chip" aria-pressed={saas === g.saas} onClick={() => setSaas(g.saas)}>
              {g.label}の代替
            </button>
          ))}
        </div>
        {recommended.map((g) => (
          <div key={g.saas} hidden={saas !== g.saas}><List rows={g.rows} /></div>
        ))}
        <p className="muted rank-note">おすすめは、機能データのある上の5つのSaaSの代替だけで算出できます。それ以外は順位を付けていません。</p>
      </div>

      <Link className="more home-rank__more" href={`/rankings/#${tab}`}>
        計算の根拠つきで、{current.label}ランキングをすべて見る →
      </Link>
    </div>
  );
}
