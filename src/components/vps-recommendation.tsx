"use client";

import { AFFILIATE_REL, AFFILIATE_VPS, getAffiliateHref, getTrackingImageUrl } from "@/lib/affiliates";
import { trackAffiliateClick, trackAffiliateViewable } from "@/lib/affiliate-track";
import { useState } from "react";
import { useViewable } from "@/lib/use-viewable";
import { AdLabel, AffiliateDisclosure } from "@/components/affiliate-disclosure";

export function VpsRecommendation({
  path,
  placement = "unknown",
  variant,
  title = "このツールを自前で動かすには",
  lede = "OSSセルフホストでよく選ばれる4つのVPSをまとめました。",
}: {
  path: string;
  /** 計測用の枠の名前（affiliate_click / affiliate_viewable の placement） */
  placement?: string;
  /** 前置きの文言の種類（R4 の検証用。affiliate-context.ts の VpsVariant） */
  variant?: string;
  title?: string;
  lede?: string;
}) {
  // 描画されただけでは数えない。枠が画面内で見られたときに1回だけ送る
  const [showAll, setShowAll] = useState(false);
  const ref = useViewable<HTMLElement>(() => trackAffiliateViewable({ path, placement, ...(variant ? { variant } : {}) }));

  return (
    <section ref={ref} className="mt2 vps-reco" aria-label="広告（アフィリエイト）：国内VPSの紹介">
      <h2 className="h3">
        {title} <AdLabel />
      </h2>
      <p className="muted" style={{ fontSize: "0.875rem" }}>
        {lede}
      </p>
      <AffiliateDisclosure />
      <p className="muted" style={{ fontSize: "0.8125rem" }}>
        多くのツールは、VPSを借りる前に、手元のパソコン（Dockerなど）で試せます。
      </p>
      <div
        className={`vps-reco__grid${showAll ? " is-open" : ""}`}
        style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
      >
        {AFFILIATE_VPS.map((v, i) => {
          const href = getAffiliateHref(v);
          const trackingImg = getTrackingImageUrl(v.id);
          return (
            <div key={v.id} className={`panel${i >= 2 ? " vps-reco__more" : ""}`}>
              <div className="panel__head">
                <h3 className="panel__title">{v.name}</h3>
                <span className="panel__meta">{v.recommendedFor}</span>
              </div>
              <div className="panel__body">
                <p className="muted" style={{ fontSize: "0.875rem" }}>{v.description}</p>
                <a
                  className="btn"
                  href={href}
                  target="_blank"
                  rel={AFFILIATE_REL}
                  onClick={() =>
                    trackAffiliateClick({ provider: v.id, path, label: v.ctaLabel, placement, ...(variant ? { variant } : {}) })
                  }
                >
                  {v.ctaLabel}
                  <span className="sr-only">（外部サイト・広告）</span> ↗
                </a>
                {trackingImg && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={trackingImg}
                    width={1}
                    height={1}
                    alt=""
                    style={{ position: "absolute", width: 1, height: 1 }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* スマホでは最初の2社だけを見せ、残りはこのボタンで開く（並び順＝最低月額の安い順は変えない） */}
      {!showAll && AFFILIATE_VPS.length > 2 && (
        <button type="button" className="btn btn--sm vps-reco__toggle" onClick={() => setShowAll(true)}>
          ほか{AFFILIATE_VPS.length - 2}社も見る
        </button>
      )}
    </section>
  );
}
