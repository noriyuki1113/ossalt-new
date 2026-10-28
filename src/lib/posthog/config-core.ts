/**
 * PostHog の設定の解決（純粋関数。テスト用に config.ts から分けている）。
 *
 * - プロジェクトのトークンとホストが両方そろっているときだけ有効。どちらかが無ければ完全に無効
 *   （スクリプトの読み込みも、同意バナーも出さない。サイトの見た目・動作は従来のまま）。
 * - Project Token（phc_…）はブラウザに公開される値で、秘密ではない。Personal API Key（phx_…）は
 *   絶対にここへ置かない。
 * - 開発（next dev）では、NEXT_PUBLIC_POSTHOG_ENABLE_DEV=1 のときだけ有効。
 * - 本番のホスト名（SITE.url）以外のページ（プレビュー、localhost）では送らない。
 *   NEXT_PUBLIC_POSTHOG_ALLOWED_HOSTS（カンマ区切り）で上書きできる（テスト用）。
 */

export type PostHogConfig = {
  enabled: boolean;
  token: string;
  host: string;
  allowedHosts: string[];
  /** 自動操作のブラウザ（ボット・Playwright）のイベントも送る。テスト用のビルドだけで使う。本番では常に false（ボットは送らない） */
  allowAutomation: boolean;
};

export type PostHogEnv = {
  token?: string;
  host?: string;
  allowedHosts?: string;
  enableDev?: string;
  allowAutomation?: string;
  nodeEnv?: string;
  siteUrl: string;
};

const DISABLED: PostHogConfig = { enabled: false, token: "", host: "", allowedHosts: [], allowAutomation: false };

export function resolvePostHogConfig(env: PostHogEnv): PostHogConfig {
  const token = (env.token ?? "").trim();
  const host = (env.host ?? "").trim().replace(/\/+$/, "");
  if (!token || !host) return DISABLED;
  // Project Token は phc_ で始まる。それ以外（Personal API Key など）は受け付けない
  if (!/^phc_[A-Za-z0-9]+$/.test(token)) return DISABLED;
  if (!/^https?:\/\/[^/\s]+$/.test(host)) return DISABLED;
  if (env.nodeEnv !== "production" && env.enableDev !== "1") return DISABLED;

  let siteHost = "";
  try {
    siteHost = new URL(env.siteUrl).hostname;
  } catch {
    /* siteUrl が不正なら、許可するホストは空のまま */
  }
  const listed = (env.allowedHosts ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const allowedHosts = listed.length > 0 ? listed : siteHost ? [siteHost.toLowerCase(), `www.${siteHost.toLowerCase().replace(/^www\./, "")}`] : [];
  return { enabled: true, token, host, allowedHosts, allowAutomation: env.allowAutomation === "1" };
}

