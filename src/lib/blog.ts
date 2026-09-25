/**
 * ブログ記事の読み込み（サーバー専用）
 *
 * content/blog/*.md を frontmatter + Markdown として読み、ビルド時に
 * HTMLへ変換する。DBもCMSも無く、ファイルを追加するだけで記事が増える。
 *
 * 記事が5本を超えるまでは、タグ・著者ページ・検索・ページネーション・
 * カテゴリ別アーカイブは作らない方針（箱だけ大きくしない）。
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import { getTools } from "./data";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  updated: string;
  category: string;
  relatedTools: string[];
  contentHtml: string;
};

function readAll(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const toolIds = new Set(getTools().map((t) => t.id));

  const posts = fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const slug = file.replace(/\.md$/, "");
      const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf8");
      const { data, content } = matter(raw);

      const relatedTools: string[] = Array.isArray(data.relatedTools) ? data.relatedTools : [];
      for (const id of relatedTools) {
        if (!toolIds.has(id)) {
          // data-source/tools.json に存在しないidを書いた場合にビルドログで気づけるようにする。
          console.warn(`[blog] ${slug}.md の relatedTools に存在しないid "${id}" があります`);
        }
      }

      return {
        slug,
        title: String(data.title ?? slug),
        description: String(data.description ?? ""),
        date: String(data.date ?? ""),
        updated: String(data.updated ?? data.date ?? ""),
        category: String(data.category ?? ""),
        relatedTools,
        contentHtml: marked.parse(content, { async: false }) as string,
      };
    });

  return posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

let cache: BlogPost[] | null = null;

export function getBlogPosts(): BlogPost[] {
  if (!cache) cache = readAll();
  return cache;
}

export function getBlogPost(slug: string): BlogPost | undefined {
  return getBlogPosts().find((p) => p.slug === slug);
}
