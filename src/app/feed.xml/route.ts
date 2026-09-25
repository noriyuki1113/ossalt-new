import { getActiveTools, getMeta } from "@/lib/data";
import { SITE, t } from "@/lib/site";

export const dynamic = "force-static";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * RSS 2.0 フィード
 * 新しく更新されたツールを「記事」として配信する（週刊ニュースレターの下地）。
 */
export function GET() {
  const base = SITE.url.replace(/\/$/, "");
  const meta = getMeta();
  const tools = [...getActiveTools()]
    .sort((a, b) => {
      const da = a.last_commit ? new Date(a.last_commit).getTime() : 0;
      const db = b.last_commit ? new Date(b.last_commit).getTime() : 0;
      return db - da;
    })
    .slice(0, 30);

  const items = tools
    .map((tool) => {
      const url = `${base}/tools/${tool.id}/`;
      const date = tool.last_commit ? new Date(tool.last_commit).toUTCString() : new Date().toUTCString();
      const desc = tool.description_ja ?? tool.description_en ?? "";
      return `    <item>
      <title>${esc(`${tool.name} — ${tool.primary_competitor_ja || tool.primary_competitor} のオープンソース代替`)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${date}</pubDate>
      <description>${esc(desc)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(`${SITE.name} — ${SITE.tagline}`)}</title>
    <link>${base}/</link>
    <description>${esc(SITE.description)}</description>
    <language>ja</language>
    <lastBuildDate>${new Date(meta.built_at).toUTCString()}</lastBuildDate>
    <atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
