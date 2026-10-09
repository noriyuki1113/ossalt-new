import { getSponsors } from "@/lib/data";
import { sponsorFor, todayJst, type SponsorPlacement } from "@/lib/sponsors";
import { SponsorCard } from "@/components/sponsor-card";

/**
 * スポンサー枠（サーバー側で選ぶ）。掲載中の契約がなければ何も出さない（空き枠も「募集中」も出さない）。
 * 置き場所は本文と比較・一覧の後。ランキング・比較表・ツール一覧の中には置かない。
 */
export function SponsorSlot({ placement, slug }: { placement: SponsorPlacement; slug: string }) {
  const sponsor = sponsorFor(getSponsors(), placement, slug, todayJst());
  if (!sponsor) return null;
  return <SponsorCard sponsor={sponsor} placement={placement} slug={slug} />;
}
