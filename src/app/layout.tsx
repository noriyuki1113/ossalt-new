import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { JetBrains_Mono, Noto_Sans_JP, Zen_Kaku_Gothic_New } from "next/font/google";
import "./globals.css";
import { SITE, UMAMI_SCRIPT_URL, UMAMI_SITE_ID } from "@/lib/site";

// Downloads fonts during the build, then serves them from this site's own origin.
// Japanese font subsets are managed by Next.js; disable their automatic preload.
const notoSansJP = Noto_Sans_JP({
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-noto-jp",
  preload: false,
});
const zenKakuGothic = Zen_Kaku_Gothic_New({
  weight: ["700", "900"],
  display: "swap",
  variable: "--font-zen-kaku",
  preload: false,
});
const jetBrainsMono = JetBrains_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
});

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
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ja"
      className={`${notoSansJP.variable} ${zenKakuGothic.variable} ${jetBrainsMono.variable}`}
      style={{
        "--font-body": 'var(--font-noto-jp), "Hiragino Kaku Gothic ProN", "Yu Gothic", system-ui, sans-serif',
        "--font-display": 'var(--font-zen-kaku), "Hiragino Kaku Gothic StdN", "Yu Gothic", system-ui, sans-serif',
        "--font-mono": 'var(--font-jetbrains), ui-monospace, SFMono-Regular, Menlo, monospace',
      } as CSSProperties}
    >
      <head>
        <meta name="theme-color" content="#edefe9" />
      </head>
      <body>
        <a className="skip" href="#main">
          本文へスキップ
        </a>
        <div id="main">{children}</div>
        {UMAMI_SITE_ID && (
          // data-exclude-search：URLの「?」以降を記録しない（Cost Labの共有URLに入る金額などを、計測に送らないため）
          <script defer src={UMAMI_SCRIPT_URL} data-website-id={UMAMI_SITE_ID} data-exclude-search="true" />
        )}
      </body>
    </html>
  );
}
