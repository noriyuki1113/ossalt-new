/**
 * 5. 多様性を考えた並べ替え（Diversity Reranking）
 *
 * MMR（Maximal Marginal Relevance）の考え方で、上から1件ずつ選ぶ：
 *   並びの点 = 適合度 − penalty × （すでに選んだ候補との最大の類似度）
 * 類似度は、同じ所有者（組織）・同じカテゴリ・同じ代替対象・トピックの重なりから決める。
 *
 * - 調整するのは「最上位の適合度から margin 点以内」かつ「minScore 点以上」の候補だけ。
 *   それ以外は適合度の順のまま後ろに並べる（多様性のために不適合な候補を上げない）。
 * - 多様性の調整で、用途の適合度（fit）が低い候補を、高い候補より上に上げることはしない
 *   （例：「Notionの代替」を、多様性のためだけに「同じカテゴリの類似のOSS」より下げない。点の順で上ならそのまま）。
 * - 上位 topK 件に、比較的小規模な候補（人気の点が低い）が1件も無いとき、
 *   条件を満たす小規模な候補が近い点にあれば、topK 番目と入れ替える（発見の機会）。
 */
import { DIVERSITY } from "./ranking-config.ts";
import type { RecTool, ScoredCandidate } from "./types.ts";
import { compareScored } from "./scoring-engine.ts";

export function similarity(a: RecTool, b: RecTool): number {
  let s = 0;
  if (a.owner && b.owner && a.owner.toLowerCase() === b.owner.toLowerCase()) s += DIVERSITY.sameOwner;
  if (a.category === b.category) s += DIVERSITY.sameCategory;
  if (a.competitors.some((x) => b.competitors.includes(x))) s += DIVERSITY.sharedSaas;
  const ta = new Set(a.topics), tb = new Set(b.topics);
  const inter = [...ta].filter((x) => tb.has(x)).length;
  const union = new Set([...ta, ...tb]).size;
  if (union > 0) s += DIVERSITY.topics * (inter / union);
  return Math.min(1, Math.round(s * 1000) / 1000);
}

export type Reranked = { item: ScoredCandidate; note: string | null };

const fitOf = (c: ScoredCandidate) => c.signals.find((s) => s.key === "fit")?.used ?? 0;
const isSmall = (t: RecTool) => t.popularity != null && t.popularity < DIVERSITY.smallPopularity;

export function diversify(scored: ScoredCandidate[]): Reranked[] {
  const sorted = [...scored].sort(compareScored);
  if (sorted.length === 0) return [];
  const top = sorted[0].score;
  const pool = sorted.filter((c) => c.score >= DIVERSITY.minScore && c.score >= top - DIVERSITY.margin);
  const rest = sorted.filter((c) => !pool.includes(c));

  const picked: Reranked[] = [];
  const remaining = [...pool];
  while (remaining.length > 0) {
    let best = -1, bestVal = -Infinity;
    remaining.forEach((c, i) => {
      // 適合度の順で前にある、用途の適合度がより高い候補を、飛び越えさせない
      if (remaining.slice(0, i).some((d) => fitOf(d) > fitOf(c))) return;
      const maxSim = picked.reduce((m, p) => Math.max(m, similarity(c.tool, p.item.tool)), 0);
      const val = c.score - DIVERSITY.penalty * maxSim;
      // 同点は適合度の順（compareScored）を保つ。remaining は compareScored 順なので先に見たものを優先
      if (val > bestVal + 1e-9) { best = i; bestVal = val; }
    });
    const [c] = remaining.splice(best, 1);
    picked.push({ item: c, note: null });
  }
  // 順位が下がった候補に、理由を付ける
  picked.forEach((p, i) => {
    const plainIndex = pool.indexOf(p.item);
    if (i > plainIndex) {
      const prev = picked.slice(0, i).map((q) => q.item.tool);
      const sim = prev.reduce((m, t) => Math.max(m, similarity(p.item.tool, t)), 0);
      if (sim > 0) p.note = "似た候補（同じ組織・カテゴリ・用途など）が上にあるため、順番を少し下げています";
    }
  });

  // 発見の機会：上位K件に小規模な候補が無ければ、近い点の小規模な候補を K 番目に入れる
  const k = Math.min(DIVERSITY.topK, picked.length);
  if (k >= 2 && !picked.slice(0, k).some((p) => isSmall(p.item.tool))) {
    const floor = picked[k - 1].item.score;
    const floorFit = fitOf(picked[k - 1].item);
    const idx = picked.findIndex((p, i) => i >= k && isSmall(p.item.tool) && fitOf(p.item) >= floorFit && p.item.score >= floor - DIVERSITY.smallWithin);
    if (idx >= 0) {
      const [small] = picked.splice(idx, 1);
      small.note = "比較的小規模な候補にも目を向けられるよう、表示枠を1つ確保しています（適合度の点は変えていません）";
      picked.splice(k - 1, 0, small);
    }
  }

  return [...picked, ...rest.map((item) => ({ item, note: null }))];
}
