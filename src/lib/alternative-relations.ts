/**
 * 「代替の種類」（直接代替・部分代替・組み合わせ型・関連ツール）。
 * data-source/alternative-relations.json に、根拠のあるものだけを書く。無いものは画面に出さない
 * （未分類を「直接代替」とは扱わない）。サーバー専用。
 */
import fs from "node:fs";
import path from "node:path";

export type Relation = "direct" | "partial" | "combo" | "related";

export type RelationEntry = {
  relation: Relation;
  /** 組み合わせて使う相手のツールid（combo のとき） */
  with?: string[];
  note: string;
  source: string;
  checked_at: string;
};

export const RELATION_LABELS: Record<Relation, string> = {
  direct: "直接代替",
  partial: "部分代替",
  combo: "組み合わせ型",
  related: "関連ツール",
};

export const RELATION_DESCRIPTIONS: Record<Relation, string> = {
  direct: "主要な用途を、近い形で置き換えられる",
  partial: "一部の機能や用途を置き換えられる",
  combo: "ほかのツールと組み合わせて、置き換える",
  related: "直接の代替ではないが、関連して使われる",
};

const RELATIONS: Relation[] = ["direct", "partial", "combo", "related"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export type RelationData = Record<string, Record<string, RelationEntry>>;

/** データの検証。問題の説明を返す（空なら問題なし） */
export function validateRelations(data: RelationData, toolIds: Set<string>, saasSlugs: Set<string>): string[] {
  const problems: string[] = [];
  for (const [saas, tools] of Object.entries(data)) {
    if (!saasSlugs.has(saas)) problems.push(`${saas}：存在しないSaaSのslug`);
    for (const [id, e] of Object.entries(tools)) {
      const where = `${saas}/${id}`;
      if (!toolIds.has(id)) problems.push(`${where}：存在しないツールid`);
      if (!RELATIONS.includes(e.relation)) problems.push(`${where}：relation が不正（${e.relation}）`);
      if (!e.note?.trim()) problems.push(`${where}：note が空`);
      if (!e.source?.trim()) problems.push(`${where}：根拠（source）が空`);
      if (!DATE.test(e.checked_at ?? "")) problems.push(`${where}：checked_at が YYYY-MM-DD でない`);
      if (e.relation === "combo" && !(e.with?.length)) problems.push(`${where}：combo には組み合わせ相手（with）が必要`);
      for (const w of e.with ?? []) if (!toolIds.has(w)) problems.push(`${where}：with に存在しないツールid（${w}）`);
    }
  }
  return problems;
}

let cache: RelationData | null = null;

export function readRelationData(): RelationData {
  if (!cache) {
    const file = path.join(process.cwd(), "data-source", "alternative-relations.json");
    cache = fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")).relations ?? {}) : {};
  }
  return cache!;
}

/** あるSaaSの代替ページで、分類できているツール（ツールid → 分類） */
export function getRelations(saasSlug: string): Record<string, RelationEntry> {
  return readRelationData()[saasSlug] ?? {};
}
