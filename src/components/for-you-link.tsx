import Link from "next/link";
import { FEATURES } from "@/lib/site";

/**
 * 各ページから OSSALT For You への導線。機能フラグ（NEXT_PUBLIC_FEATURE_FOR_YOU=1）が有効なときだけ出す。
 * query には、条件の初期値（saas・cat など）を渡す。
 */
export function ForYouLink({ query, children }: { query: Record<string, string>; children: React.ReactNode }) {
  if (!FEATURES.forYou) return null;
  const qs = new URLSearchParams(query).toString();
  return (
    <p className="fy-entry">
      <Link href={`/for-you/${qs ? `?${qs}` : ""}`}>{children}</Link>
    </p>
  );
}
