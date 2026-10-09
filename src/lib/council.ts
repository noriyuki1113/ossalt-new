/**
 * Agent Council：施策の候補と、6つの役割による独立した評価の記録（純粋関数のみ）
 *
 * 記録は docs/council/*.json に置く（設計は docs/OSSALT_AGENT_COUNCIL.md）。
 * リポジトリは公開なので、収益の実数・アクセスの実数・個人の情報は記録に入れない
 * （containsSensitiveNumbers で機械的に防ぎ、テストで全記録を検査する）。
 *
 * 最終判断は単純な平均では決めない：
 *   - 総合点は、各役割の採点を、その役割の確からしさ（confidence）で重みづけした平均
 *   - 推奨の行動は、役割ごとの行動の多数決（同数は慎重な側＝RESEARCH を優先）
 *   - 批判役（critical_investor）が確からしさ60以上で REJECT を付けたのに多数決が REJECT でない場合は、
 *     「反対意見あり」として人の判断を必須にする
 *   - 最終判断（decision）は人（運営者）か統括（lead）が理由とともに記録する
 */

export const AGENTS = [
  "chief_editor",
  "seo_strategist",
  "revenue_officer",
  "ux_designer",
  "automation_architect",
  "critical_investor",
] as const;
export type AgentId = (typeof AGENTS)[number];

export const ACTIONS = ["BUILD", "WRITE", "IMPROVE", "RESEARCH", "REJECT"] as const;
export type Action = (typeof ACTIONS)[number];

export const SCORE_KEYS = [
  "user_value",
  "revenue_potential",
  "seo_opportunity",
  "differentiation",
  "implementation_cost",
  "maintenance_cost",
  "confidence",
] as const;
export type ScoreKey = (typeof SCORE_KEYS)[number];
export type Scores = Record<ScoreKey, number>;

export type Evaluation = {
  agent: AgentId;
  scores: Scores;
  action: Action;
  rationale: string;
  objection: string;
  kill_criteria?: string;
};

export type Candidate = {
  id: string;
  title: string;
  /** 課題 */
  problem: string;
  /** 提案 */
  proposal: string;
  /** 対象ユーザー */
  audience: string;
  /** 根拠のURL（サイト内のパスか、一次資料のURL） */
  evidence: string[];
  expected_effect: string;
  /** 収益へのつながり */
  revenue_link: string;
  evaluations: Evaluation[];
  decision: {
    action: Action;
    /** 人（運営者）か、統括のAI（lead）か */
    decided_by: "owner" | "lead";
    reason: string;
    /** 必要な工数の目安（時間。見積もりであり実績ではない） */
    effort_hours_estimate: number | null;
    /** 実施後に確かめる指標 */
    success_metrics: string[];
    phase: number | null;
    status: "proposed" | "approved" | "in_progress" | "done" | "rejected";
  };
};

export type CouncilRecord = {
  session: string;
  date: string;
  summary: string;
  /** 各役割の全体の所見（上位3件、対立点など） */
  overalls?: Partial<Record<AgentId, unknown>>;
  candidates: Candidate[];
};

/** 公開リポジトリに入れてはいけない内容（収益・アクセスの実数、メールアドレス）を含むか */
export function containsSensitiveNumbers(text: string): string[] {
  const hits: string[] = [];
  if (/[0-9][0-9,]*\s*円\s*(の)?(収益|売上|報酬|成果)/.test(text) || /(収益|売上|報酬|成果)[^。\n]{0,10}[0-9][0-9,]*\s*円/.test(text)) {
    hits.push("収益の金額");
  }
  if (/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(text)) hits.push("メールアドレス");
  return hits;
}

/** 記録の形式の検査。問題の一覧を返す（空なら合格） */
export function validateRecord(rec: CouncilRecord): string[] {
  const errs: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rec.date)) errs.push("date は YYYY-MM-DD");
  const ids = new Set<string>();
  for (const c of rec.candidates) {
    const at = `候補 ${c.id}`;
    if (ids.has(c.id)) errs.push(`${at}: id が重複`);
    ids.add(c.id);
    for (const f of ["title", "problem", "proposal", "audience", "expected_effect", "revenue_link"] as const) {
      if (!c[f] || typeof c[f] !== "string") errs.push(`${at}: ${f} が空`);
    }
    const seen = new Set<string>();
    for (const e of c.evaluations) {
      if (!(AGENTS as readonly string[]).includes(e.agent)) errs.push(`${at}: 不明な役割 ${e.agent}`);
      if (seen.has(e.agent)) errs.push(`${at}: ${e.agent} の評価が重複`);
      seen.add(e.agent);
      if (!(ACTIONS as readonly string[]).includes(e.action)) errs.push(`${at}: 不明な行動 ${e.action}`);
      for (const k of SCORE_KEYS) {
        const v = e.scores?.[k];
        if (typeof v !== "number" || v < 0 || v > 100) errs.push(`${at}/${e.agent}: ${k} は0〜100`);
      }
    }
    if (!(ACTIONS as readonly string[]).includes(c.decision.action)) errs.push(`${at}: 判断の行動が不明`);
    if (!c.decision.reason) errs.push(`${at}: 判断の理由が空`);
    const hits = containsSensitiveNumbers(JSON.stringify(c));
    if (hits.length) errs.push(`${at}: 公開してはいけない内容（${hits.join("・")}）`);
  }
  return errs;
}

export type Aggregate = {
  /** 確からしさで重みづけした総合点（0〜100） */
  score: number;
  votes: Record<Action, number>;
  plurality: Action;
  /** 人の判断が必要な反対意見 */
  dissent: string[];
};

/** 総合点の重み（実装・保守は「軽いほど高い点」で採点されている） */
export const WEIGHTS: Record<Exclude<ScoreKey, "confidence">, number> = {
  user_value: 0.25,
  revenue_potential: 0.2,
  seo_opportunity: 0.15,
  differentiation: 0.15,
  implementation_cost: 0.1,
  maintenance_cost: 0.15,
};

/** 同数のときに優先する順（慎重な側から） */
const TIE_ORDER: Action[] = ["RESEARCH", "REJECT", "IMPROVE", "WRITE", "BUILD"];

export function aggregate(evals: Evaluation[]): Aggregate {
  const votes = Object.fromEntries(ACTIONS.map((a) => [a, 0])) as Record<Action, number>;
  let wsum = 0;
  let total = 0;
  for (const e of evals) {
    votes[e.action]++;
    const s = (Object.entries(WEIGHTS) as [keyof typeof WEIGHTS, number][]).reduce((acc, [k, w]) => acc + e.scores[k] * w, 0);
    const w = Math.max(e.scores.confidence, 1) / 100;
    total += s * w;
    wsum += w;
  }
  const max = Math.max(...Object.values(votes));
  const plurality = TIE_ORDER.find((a) => votes[a] === max) ?? "RESEARCH";
  const dissent: string[] = [];
  const critic = evals.find((e) => e.agent === "critical_investor");
  if (critic && critic.action === "REJECT" && critic.scores.confidence >= 60 && plurality !== "REJECT") {
    dissent.push(`批判役が REJECT（${critic.objection}）`);
  }
  if (evals.length < AGENTS.length) dissent.push(`評価が${evals.length}/${AGENTS.length}役割分しかない`);
  return { score: wsum ? Math.round(total / wsum) : 0, votes, plurality, dissent };
}
