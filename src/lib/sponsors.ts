/**
 * 直接スポンサー広告の設定。
 *
 * 現在はスポンサー未契約のため空配列。契約後はここに1件追加すると、
 * 対象 placement のハウス広告がスポンサー広告に切り替わる。
 *
 * placements は完全一致のほか、末尾 "*" の前方一致に対応する。
 * 例: "alternative_*" は alternative_slack / alternative_notion 等に一致。
 *
 * 広告料金や契約の有無を、比較順位・健全度・セキュリティ評価へ反映しないこと。
 */

export interface SponsorAd {
  id: string;
  name: string;
  description: string;
  href: string;
  ctaLabel: string;
  placements: string[];
}

export const SPONSOR_ADS: SponsorAd[] = [];

function matchesPlacement(pattern: string, placement: string): boolean {
  if (pattern.endsWith("*")) {
    return placement.startsWith(pattern.slice(0, -1));
  }
  return pattern === placement;
}

export function getSponsorAd(placement: string): SponsorAd | null {
  return (
    SPONSOR_ADS.find((ad) =>
      ad.placements.some((pattern) => matchesPlacement(pattern, placement))
    ) ?? null
  );
}
