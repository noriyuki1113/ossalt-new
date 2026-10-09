import fs from "node:fs";
import path from "node:path";
import {
  hasJapanese,
  slugifyCompetitor,
  type CompetitorGroup,
  type DataMeta,
  type Tool,
} from "./tools";
import type { Sponsor } from "./sponsors";
import { buildComparePairs, classifyLicense, type ComparePair, type LicenseClass } from "./compare";

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

/**
 * 為替レート（円換算表示用）。data-source/fx.json が無ければ null。
 * レート値は絶対にここでハードコードしない。
 */
export function getFx(): { usd_jpy: number; as_of: string } | null {
  return readJson<{ usd_jpy: number; as_of: string } | null>("fx.json", null);
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
  const addTo = (name: string, displayName: string, t: Tool) => {
    const slug = slugifyCompetitor(name);
    if (!slug) return;
    let g = map.get(slug);
    if (!g) {
      g = { slug, name: displayName, tools: [] };
      map.set(slug, g);
    }
    if (!g.tools.includes(t)) g.tools.push(t);
  };
  for (const t of getActiveTools()) {
    addTo(t.primary_competitor, t.primary_competitor_ja || t.primary_competitor, t);
    // 主な代替対象のほかに、編集部が指定したSaaS（国内SaaSなど）
    for (const name of t.also_competitors ?? []) addTo(name, name, t);
  }
  for (const g of map.values()) {
    g.tools.sort((a, b) => (b.health_score ?? 0) - (a.health_score ?? 0));
  }
  return [...map.values()].sort((a, b) => b.tools.length - a.tools.length);
}

export function getCompetitor(slug: string): CompetitorGroup | undefined {
  return getCompetitors().find((c) => c.slug === slug);
}

/**
 * 「A vs B」比較ページの組み合わせ（掲載中のツールのみ）。
 * 各SaaSの代替のうち健全度の上位 COMPARE_TOP_N 件どうしを組む（src/lib/compare.ts）。
 */
export function getComparePairs(): ComparePair[] {
  return buildComparePairs(getActiveTools());
}

/** 指定したツールが含まれる比較ページ */
export function getComparePairsForTool(toolId: string): ComparePair[] {
  return getComparePairs().filter((p) => p.a === toolId || p.b === toolId);
}

/** ライセンスの分類ごとの掲載中ツール（健全度順） */
export function getToolsByLicenseClass(cls: LicenseClass): Tool[] {
  return getActiveTools().filter((t) => classifyLicense(t.license) === cls);
}

/** 画面の翻訳か日本語のドキュメントがある掲載中ツール（健全度順） */
export function getJapaneseTools(): Tool[] {
  return getActiveTools().filter(hasJapanese);
}

/**
 * スポンサー枠の掲載（data-source/sponsors.json）。契約が0件なら空配列。
 * 検査（src/lib/sponsors.ts）に通らない掲載は、表示の段階で除かれる。
 */
export function getSponsors(): Sponsor[] {
  try {
    const raw = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "data-source", "sponsors.json"), "utf8"),
    ) as { sponsors?: Sponsor[] };
    return raw.sponsors ?? [];
  } catch {
    return [];
  }
}
