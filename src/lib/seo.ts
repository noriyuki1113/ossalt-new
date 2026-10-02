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
  /** ページ固有の共有用画像（サイト内のパス）。無ければサイト共通の画像 */
  image?: { src: string; width: number; height: number } | null;
  /** このページのMarkdown版（AIエージェント向け。サイト内のパス） */
  markdown?: string;
}): Metadata {
  const base = SITE.url.replace(/\/$/, "");
  const url = `${base}${opts.path}`;
  const ogTitle = `${opts.title} | ${SITE.name}`;
  const img = opts.image
    ? { url: `${base}${opts.image.src}`, width: opts.image.width, height: opts.image.height }
    : { url: OG_IMAGE, width: 1200, height: 630 };
  return {
    title: opts.title,
    description: opts.description,
    alternates: {
      canonical: opts.path,
      ...(opts.markdown ? { types: { "text/markdown": opts.markdown } } : {}),
    },
    openGraph: {
      type: opts.type ?? "website",
      locale: SITE.locale,
      siteName: SITE.name,
      title: ogTitle,
      description: opts.description,
      url,
      images: [{ ...img, alt: ogTitle }],
    },
    twitter: {
      card: "summary_large_image",
      site: SITE.twitter,
      title: ogTitle,
      description: opts.description,
      images: [img.url],
    },
    ...(opts.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
