import type { MetadataRoute } from "next";
import { getCompetitors, getTools } from "@/lib/data";
import { getBlogPosts } from "@/lib/blog";
import { CATEGORIES } from "@/lib/categories";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE.url.replace(/\/$/, "");
  const now = new Date();

  const staticPages = ["/", "/tools/", "/categories/", "/alternatives/", "/guide/", "/blog/", "/about/", "/contact/", "/privacy/"];

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
    ...getTools().map((t) => ({
      url: `${base}/tools/${t.id}/`,
      lastModified: t.last_commit ? new Date(t.last_commit) : now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...getCompetitors().map((c) => ({
      url: `${base}/alternatives/${c.slug}/`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
