/**
 * 「AとBの違い」ページの編集コンテンツ（サーバー専用）
 *
 * content/compare/<a>-vs-<b>.md を読む。ファイルがある組だけ、
 * 「どっちを選ぶ？」の手書きのまとめを表示する。
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const DIR = path.join(process.cwd(), "content", "compare");

export type CompareGuide = { slug: string; description: string; updated: string; contentHtml: string };

let cache: Map<string, CompareGuide> | null = null;

export function getCompareGuide(slug: string): CompareGuide | undefined {
  if (!cache) {
    cache = new Map();
    if (fs.existsSync(DIR)) {
      for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith(".md"))) {
        const s = file.replace(/\.md$/, "");
        const { data, content } = matter(fs.readFileSync(path.join(DIR, file), "utf8"));
        cache.set(s, {
          slug: s,
          description: String(data.description ?? ""),
          updated: String(data.updated ?? ""),
          contentHtml: marked.parse(content, { async: false }) as string,
        });
      }
    }
  }
  return cache.get(slug);
}
