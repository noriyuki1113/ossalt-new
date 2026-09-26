/**
 * 「SaaSから探す」ページの編集コンテンツ（サーバー専用）
 *
 * content/alternatives/<competitor-slug>.md を frontmatter + Markdown として読む。
 * ファイルがあるSaaSのページだけ、導入文・用途別の候補・選び方・移行の注意を表示し、
 * 無いページは従来どおり比較表のみを表示する。
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import { getTools } from "./data";

const DIR = path.join(process.cwd(), "content", "alternatives");

export type GuidePick = { tool: string; fit: string };

export type AlternativeGuide = {
  slug: string;
  description: string;
  updated: string;
  intro: string;
  picks: GuidePick[];
  contentHtml: string;
};

function readAll(): Map<string, AlternativeGuide> {
  const map = new Map<string, AlternativeGuide>();
  if (!fs.existsSync(DIR)) return map;
  const toolIds = new Set(getTools().map((t) => t.id));

  for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith(".md"))) {
    const slug = file.replace(/\.md$/, "");
    const { data, content } = matter(fs.readFileSync(path.join(DIR, file), "utf8"));
    const picks: GuidePick[] = Array.isArray(data.picks) ? data.picks : [];
    for (const p of picks) {
      if (!toolIds.has(p.tool)) {
        console.warn(`[alternatives] ${slug}.md の picks に存在しないid "${p.tool}" があります`);
      }
    }
    map.set(slug, {
      slug,
      description: String(data.description ?? ""),
      updated: String(data.updated ?? ""),
      intro: String(data.intro ?? ""),
      picks: picks.filter((p) => toolIds.has(p.tool)),
      contentHtml: marked.parse(content, { async: false }) as string,
    });
  }
  return map;
}

let cache: Map<string, AlternativeGuide> | null = null;

export function getAlternativeGuide(slug: string): AlternativeGuide | undefined {
  if (!cache) cache = readAll();
  return cache.get(slug);
}
