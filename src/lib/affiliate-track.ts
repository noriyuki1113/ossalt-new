/**
 * アフィリエイトリンクのクリック計測。Umamiのカスタムイベントを使う
 * (静的サイトにサーバーが無いため、Supabase Edge Functionは使えない)。
 * window.umami が無い場合(広告ブロッカー、計測オフ設定)でも
 * クリックを妨げないよう、失敗は握りつぶす。
 */

declare global {
  interface Window {
    umami?: {
      track: (eventName: string, data?: Record<string, unknown>) => void;
    };
  }
}

export function trackAffiliateClick(params: {
  provider: string;
  path: string;
  label: string;
}) {
  try {
    if (typeof window.umami?.track === "function") {
      window.umami.track("affiliate_click", params);
    }
  } catch {
    // best-effort: 計測の失敗でリンクを踏めなくなってはいけない
  }
}
