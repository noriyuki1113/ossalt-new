/** @type {import('next').NextConfig} */

// GitHub Pages のようにサブパス（https://<user>.github.io/<repo>/）で公開するときだけ
// NEXT_BASE_PATH="/<repo>" を渡す。独自ドメイン・Vercel では未設定のままでよい。
const basePath = (process.env.NEXT_BASE_PATH || "").replace(/\/$/, "");

const nextConfig = {
  // データは public/data/*.json から読むため、DBもAPIも不要。
  // すべてのページを静的に書き出す（Vercel / Cloudflare Pages / GitHub Pages いずれも可）
  output: "export",
  trailingSlash: true,
  ...(basePath ? { basePath, assetPrefix: `${basePath}/` } : {}),
  images: {
    // 静的書き出しではNextの画像最適化サーバが使えないため無効化
    unoptimized: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
