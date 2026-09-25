import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SITE, UMAMI_SCRIPT_URL, UMAMI_SITE_ID } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "オープンソース",
    "セルフホスト",
    "SaaS代替",
    "OSS",
    "自前運用",
    "比較",
  ],
  openGraph: {
    type: "website",
    locale: SITE.locale,
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: SITE.url,
    images: [
      {
        // 静的エクスポートのためSNS側が相対パスを解決できない。絶対URLで持つ。
        url: `${SITE.url}/og/default.png`,
        width: 1200,
        height: 630,
        alt: `${SITE.name} — ${SITE.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: SITE.twitter,
    images: [`${SITE.url}/og/default.png`],
  },
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": "/feed.xml" },
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Zen+Kaku+Gothic+New:wght@700;900&family=JetBrains+Mono:wght@400;700&display=swap"
        />
        <meta name="theme-color" content="#edefe9" />
      </head>
      <body>
        <a className="skip" href="#main">
          本文へスキップ
        </a>
        <div id="main">{children}</div>
        {UMAMI_SITE_ID && (
          <script defer src={UMAMI_SCRIPT_URL} data-website-id={UMAMI_SITE_ID} />
        )}
      </body>
    </html>
  );
}
