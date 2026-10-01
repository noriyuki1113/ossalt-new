/**
 * カテゴリページの編集コンテンツ（サーバー専用）
 *
 * content/categories/<category-slug>.md を Markdown として読む。
 * ファイルがあるカテゴリのページだけ、「選び方」の解説を表示する。
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const DIR = path.join(process.cwd(), "content", "categories");

export type CategoryGuide = { slug: string; updated: string; contentHtml: string };

let cache: Map<string, CategoryGuide> | null = null;

export function getCategoryGuide(slug: string): CategoryGuide | undefined {
  if (!cache) {
    cache = new Map();
    if (fs.existsSync(DIR)) {
      for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith(".md"))) {
        const s = file.replace(/\.md$/, "");
        const { data, content } = matter(fs.readFileSync(path.join(DIR, file), "utf8"));
        cache.set(s, {
          slug: s,
          updated: String(data.updated ?? ""),
          contentHtml: marked.parse(content, { async: false }) as string,
        });
      }
    }
  }
  return cache.get(slug);
}
