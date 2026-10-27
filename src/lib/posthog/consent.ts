/**
 * 計測の同意の状態（端末のlocalStorageに保存。Cookieは使わない）。
 * 未選択は「同意していない」として扱い、同意するまでSDKの読み込みも送信もしない。
 * storage を引数にして、テストでは差し替えられるようにする。
 */
export type ConsentState = "granted" | "denied" | "unset";

export const CONSENT_KEY = "ossalt_analytics_consent_v1";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null; // プライベートモード等で触れない場合は、未選択と同じに扱う
  }
}

export function readConsent(storage: StorageLike | null = defaultStorage()): ConsentState {
  try {
    const v = storage?.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : "unset";
  } catch {
    return "unset";
  }
}

export function writeConsent(state: Exclude<ConsentState, "unset">, storage: StorageLike | null = defaultStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(CONSENT_KEY, state);
    return true;
  } catch {
    return false;
  }
}

/** 同意の変更を、同じタブ内の部品（バナー・フッターのリンク）に知らせるイベント名 */
export const CONSENT_EVENT = "ossalt:analytics-consent";
export const OPEN_SETTINGS_EVENT = "ossalt:analytics-open-settings";

/** PostHog が端末に残したキー（ph_ で始まる）を消す。同意の記録は消さない */
export function clearStoredIdentifiers(storage: Pick<Storage, "length" | "key" | "removeItem"> | null): void {
  try {
    if (!storage) return;
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const k = storage.key(i);
      if (k && (k.startsWith("ph_") || k.startsWith("__ph_"))) keys.push(k);
    }
    keys.forEach((k) => storage.removeItem(k));
  } catch {
    /* 無視 */
  }
}

