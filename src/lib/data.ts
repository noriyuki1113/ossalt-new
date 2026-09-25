import fs from "node:fs";
import path from "node:path";
import {
  slugifyCompetitor,
  type CompetitorGroup,
  type DataMeta,
  type Tool,
} from "./tools";

/**
 * JSONデータの読み込み（サーバー専用）
 *
 * public/data/*.json をビルド時に読む。DBもAPIも不要。
 */

const DATA_DIR = path.join(process.cwd(), "public", "data");

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function getTools(): Tool[] {
  return readJson<Tool[]>("tools.json", []);
}

/**
 * 一覧・カテゴリ・比較・代替候補など「掲載中のツールとして並べる」場面で使う。
 * アーカイブ済み（開発停止）のツールはここから除外する。
 *
 * 除外しても詳細ページ（/tools/<id>/）自体は getTools() 経由で生成され続けるため、
 * 検索流入や既存リンクは維持しつつ、一覧・比較には出てこないようにする
 * （「もう使えない」ことをリンク先のページで案内するのが目的）。
 */
export function getActiveTools(): Tool[] {
  return getTools().filter((t) => !t.github_archived);
}

export function getMeta(): DataMeta {
  return readJson<DataMeta>("meta.json", {
    built_at: new Date().toISOString(),
    tool_count: 0,
    scored_count: 0,
    unrated_count: 0,
  });
}

export function getTool(id: string): Tool | undefined {
  return getTools().find((t) => t.id === id);
}

export function getCompetitors(): CompetitorGroup[] {
  const map = new Map<string, CompetitorGroup>();
  for (const t of getActiveTools()) {
    const slug = slugifyCompetitor(t.primary_competitor);
    if (!slug) continue;
    let g = map.get(slug);
    if (!g) {
      g = { slug, name: t.primary_competitor_ja || t.primary_competitor, tools: [] };
      map.set(slug, g);
    }
    g.tools.push(t);
  }
  for (const g of map.values()) {
    g.tools.sort((a, b) => (b.health_score ?? 0) - (a.health_score ?? 0));
  }
  return [...map.values()].sort((a, b) => b.tools.length - a.tools.length);
}

export function getCompetitor(slug: string): CompetitorGroup | undefined {
  return getCompetitors().find((c) => c.slug === slug);
}
