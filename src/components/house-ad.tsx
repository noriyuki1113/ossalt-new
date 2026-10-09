"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import { useViewable } from "@/lib/use-viewable";

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
  trackEvent(eventName, data);
}

export function HouseAd({ placement }: { placement: string }) {
  const ad = getHouseAd(placement);

  // 読み込んだだけでは数えない。枠が画面内で見られたとき（50%以上・1秒以上）に1回だけ送る
  const ref = useViewable<HTMLElement>(() => track("house_ad_impression", { ad_id: ad.id, placement }));

  return (
    <aside
      ref={ref}
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
