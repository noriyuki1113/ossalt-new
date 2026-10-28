/**
 * 1. 候補の抽出（Candidate Generation）
 *
 * 複数の取り方で候補を集め、ツールのid（安定した識別子）で1件にまとめる。
 * どの取り方で見つかったか（sources）は、推薦理由の表示に使う。
 */
import { CANDIDATE_LIMITS } from "./ranking-config.ts";
import type { Candidate, CandidateSource, RecQuery, RecTool } from "./types.ts";

const byIdAsc = (a: RecTool, b: RecTool) => a.id.localeCompare(b.id);
const desc = (f: (t: RecTool) => number | null) => (a: RecTool, b: RecTool) =>
  (f(b) ?? -1) - (f(a) ?? -1) || byIdAsc(a, b);

export function generateCandidates(query: RecQuery, tools: RecTool[]): Candidate[] {
  const map = new Map<string, Candidate>();
  const add = (t: RecTool, s: CandidateSource) => {
    const c = map.get(t.id);
    if (!c) map.set(t.id, { tool: t, sources: [s] });
    else if (!c.sources.includes(s)) c.sources.push(s);
  };

  let relatedCats: Set<string>;
  if (query.purpose.kind === "saas") {
    const slug = query.purpose.slug;
    for (const t of tools) {
      if (t.competitors[0] === slug) add(t, "saas");
      else if (t.competitors.includes(slug)) add(t, "also");
      if (t.diag && t.diag.saas === slug) add(t, "diagnosis");
    }
    relatedCats = new Set([...map.values()].map((c) => c.tool.category));
    // 類似のOSS：直接の代替と同じカテゴリのもの（人気の高い順に、上限まで）
    const similar = tools
      .filter((t) => relatedCats.has(t.category) && !map.has(t.id))
      .sort(desc((t) => t.popularity))
      .slice(0, CANDIDATE_LIMITS.similar);
    for (const t of similar) add(t, "similar");
  } else {
    const slug = query.purpose.slug;
    relatedCats = new Set([slug]);
    for (const t of tools) if (t.category === slug) add(t, "category");
  }

  // 関連するカテゴリの人気・急成長の上位（すでに候補にあれば、取り方だけを追記する）
  const inCats = tools.filter((t) => relatedCats.has(t.category));
  for (const t of [...inCats].filter((t) => t.popularity != null).sort(desc((t) => t.popularity)).slice(0, CANDIDATE_LIMITS.popular)) {
    if (map.has(t.id) || query.purpose.kind === "category") add(t, "popular");
  }
  for (const t of [...inCats].filter((t) => t.growth != null).sort(desc((t) => t.growth)).slice(0, CANDIDATE_LIMITS.trending)) {
    if (map.has(t.id) || query.purpose.kind === "category") add(t, "trending");
  }

  return [...map.values()].sort((a, b) => byIdAsc(a.tool, b.tool));
}
