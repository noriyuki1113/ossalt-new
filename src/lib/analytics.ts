/**
 * 汎用のイベント計測。Umamiのカスタムイベントを使う（src/lib/affiliate-track.ts と同じ方式）。
 * 静的サイトにサーバーが無いため、window.umami が無い場合（広告ブロッカー、
 * 計測オフ設定、JSエラー等）でも操作を妨げないよう、失敗は握りつぶす。
 * 個人を特定する情報（メールアドレス等）は送らない。
 */

declare global {
  interface Window {
    umami?: {
      track: (eventName: string, data?: Record<string, unknown>) => void;
    };
  }
}

export function trackEvent(eventName: string, data?: Record<string, unknown>) {
  try {
    if (typeof window !== "undefined" && typeof window.umami?.track === "function") {
      window.umami.track(eventName, data);
    }
  } catch {
    // best-effort: 計測の失敗で操作を妨げてはいけない
  }
}
