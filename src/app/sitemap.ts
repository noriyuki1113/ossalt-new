import type { MetadataRoute } from "next";
import { getActiveTools, getComparePairs, getCompetitors } from "@/lib/data";
import { getBlogPosts } from "@/lib/blog";
import { CATEGORIES } from "@/lib/categories";
import { SITE } from "@/lib/site";
import { LICENSE_PAGES } from "@/lib/licenses";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE.url.replace(/\/$/, "");
  const now = new Date();

  const staticPages = ["/", "/tools/", "/categories/", "/alternatives/", "/alternatives/japan/", "/compare/", "/licenses/", "/japanese/", "/trending/", "/guide/", "/diagnosis/", "/blog/", "/about/", "/contact/", "/submit/", "/badge/", "/advertise/", "/privacy/", "/terms/", "/disclaimer/"];

  return [
    ...staticPages.map((p) => ({
      url: `${base}${p}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: p === "/" ? 1 : p === "/blog/" ? 0.6 : 0.7,
    })),
    ...getBlogPosts().map((post) => ({
      url: `${base}/blog/${post.slug}/`,
      lastModified: post.updated ? new Date(post.updated) : now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...CATEGORIES.map((c) => ({
      url: `${base}/categories/${c.slug}/`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    // アーカイブ済み（開発終了）のツールは、ページ自体は残す（getTools()経由で生成
    // され続ける）が、サイトマップには載せない。検索エンジンに新規のインデックス登録を
    // 促すのは掲載中のツールだけでよいため（2026-09-30 修正指示書タスク4）。
    ...getActiveTools().map((t) => ({
      url: `${base}/tools/${t.id}/`,
      lastModified: t.last_commit ? new Date(t.last_commit) : now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...LICENSE_PAGES.map((p) => ({
      url: `${base}/licenses/${p.slug}/`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...getComparePairs().map((p) => ({
      url: `${base}/compare/${p.slug}/`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...getCompetitors().map((c) => ({
      url: `${base}/alternatives/${c.slug}/`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
