/**
 * アフィリエイトの紹介枠の計測。Umamiのカスタムイベントを使う
 * （静的サイトにサーバーが無いため、Supabase Edge Functionは使えない）。
 * 失敗してもクリックを妨げない（trackEvent が握りつぶす）。
 *
 * affiliate_click はクリックの数であり、成約や承認の数ではない。
 * 承認済みの報酬は A8.net の管理画面でしか分からない（docs/revenue/REVENUE_AUDIT.md）。
 */

import { trackEvent } from "./analytics";

export function trackAffiliateClick(params: {
  provider: string;
  path: string;
  label: string;
  /** どの枠から押されたか（tool_detail / blog / cost_lab など）。収益の導線ごとの比較に使う */
  placement?: string;
  /** 前置きの文言の種類（R4 の検証用） */
  variant?: string;
}) {
  trackEvent("affiliate_click", params);
}

/** 紹介枠が画面内で見られた（1表示につき1回）。どの会社が見られたかではなく、枠として数える */
export function trackAffiliateViewable(params: { path: string; placement: string; variant?: string }) {
  trackEvent("affiliate_viewable", params);
}
