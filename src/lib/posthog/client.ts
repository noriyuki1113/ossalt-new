/**
 * PostHog SDK の読み込みと送信（ブラウザ専用）。
 *
 * - 同意（granted）になるまで、SDKを読み込まない（通信ゼロ・JSの追加ゼロ）。
 * - 読み込みは動的import。本体のJSには含めない。
 * - 自動取得・セッションリプレイ・ヒートマップ・アンケート・フィーチャーフラグは、すべて無効。
 * - 失敗は握りつぶす（計測のエラーで操作を妨げない）。
 */
import type { PostHog } from "posthog-js";
import { POSTHOG, isAllowedHostname } from "./config";
import { sanitizeProperties } from "./privacy";
import { buildEvent, type EventName, type EventProps } from "./events";
import { clearStoredIdentifiers } from "./consent";

let instance: PostHog | null = null;
let loading: Promise<PostHog | null> | null = null;
let active = false; // 同意中で、送ってよい状態
const activeListeners = new Set<() => void>();

/** 同意中ならすぐに、まだなら同意された時点で、1回だけ cb を呼ぶ。戻り値で取り消せる（コンポーネントのクリーンアップ用） */
export function whenActive(cb: () => void): () => void {
  if (active) {
    cb();
    return () => {};
  }
  const once = () => {
    activeListeners.delete(once);
    cb();
  };
  activeListeners.add(once);
  return () => {
    activeListeners.delete(once);
  };
}

export function analyticsAvailable(): boolean {
  if (!POSTHOG.enabled || typeof window === "undefined") return false;
  try {
    if (!isAllowedHostname(window.location.hostname)) return false;
    // 自動操作のブラウザ（クローラー・テスト）からは、E2Eの確認用を除いて送らない設計にはしない。
    // Do Not Track はSDK側（respect_dnt）でも尊重する。
    return true;
  } catch {
    return false;
  }
}

async function load(): Promise<PostHog | null> {
  if (instance) return instance;
  if (!analyticsAvailable()) return null;
  if (!loading) {
    loading = import("posthog-js")
      .then(({ default: posthog }) => {
        posthog.init(POSTHOG.token, {
          api_host: POSTHOG.host,
          // 自動取得は一切しない。送るのは、このサイトが明示的に送るイベントだけ
          autocapture: false,
          capture_pageview: false,
          capture_pageleave: false,
          capture_dead_clicks: false,
          capture_heatmaps: false,
          capture_exceptions: false,
          rageclick: false,
          disable_session_recording: true,
          disable_surveys: true,
          disable_web_experiments: true,
          advanced_disable_flags: true,
          disable_external_dependency_loading: true,
          // Cookieは使わず、端末のlocalStorageだけ。個人のプロフィールは作らない
          persistence: "localStorage",
          person_profiles: "never",
          save_referrer: true,
          respect_dnt: true,
          // ボット・自動操作のブラウザは、SDKが既定で送らない。E2E用のビルドだけ、確認のために許可する
          opt_out_useragent_filter: POSTHOG.allowAutomation,
          // 低トラフィックのため、まとめ送り（既定3秒）はやめ、イベントごとに送る（ページを離れるときの取りこぼしも減る）
          request_batching: false,
          ip: false,
          opt_out_capturing_by_default: true,
          before_send: (event) => {
            if (!event) return null;
            event.properties = sanitizeProperties(event.properties) as typeof event.properties;
            return event;
          },
        });
        instance = posthog;
        return posthog;
      })
      .catch(() => null);
  }
  return loading;
}

/** 同意したとき：SDKを読み込み、送信を許可する */
export async function startAnalytics(): Promise<void> {
  const ph = await load();
  if (!ph) return;
  ph.opt_in_capturing({ captureEventName: false });
  active = true;
  [...activeListeners].forEach((cb) => {
    try {
      cb();
    } catch {
      /* 無視 */
    }
  });
}

/** 同意を撤回／拒否したとき：以後の送信を止め、端末に残した識別子を消す */
export function stopAnalytics(): void {
  active = false;
  try {
    if (instance) {
      instance.opt_out_capturing();
      instance.reset();
    }
    clearStoredIdentifiers(safeLocalStorage());
  } catch {
    /* 無視 */
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** 検証済みのイベントだけを送る。同意中でなければ何もしない */
export function captureEvent<N extends EventName>(name: N, props: EventProps[N]): void {
  try {
    if (!active || !instance) return;
    const ev = buildEvent(name, props);
    if (ev) instance.capture(ev.name, ev.props);
  } catch {
    /* 計測の失敗で操作を妨げない */
  }
}

/** ページ表示（URLはオリジン＋パスだけ。クエリは before_send でも落とす） */
export function capturePageview(): void {
  try {
    if (!active || !instance) return;
    instance.capture("$pageview", { $current_url: `${window.location.origin}${window.location.pathname}` });
  } catch {
    /* 無視 */
  }
}

export function isActive(): boolean {
  return active;
}
