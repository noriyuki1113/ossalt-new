/**
 * PostHog へ送る値の無害化（純粋関数）。
 * URLの「?」以降（検索語・Cost Labの金額・共有URL）と「#」以降は、送らない。
 * 参照元（リファラ）は、ドメイン（オリジン）だけにする。
 */

/** オリジン＋パスだけを返す（クエリ・ハッシュ・認証情報を落とす）。URLとして読めなければ空文字 */
export function stripUrl(raw: unknown): string {
  if (typeof raw !== "string" || !raw) return "";
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return `${u.origin}${u.pathname}`;
  } catch {
    return "";
  }
}

/** オリジンだけを返す（リファラ用） */
export function originOf(raw: unknown): string {
  if (typeof raw !== "string" || !raw) return "";
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:" ? u.origin : "";
  } catch {
    return "";
  }
}

const URL_KEYS = ["$current_url", "$prev_pageview_url", "$initial_current_url", "$session_entry_url"];
const REFERRER_KEYS = ["$referrer", "$initial_referrer", "$session_entry_referrer"];
// 個人や入力に結び付きうる、SDKが自動で付ける項目。送らない
const DROP_KEYS = ["$ip", "$geoip_city_name", "$geoip_postal_code", "$geoip_latitude", "$geoip_longitude", "$set", "$set_once", "$initial_person_info"];

/** SDKの before_send に渡す無害化。event.properties を書き換えた新しいオブジェクトを返す */
export function sanitizeProperties<T extends Record<string, unknown>>(props: T | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(props ?? {}) };
  for (const k of URL_KEYS) if (k in out) out[k] = stripUrl(out[k]);
  for (const k of REFERRER_KEYS) if (k in out) out[k] = originOf(out[k]);
  for (const k of DROP_KEYS) delete out[k];
  // SDKが付ける項目は将来増えうる。上の既知のキー以外でも、http(s)のURLに見える文字列は、必ず無害化する
  // （名前に referrer を含むものはオリジンだけ、それ以外はオリジン＋パスだけ）。
  for (const [k, v] of Object.entries(out)) {
    if (typeof v === "string" && /^https?:\/\//i.test(v)) out[k] = /referrer/i.test(k) ? originOf(v) : stripUrl(v);
  }
  // 検索語などの文字列が紛れ込まないよう、URLのクエリを含む可能性のある $pathname も、念のためクエリを落とす
  if (typeof out.$pathname === "string") out.$pathname = out.$pathname.split("?")[0].split("#")[0];
  return out;
}

/** 外部リンクの公開先ドメイン（ホスト名）だけを返す。読めなければ null */
export function linkDomain(href: string | null | undefined): string | null {
  if (!href) return null;
  try {
    const u = new URL(href, "https://ossalt.jp/");
    return u.protocol === "http:" || u.protocol === "https:" ? u.hostname.toLowerCase() : null;
  } catch {
    return null;
  }
}
