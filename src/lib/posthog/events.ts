/**
 * OSSALT のイベント定義（ここが唯一の正本）。
 *
 * 送る値は、公開されているslug・カテゴリ・分類名・件数・ドメイン名だけ。検索語、自由記述、URLのクエリ、
 * 個人を特定できる値は、型の上でも受け付けない（属性は下の型に限る）。
 * 新しいイベントを足すときは、(1) EVENT_NAMES に名前、(2) EventProps に属性の型、
 * (3) docs/analytics-foundation.md の表、の3か所をそろえる。
 */

export const EVENT_NAMES = [
  "oss_search_performed",
  "oss_detail_viewed",
  "saas_alternative_viewed",
  "external_oss_link_clicked",
  "oss_diagnosis_completed",
] as const;
export type EventName = (typeof EVENT_NAMES)[number];

/** 絞り込みの種類（検索語そのものは含めない） */
export type FilterKind = "query" | "category" | "license" | "docker" | "japanese";
export type SearchPageType = "tools_list";
export type LinkKind = "official" | "github" | "other";

export type EventProps = {
  oss_search_performed: { result_count: number; filter_kinds: FilterKind[]; page_type: SearchPageType };
  oss_detail_viewed: { slug: string; category: string; license_class: string };
  saas_alternative_viewed: { slug: string; candidate_count: number };
  external_oss_link_clicked: { link_kind: LinkKind; slug: string; domain: string };
  oss_diagnosis_completed: { saas: string; recommended_count: number; conditions: string[] };
};

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;
const CLASS = /^[a-z0-9_-]{1,40}$/i;

export const isSlug = (v: unknown): v is string => typeof v === "string" && SLUG.test(v);
const count = (n: unknown): number => (typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.min(Math.floor(n), 100000) : 0);

/**
 * 属性の検証と整形。不正な値（slugの形でない文字列など）が1つでもあれば null を返し、送らない。
 * 型で防げない、実行時の取り違え（検索語をslugに渡す等）を止める最後の関門。
 */
export function buildEvent<N extends EventName>(name: N, props: EventProps[N]): { name: N; props: Record<string, unknown> } | null {
  switch (name) {
    case "oss_search_performed": {
      const p = props as EventProps["oss_search_performed"];
      const kinds = [...new Set(p.filter_kinds)].filter((k): k is FilterKind => ["query", "category", "license", "docker", "japanese"].includes(k)).sort();
      if (kinds.length === 0) return null; // 絞り込みが何もないときは、検索とは数えない
      if (p.page_type !== "tools_list") return null;
      return { name, props: { result_count: count(p.result_count), filter_kinds: kinds, page_type: p.page_type } };
    }
    case "oss_detail_viewed": {
      const p = props as EventProps["oss_detail_viewed"];
      if (!isSlug(p.slug) || !isSlug(p.category) || !CLASS.test(p.license_class)) return null;
      return { name, props: { slug: p.slug, category: p.category, license_class: p.license_class } };
    }
    case "saas_alternative_viewed": {
      const p = props as EventProps["saas_alternative_viewed"];
      if (!isSlug(p.slug)) return null;
      return { name, props: { slug: p.slug, candidate_count: count(p.candidate_count) } };
    }
    case "external_oss_link_clicked": {
      const p = props as EventProps["external_oss_link_clicked"];
      if (!isSlug(p.slug) || !["official", "github", "other"].includes(p.link_kind)) return null;
      if (typeof p.domain !== "string" || !/^[a-z0-9.-]{1,253}$/.test(p.domain)) return null;
      return { name, props: { link_kind: p.link_kind, slug: p.slug, domain: p.domain } };
    }
    case "oss_diagnosis_completed": {
      const p = props as EventProps["oss_diagnosis_completed"];
      if (!isSlug(p.saas) || !p.conditions.every((c) => CLASS.test(c))) return null;
      return { name, props: { saas: p.saas, recommended_count: count(p.recommended_count), conditions: [...new Set(p.conditions)].sort() } };
    }
    default:
      return null;
  }
}

/**
 * 同じページ表示の中で、同じイベントを二重に送らない（React StrictMode の二重実行・再レンダリング対策）。
 * key は「イベント名＋対象」。ページ遷移で resetDedupe() を呼ぶ。
 */
export function createDeduper() {
  const seen = new Set<string>();
  return {
    first(key: string): boolean {
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    },
    reset() {
      seen.clear();
    },
  };
}
