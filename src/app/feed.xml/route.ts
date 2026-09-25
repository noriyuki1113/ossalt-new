import { getActiveTools, getMeta } from "@/lib/data";
import { getBlogPosts } from "@/lib/blog";
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
 * ブログ記事を先頭に、その後段に新しく更新されたツールを配信する
 * （記事がまだ少ないうちも、更新中のツール一覧が下地として並ぶ）。
 */
export function GET() {
  const base = SITE.url.replace(/\/$/, "");
  const meta = getMeta();

  const blogItems = getBlogPosts()
    .map((post) => {
      const url = `${base}/blog/${post.slug}/`;
      const date = post.date ? new Date(post.date).toUTCString() : new Date().toUTCString();
      return `    <item>
      <title>${esc(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${date}</pubDate>
      <description>${esc(post.description)}</description>
    </item>`;
    })
    .join("\n");

  const tools = [...getActiveTools()]
    .sort((a, b) => {
      const da = a.last_commit ? new Date(a.last_commit).getTime() : 0;
      const db = b.last_commit ? new Date(b.last_commit).getTime() : 0;
      return db - da;
    })
    .slice(0, 30);

  const toolItems = tools
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

  const items = [blogItems, toolItems].filter(Boolean).join("\n");

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
