"use client";

import Link from "next/link";
import { useEffect } from "react";

declare global {
  interface Window {
    umami?: {
      track: (eventName: string, data?: Record<string, unknown>) => void;
    };
  }
}

function track(eventName: "house_ad_impression" | "house_ad_click", placement: string) {
  try {
    if (typeof window.umami?.track === "function") {
      window.umami.track(eventName, {
        ad_id: "sponsor_recruitment_v1",
        placement,
      });
    }
  } catch {
    // 計測失敗で表示や遷移を妨げない。
  }
}

export function HouseAd({ placement }: { placement: string }) {
  useEffect(() => {
    track("house_ad_impression", placement);
  }, [placement]);

  return (
    <aside
      className="panel"
      aria-label="ossalt.jp からのお知らせ"
      style={{
        marginTop: "2rem",
        borderColor: "var(--indigo)",
        background: "var(--card)",
      }}
    >
      <div className="panel__head">
        <span className="panel__meta">OSSALT HOUSE AD</span>
        <span className="tag">スポンサー募集中</span>
      </div>
      <div
        className="panel__body"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <div style={{ flex: "1 1 24rem" }}>
          <p
            style={{
              margin: "0 0 0.35rem",
              fontWeight: 700,
              fontSize: "var(--step-1)",
            }}
          >
            OSS・クラウド・開発者向けサービスのスポンサーを募集しています
          </p>
          <p className="muted" style={{ margin: 0, fontSize: "0.875rem" }}>
            広告枠は編集評価・ランキングから完全に分離し、スポンサーであることを明示します。
          </p>
        </div>
        <Link
          className="btn"
          href="/sponsor/"
          onClick={() => track("house_ad_click", placement)}
        >
          掲載メニューを見る →
        </Link>
      </div>
    </aside>
  );
}
