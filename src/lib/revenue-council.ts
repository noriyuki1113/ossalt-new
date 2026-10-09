/**
 * Revenue Council：収益化の施策の候補と、6つの役割による独立した評価の記録（純粋関数のみ）
 *
 * Growth OS の Agent Council（src/lib/council.ts）と同じ6役割・同じ「公開してはいけない内容」の検査を使い、
 * 採点の項目と行動だけを収益化の会議用にしたもの。記録は docs/revenue/council/*.json、
 * 月次のレビューは docs/revenue/monthly/*.json（設計は docs/revenue/AGENT_COUNCIL.md）。
 *
 * リポジトリは公開なので、収益の実数は記録に入れない。月次レビューの収益の指標は
 * 「計測不可（not_measured）」か「非公開（private：運営者の手元で管理）」のどちらかで、数値を持てない。
 */

import { AGENTS, containsSensitiveNumbers, type AgentId } from "./council.ts";

export const RC_SCHEMA = "revenue-council/1";
export const RC_ACTIONS = ["BUILD", "TEST", "RESEARCH", "IMPROVE", "HOLD", "REJECT"] as const;
export type RcAction = (typeof RC_ACTIONS)[number];

/** 0〜100。実装・維持は「軽いほど高い」、収益化までの期間は「早いほど高い」 */
export const RC_SCORE_KEYS = [
  "revenue_potential",
  "user_value",
  "seo_impact",
  "brand_trust",
  "implementation_cost",
  "maintenance_cost",
  "time_to_revenue",
  "evidence_confidence",
] as const;
export type RcScoreKey = (typeof RC_SCORE_KEYS)[number];

export const BUSINESSES = ["sponsors", "affiliate", "intelligence", "analytics", "content", "platform"] as const;

export type RcEvaluation = {
  agent: AgentId;
  scores: Record<RcScoreKey, number>;
  action: RcAction;
  pros: string;
  cons: string;
  conditions?: string;
  kill_criteria?: string;
};

export type RcProposal = {
  id: string;
  title: string;
  business: (typeof BUSINESSES)[number];
  problem: string;
  proposal: string;
  revenue_link: string;
  evaluations: RcEvaluation[];
  decision: {
    action: RcAction;
    decided_by: "owner" | "lead";
    reason: string;
    /** 多数と違う判断をした場合や、強い反対があった場合に、それをどう扱ったか */
    dissent_handling: string;
    effort_hours_estimate: number | null;
    success_metrics: string[];
    phase: number | null;
    status: "proposed" | "approved" | "in_progress" | "done" | "rejected" | "on_hold";
  };
};

export type RcRecord = {
  schema: typeof RC_SCHEMA;
  session: string;
  date: string;
  summary: string;
  /** 点数は実測ではなく専門的な判断であることの明記 */
  scores_note: string;
  overalls?: Partial<Record<AgentId, unknown>>;
  proposals: RcProposal[];
};

export function validateRcRecord(rec: RcRecord): string[] {
  const errs: string[] = [];
  if (rec.schema !== RC_SCHEMA) errs.push(`schema は ${RC_SCHEMA}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rec.date)) errs.push("date は YYYY-MM-DD");
  if (!rec.scores_note) errs.push("scores_note（点数が実測かどうか）が空");
  const ids = new Set<string>();
  for (const p of rec.proposals) {
    const at = `提案 ${p.id}`;
    if (ids.has(p.id)) errs.push(`${at}: id が重複`);
    ids.add(p.id);
    for (const f of ["title", "problem", "proposal", "revenue_link"] as const) {
      if (!p[f]) errs.push(`${at}: ${f} が空`);
    }
    if (!(BUSINESSES as readonly string[]).includes(p.business)) errs.push(`${at}: business が不明`);
    const seen = new Set<string>();
    for (const e of p.evaluations) {
      if (!(AGENTS as readonly string[]).includes(e.agent)) errs.push(`${at}: 不明な役割 ${e.agent}`);
      if (seen.has(e.agent)) errs.push(`${at}: ${e.agent} の評価が重複`);
      seen.add(e.agent);
      if (!(RC_ACTIONS as readonly string[]).includes(e.action)) errs.push(`${at}: 不明な行動 ${e.action}`);
      if (!e.pros || !e.cons) errs.push(`${at}/${e.agent}: 賛成理由と反対理由が必要`);
      for (const k of RC_SCORE_KEYS) {
        const v = e.scores?.[k];
        if (typeof v !== "number" || v < 0 || v > 100) errs.push(`${at}/${e.agent}: ${k} は0〜100`);
      }
    }
    if (!(RC_ACTIONS as readonly string[]).includes(p.decision.action)) errs.push(`${at}: 判断の行動が不明`);
    if (!p.decision.reason) errs.push(`${at}: 判断の理由が空`);
    const agg = aggregateRc(p.evaluations);
    if ((agg.dissent.length > 0 || agg.plurality !== p.decision.action) && !p.decision.dissent_handling) {
      errs.push(`${at}: 多数と違う判断か強い反対があるのに、dissent_handling が空`);
    }
    const hits = containsSensitiveNumbers(JSON.stringify(p));
    if (hits.length) errs.push(`${at}: 公開してはいけない内容（${hits.join("・")}）`);
  }
  return errs;
}

export const RC_WEIGHTS: Record<Exclude<RcScoreKey, "evidence_confidence">, number> = {
  revenue_potential: 0.2,
  user_value: 0.2,
  seo_impact: 0.1,
  brand_trust: 0.2,
  implementation_cost: 0.1,
  maintenance_cost: 0.1,
  time_to_revenue: 0.1,
};

/** 同数のときは慎重な側を優先 */
const RC_TIE_ORDER: RcAction[] = ["HOLD", "RESEARCH", "REJECT", "TEST", "IMPROVE", "BUILD"];

export type RcAggregate = {
  /** 判断根拠の信頼度で重みづけした総合点（0〜100） */
  score: number;
  votes: Record<RcAction, number>;
  plurality: RcAction;
  dissent: string[];
};

export function aggregateRc(evals: RcEvaluation[]): RcAggregate {
  const votes = Object.fromEntries(RC_ACTIONS.map((a) => [a, 0])) as Record<RcAction, number>;
  let num = 0;
  let den = 0;
  for (const e of evals) {
    votes[e.action]++;
    const w = Math.max(e.scores.evidence_confidence, 1);
    const s = (Object.keys(RC_WEIGHTS) as (keyof typeof RC_WEIGHTS)[]).reduce(
      (acc, k) => acc + RC_WEIGHTS[k] * e.scores[k],
      0,
    );
    num += s * w;
    den += w;
  }
  const max = Math.max(...Object.values(votes));
  const plurality = RC_TIE_ORDER.find((a) => votes[a] === max) ?? "HOLD";
  const dissent: string[] = [];
  if (evals.length < AGENTS.length) dissent.push(`評価が ${evals.length}/${AGENTS.length} 役割しかない`);
  const critic = evals.find((e) => e.agent === "critical_investor");
  if (
    critic &&
    (critic.action === "REJECT" || critic.action === "HOLD") &&
    critic.scores.evidence_confidence >= 60 &&
    (plurality === "BUILD" || plurality === "IMPROVE")
  ) {
    dissent.push(`批判役が ${critic.action}（根拠の信頼度 ${critic.scores.evidence_confidence}）`);
  }
  return { score: den ? Math.round(num / den) : 0, votes, plurality, dissent };
}

/* ===== 月次レビュー（将来の Revenue Dashboard・月次の会議が参照する形） ===== */

export const MR_SCHEMA = "revenue-review/1";

/** 収益の指標。公開リポジトリには数値を置けない */
export const REVENUE_METRICS = [
  "monthly_revenue",
  "asp_approved_revenue",
  "sponsor_revenue",
  "monthly_profit",
  "rpm",
] as const;

export type MetricEntry = {
  key: string;
  /** measured：数値あり（収益以外のみ）／not_measured：取得手段がない／private：運営者の手元で管理 */
  status: "measured" | "not_measured" | "private";
  value?: number;
  /** どこで見るか（A8の管理画面、Umamiのイベント など） */
  source: string;
};

export type MonthlyReview = {
  schema: typeof MR_SCHEMA;
  month: string; // YYYY-MM
  metrics: MetricEntry[];
  /** 1〜10 の各項目（今月の収益、前月比、収益源別、伸びたコンテンツ、悪かった施策、コスト、各役割の評価、改善、中止、翌月の計画） */
  sections: Record<string, string>;
  /** データが足りない点（AIの評価で必ず書く） */
  data_gaps: string[];
};

export const MR_SECTIONS = [
  "revenue_this_month",
  "vs_last_month",
  "by_source",
  "growing_content",
  "underperforming",
  "costs",
  "agent_views",
  "improve",
  "stop",
  "next_month_plan",
] as const;

export function validateMonthlyReview(r: MonthlyReview): string[] {
  const errs: string[] = [];
  if (r.schema !== MR_SCHEMA) errs.push(`schema は ${MR_SCHEMA}`);
  if (!/^\d{4}-\d{2}$/.test(r.month)) errs.push("month は YYYY-MM");
  for (const m of r.metrics) {
    if (!["measured", "not_measured", "private"].includes(m.status)) errs.push(`${m.key}: status が不明`);
    if ((REVENUE_METRICS as readonly string[]).includes(m.key) && m.value !== undefined) {
      errs.push(`${m.key}: 収益の数値は公開リポジトリに置けない（private にして手元で管理）`);
    }
    if (m.status !== "measured" && m.value !== undefined) errs.push(`${m.key}: 計測していない指標に数値がある`);
    if (m.status === "measured" && typeof m.value !== "number") errs.push(`${m.key}: measured なのに数値がない`);
  }
  for (const s of MR_SECTIONS) if (!(s in r.sections)) errs.push(`項目 ${s} がない`);
  if (!Array.isArray(r.data_gaps)) errs.push("data_gaps は配列");
  const hits = containsSensitiveNumbers(JSON.stringify(r));
  if (hits.length) errs.push(`公開してはいけない内容（${hits.join("・")}）`);
  return errs;
}
