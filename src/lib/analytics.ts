/**
 * 汎用のイベント計測。Umamiのカスタムイベントを使う（Cookieなし）。
 * 静的サイトにサーバーが無いため、window.umami が無い場合（広告ブロッカー、
 * 計測オフ設定、JSエラー等）でも操作を妨げないよう、失敗は握りつぶす。
 * 個人を特定する情報（メールアドレス、入力した金額など）は送らない。
 *
 * イベント名の一覧と意味は docs/revenue/REVENUE_AUDIT.md（計測の設計）を参照。
 * 新しいイベントを足すときは EVENTS に加え、名前は「対象_動作」の小文字で統一する。
 */

declare global {
  interface Window {
    umami?: {
      track: (eventName: string, data?: Record<string, unknown>) => void;
    };
  }
}

export const EVENTS = [
  // 収益の導線（アフィリエイト）
  "affiliate_viewable", // VPSの紹介枠が画面内で見られた（50%以上・1秒以上、1表示1回）
  "affiliate_click", // 紹介リンクを押した（成約・承認ではない）
  // スポンサー枠
  "sponsor_viewable",
  "sponsor_click",
  // 広告の問い合わせ
  "advertise_inquiry", // /advertise/ の問い合わせ先を押した（送信の完了ではない）
  // Cost Lab
  "cost_lab_entry",
  "cost_lab_start", // 最初に入力した
  "cost_lab_result", // 最初に結果が出た（＝完了）
  "cost_lab_example",
  "cost_lab_link_click",
  // サイト内の誘導（収益ではない）
  "house_ad_impression",
  "house_ad_click",
] as const;
export type EventName = (typeof EVENTS)[number];

/** 自動操作のブラウザ（クローラー・テスト）からは送らない。Umami側のボット除外に加えた、簡単な抑制 */
function isAutomated(): boolean {
  try {
    return typeof navigator !== "undefined" && navigator.webdriver === true;
  } catch {
    return false;
  }
}

export function trackEvent(eventName: string, data?: Record<string, unknown>) {
  try {
    if (typeof window === "undefined" || isAutomated()) return;
    if (typeof window.umami?.track === "function") {
      window.umami.track(eventName, data);
    }
  } catch {
    // best-effort: 計測の失敗で操作を妨げてはいけない
  }
}
