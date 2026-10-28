/**
 * ツールページの編集コンテンツ（サーバー専用）
 *
 * content/tools/<tool-id>.md を frontmatter + Markdown として読む。
 * ファイルがあるツールのページだけ、「〇〇とは」の解説（できること・向いている人・
 * 始め方・注意点）を表示する。無いページは従来どおりデータの表示のみ。
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import { parseVerification, type Verification } from "./verification.ts";
import { parseGlance, type Glance } from "./glance.ts";

const DIR = path.join(process.cwd(), "content", "tools");

export type ToolGuide = {
  id: string;
  /** 検索結果に出る説明文（無ければ自動の説明文を使う） */
  description: string;
  updated: string;
  /** 検証状態（記録が無ければ「未検証」） */
  verification: Verification;
  /** 30秒で分かる要約（任意。解説の本文をもとに編集部がまとめたもの） */
  glance: Glance | null;
  contentHtml: string;
  /** 元のMarkdown（AI向けのMarkdown版・APIで使う） */
  markdown: string;
};

let cache: Map<string, ToolGuide> | null = null;

function readAll(): Map<string, ToolGuide> {
  const map = new Map<string, ToolGuide>();
  if (!fs.existsSync(DIR)) return map;
  for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith(".md"))) {
    const id = file.replace(/\.md$/, "");
    const { data, content } = matter(fs.readFileSync(path.join(DIR, file), "utf8"));
    map.set(id, {
      id,
      description: String(data.description ?? ""),
      updated: String(data.updated ?? ""),
      verification: parseVerification(data.verification),
      glance: parseGlance(data.at_a_glance),
      contentHtml: marked.parse(content, { async: false }) as string,
          markdown: content.trim(),
    });
  }
  return map;
}

export function getToolGuide(id: string): ToolGuide | undefined {
  if (!cache) cache = readAll();
  return cache.get(id);
}
