"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { todayJst, type Sponsor } from "@/lib/sponsors";
import { useViewable } from "@/lib/use-viewable";
import { AdLabel } from "@/components/affiliate-disclosure";

/** スポンサーの遷移リンクの rel（有料のリンクなので sponsored。Googleの有料リンクの指針） */
export const SPONSOR_REL = "sponsored noopener noreferrer";

/**
 * スポンサー枠の表示。中身はビルドの時点で選ばれている（毎日再ビルド）。
 * ビルドが止まっていても期間を過ぎた掲載を出し続けないよう、ブラウザでも終了日を確かめる。
 */
export function SponsorCard({ sponsor, placement, slug }: { sponsor: Sponsor; placement: string; slug: string }) {
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (todayJst() > sponsor.end_date) setExpired(true);
  }, [sponsor.end_date]);

  const data = { campaign: sponsor.id, placement, slug };
  const ref = useViewable<HTMLElement>(() => trackEvent("sponsor_viewable", data), !expired);
  if (expired) return null;

  return (
    <aside ref={ref} className="sponsor-slot" aria-label={`スポンサー（広告）：${sponsor.advertiser}`}>
      <div className="sponsor-slot__head">
        <AdLabel kind="sponsor" />
        <span>{sponsor.advertiser}</span>
      </div>
      <p className="sponsor-slot__title">{sponsor.title}</p>
      <p className="muted" style={{ margin: "0 0 0.75rem", fontSize: "0.875rem" }}>
        {sponsor.description}
      </p>
      <a
        className="btn"
        href={sponsor.destination_url}
        target="_blank"
        rel={SPONSOR_REL}
        onClick={() => trackEvent("sponsor_click", data)}
      >
        {sponsor.advertiser}のサイトを見る<span className="sr-only">（外部サイト・広告）</span> ↗
      </a>
      <p className="muted sponsor-slot__note">
        この枠は広告です。ツールの掲載・並び順・評価は、スポンサーかどうかで変わりません（
        <Link href="/advertise/">広告の掲載について</Link>）。
      </p>
    </aside>
  );
}
