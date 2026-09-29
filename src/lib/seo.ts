/**
 * ページごとのOGP・Twitterカードを組み立てる共通ヘルパー
 *
 * Next.jsの metadata.openGraph / metadata.twitter は項目単位ではなく丸ごと
 * 置き換わる。各ページが layout.tsx の既定値（トップページのタイトル・URL）を
 * 継承しっぱなしにならないよう、ページごとに毎回すべての項目を渡す。
 *
 * 2026-09-30 修正指示書のタスク3。
 */
import type { Metadata } from "next";
import { SITE } from "@/lib/site";

const OG_IMAGE = `${SITE.url}/og/default.png`;

export function pageMeta(opts: {
  title: string; // <title> 用（layout.tsxのテンプレート「%s | ossalt.jp」が付く）
  description: string;
  path: string; // 例: "/tools/n8n/"（末尾スラッシュあり）
  type?: "website" | "article";
  noindex?: boolean;
}): Metadata {
  const base = SITE.url.replace(/\/$/, "");
  const url = `${base}${opts.path}`;
  const ogTitle = `${opts.title} | ${SITE.name}`;
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: opts.path },
    openGraph: {
      type: opts.type ?? "website",
      locale: SITE.locale,
      siteName: SITE.name,
      title: ogTitle,
      description: opts.description,
      url,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: ogTitle }],
    },
    twitter: {
      card: "summary_large_image",
      site: SITE.twitter,
      title: ogTitle,
      description: opts.description,
      images: [OG_IMAGE],
    },
    ...(opts.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
