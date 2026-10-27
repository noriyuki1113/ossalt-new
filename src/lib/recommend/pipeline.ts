/**
 * Ranking Engine v2 の実行（候補抽出 → 適格性 → 特徴量 → 採点 → 多様性 → 理由）
 *
 * 純粋関数。同じ入力からは、いつも同じ結果を返す（乱数・現在時刻を使わない）。
 * 考え方は、xAI が公開している X の推薦アルゴリズム（xai-org/x-algorithm, Apache-2.0）の
 * 「候補の取得 → 絞り込み → 複数の信号の加重和 → 多様性の調整」という段階の分け方を参考にした。
 * コードは流用していない。
 */
import { generateCandidates } from "./candidate-generator.ts";
import { filterEligible } from "./eligibility-filter.ts";
import { ruleScorer, type Scorer } from "./scoring-engine.ts";
import { diversify } from "./diversity-ranker.ts";
import { explain } from "./explanation-builder.ts";
import { resolveWeights } from "./ranking-config.ts";
import type { RecCatalog, RecQuery, RecResult } from "./types.ts";

export function recommend(query: RecQuery, catalog: Pick<RecCatalog, "tools" | "saas">, scorer: Scorer = ruleScorer): RecResult {
  const weights = resolveWeights(query.profile, query.emphasis);
  const candidates = generateCandidates(query, catalog.tools);
  const { eligible, excluded } = filterEligible(query, candidates);
  const scored = eligible.map((c) => scorer(query, c, weights));
  const ranked = diversify(scored);
  const saasName = query.purpose.kind === "saas" ? catalog.saas[query.purpose.slug] ?? null : null;
  const items = ranked.map(({ item, note }, i) => ({ ...item, rank: i + 1, diversityNote: note, ...explain(query, item, saasName) }));
  return {
    items,
    excluded: excluded.sort((a, b) => a.tool.id.localeCompare(b.tool.id)),
    weights,
    candidateCount: candidates.length,
  };
}
