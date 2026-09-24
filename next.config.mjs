/** @type {import('next').NextConfig} */
const nextConfig = {
  // データは public/data/*.json から読むため、DBもAPIも不要。
  // すべてのページを静的に書き出す（Vercel / Cloudflare Pages / GitHub Pages いずれも可）
  output: "export",
  trailingSlash: true,
  images: {
    // 静的書き出しではNextの画像最適化サーバが使えないため無効化
    unoptimized: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
