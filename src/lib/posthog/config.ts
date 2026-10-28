/**
 * PostHog の設定（ビルド時に決まる公開値）。解決のルールは config-core.ts。
 */
import { SITE } from "@/lib/site";
import { resolvePostHogConfig, type PostHogConfig } from "./config-core";

export type { PostHogConfig };

// Next.js はビルド時に process.env.NEXT_PUBLIC_* の「文字どおりの参照」だけを埋め込む
export const POSTHOG: PostHogConfig = resolvePostHogConfig({
  token: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  allowedHosts: process.env.NEXT_PUBLIC_POSTHOG_ALLOWED_HOSTS,
  enableDev: process.env.NEXT_PUBLIC_POSTHOG_ENABLE_DEV,
  allowAutomation: process.env.NEXT_PUBLIC_POSTHOG_ALLOW_AUTOMATION,
  nodeEnv: process.env.NODE_ENV,
  siteUrl: SITE.url,
});

export function isAllowedHostname(hostname: string, cfg: Pick<PostHogConfig, "allowedHosts"> = POSTHOG): boolean {
  return cfg.allowedHosts.includes(hostname.toLowerCase());
}
