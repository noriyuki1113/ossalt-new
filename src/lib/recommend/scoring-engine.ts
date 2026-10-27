/**
 * 4. 複数の指標による採点（Multi-Signal Scoring）
 *
 * 適合度 = Σ 重み × 項目の点（0〜100）。重みは利用者のタイプと「重視する」から決める（ranking-config.ts）。
 * 未確認の項目は中立値（NEUTRAL）で計算し、どれだけ確認できていたか（evidence）を別に出す。
 *
 * 将来、利用者の行動から学習したモデルに差し替える場合も、この関数（Scorer）の入出力だけを守ればよい。
 */
import { NEUTRAL, SIGNAL_LABELS } from "./ranking-config.ts";
import { extractFeatures } from "./feature-extractor.ts";
import type { Candidate, RecQuery, ScoredCandidate, Signal, SignalKey } from "./types.ts";

const r1 = (n: number) => Math.round(n * 10) / 10;
const KEYS: SignalKey[] = ["fit", "maintenance", "security", "ease"];

export type Scorer = (query: RecQuery, c: Candidate & { flags: string[] }, weights: Record<SignalKey, number>) => ScoredCandidate;

export const ruleScorer: Scorer = (query, c, weights) => {
  const f = extractFeatures(query, c);
  const signals: Signal[] = KEYS.map((key) => {
    const value = f[key].value;
    const used = value ?? NEUTRAL;
    return {
      key, label: SIGNAL_LABELS[key], value, used, weight: weights[key],
      points: r1(used * weights[key]), known: value != null, basis: f[key].basis,
    };
  });
  return {
    ...c,
    signals,
    score: r1(signals.reduce((s, x) => s + x.used * x.weight, 0)),
    evidence: Math.round(signals.filter((s) => s.known).reduce((s, x) => s + x.weight, 0) * 100),
  };
};

/** 同点のときも常に同じ順：点 → 根拠の確認率 → id */
export function compareScored(a: ScoredCandidate, b: ScoredCandidate): number {
  return b.score - a.score || b.evidence - a.evidence || a.tool.id.localeCompare(b.tool.id);
}
