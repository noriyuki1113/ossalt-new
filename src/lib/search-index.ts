/**
 * ツール詳細ページを検索エンジンの登録対象から外す（noindex）かどうかの判定（サーバー専用）
 *
 * 対象は data-source/noindex-tools.json のリストに載っていて、かつ手書きの解説
 * （content/tools/<id>.md）がまだ無いページだけ。解説を追加すると、自動で index に戻る。
 * 「解説が無い」だけでは noindex にしない（検索の需要があり、先に解説を書くページを残すため）。
 * ページ自体と内部リンクは残す。サイトマップ（src/app/sitemap.ts）からは外す。
 */
import fs from "node:fs";
import path from "node:path";
import { getToolGuide } from "./tool-guides.ts";

let cache: Set<string> | null = null;

/** noindex の候補（data-source/noindex-tools.json の ids）。ファイルが無い・壊れている場合は空（＝どのページも noindex にしない） */
export function noindexCandidateIds(): Set<string> {
  if (cache) return cache;
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data-source", "noindex-tools.json"), "utf8"));
    cache = new Set(Array.isArray(raw?.ids) ? raw.ids.filter((x: unknown): x is string => typeof x === "string") : []);
  } catch {
    cache = new Set();
  }
  return cache;
}

/** 判定の本体（テスト用に、リストと「解説があるか」を引数で受ける） */
export function decideToolNoindex(id: string, candidates: ReadonlySet<string>, hasGuide: boolean): boolean {
  return candidates.has(id) && !hasGuide;
}

/** このツールの詳細ページを noindex にするか */
export function isToolNoindex(id: string): boolean {
  return decideToolNoindex(id, noindexCandidateIds(), !!getToolGuide(id));
}
