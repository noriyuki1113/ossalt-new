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

type HouseAdConfig = {
  id: string;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
};

function getHouseAd(placement: string): HouseAdConfig {
  if (placement.startsWith("alternative_")) {
    return {
      id: "oss_diagnosis",
      title: "どのOSSが自分に合うか迷っていますか？",
      description: "6つの質問に答えるだけで、条件に合うOSSを探せます。登録不要・約2分。",
      href: "/diagnosis/",
      ctaLabel: "OSS診断をはじめる",
    };
  }

  if (placement.startsWith("blog_")) {
    return {
      id: "browse_tools",
      title: "実際に使えるOSSを一覧で比較",
      description: "ライセンス・セキュリティ・更新状況まで横並びで確認できます。",
      href: "/tools/",
      ctaLabel: "ツール一覧を見る",
    };
  }

  return {
    id: "browse_alternatives",
    title: "SaaSの月額、見直しませんか？",
    description: "Notion・Slack・Airtableなど、よく使うSaaSのオープンソース代替を比較できます。",
    href: "/alternatives/",
    ctaLabel: "OSS代替を探す",
  };
}

function track(eventName: "house_ad_impression" | "house_ad_click", data: Record<string, unknown>) {
  try {
    if (typeof window.umami?.track === "function") {
      window.umami.track(eventName, data);
    }
  } catch {
    // 計測失敗で表示や遷移を妨げない。
  }
}

export function HouseAd({ placement }: { placement: string }) {
  const ad = getHouseAd(placement);

  useEffect(() => {
    track("house_ad_impression", {
      ad_id: ad.id,
      placement,
    });
  }, [ad.id, placement]);

  return (
    <aside
      className="panel"
      aria-label="ossalt.jp からのおすすめ"
      style={{
        marginTop: "2rem",
        borderColor: "var(--indigo)",
        background: "var(--card)",
      }}
    >
      <div className="panel__head">
        <span className="panel__meta">OSSALT PICK</span>
        <span className="tag">サイト内おすすめ</span>
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
            {ad.title}
          </p>
          <p className="muted" style={{ margin: 0, fontSize: "0.875rem" }}>
            {ad.description}
          </p>
        </div>
        <Link
          className="btn"
          href={ad.href}
          onClick={() =>
            track("house_ad_click", {
              ad_id: ad.id,
              placement,
            })
          }
        >
          {ad.ctaLabel} →
        </Link>
      </div>
    </aside>
  );
}
