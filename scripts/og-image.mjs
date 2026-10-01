/**
 * OGP画像（共有用の画像）の取り出しと採否の判定（純粋関数のみ）
 *
 * fetch-previews.mjs から使う。テストは scripts/og-image.test.mjs。
 */

/** HTMLの <meta> から og:image（無ければ twitter:image）のURLを取り出す */
export function extractOgImage(html, baseUrl) {
  const metas = html.match(/<meta\b[^>]*>/gi) ?? [];
  const found = {};
  for (const tag of metas) {
    const attr = (name) => {
      const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
      return m ? (m[2] ?? m[3] ?? m[4] ?? "").trim() : null;
    };
    const key = (attr("property") ?? attr("name") ?? "").toLowerCase();
    const content = attr("content");
    if (!content) continue;
    if ((key === "og:image" || key === "og:image:url" || key === "og:image:secure_url") && !found.og) found.og = content;
    if ((key === "twitter:image" || key === "twitter:image:src") && !found.tw) found.tw = content;
  }
  const raw = found.og ?? found.tw;
  if (!raw) return null;
  try {
    const u = new URL(decodeEntities(raw), baseUrl);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function decodeEntities(s) {
  return s.replace(/&amp;/g, "&").replace(/&#x2F;/gi, "/").replace(/&#47;/g, "/");
}

/**
 * GitHubのページの og:image のうち、プロジェクトが自分で設定した画像だけを使う。
 * 自動生成のカード（opengraph.githubassets.com）は文字だけなので使わない。
 */
export function isCustomGithubPreview(url) {
  try {
    return new URL(url).hostname === "repository-images.githubusercontent.com";
  } catch {
    return false;
  }
}

/**
 * 横長の画像だけを採用する（ロゴだけの正方形の画像などは、枠に合わず見づらいため）。
 * 幅600px以上、縦横比 1.3〜2.6。
 */
export function acceptDimensions(width, height) {
  if (!width || !height) return false;
  const ratio = width / height;
  return width >= 600 && ratio >= 1.3 && ratio <= 2.6;
}
