/**
 * 「あなたに合うOSS診断」の判定ロジック（純粋関数のみ）
 *
 * ルールベースで判定する。AIやAPIは使わない。
 * この診断のスコアは「OSSそのものの優劣」ではなく「ユーザーの条件との適合度」であり、
 * ランキングではない（最も条件が近い候補 / その他の候補、の2区分で表示する）。
 *
 * React・Next.js・fsに依存しない設計にし、node:test から直接importして
 * テストできるようにしている。
 */
import {
  HOSTING_PREFERENCE_LABELS,
  MAX_STRENGTHS,
  NO_REQUIRED_FEATURE,
  SAAS_FEATURES,
  STRENGTH_LABELS,
  TEAM_SIZE_LABELS,
  TECHNICAL_LEVEL_LABELS,
  type FeatureState,
  type HostingPreference,
  type SaasId,
  type Strength,
  type TeamSize,
  type TechnicalLevel,
  type ToolDiagnosisMeta,
} from "./diagnosis-types.ts";

/* ------------------------------------------------------------------ *
 * 質問の回答
 * ------------------------------------------------------------------ */

export type DiagnosisAnswers = {
  saas: SaasId;
  teamSize: TeamSize;
  technicalLevel: TechnicalLevel;
  hosting: HostingPreference;
  /** 最大 MAX_STRENGTHS 個 */
  strengths: Strength[];
  /** SAAS_FEATURES[saas] のid配列。「特になし」の場合は空配列。 */
  requiredFeatures: string[];
};

export const TOTAL_STEPS = 6;

export function isCompleteAnswers(a: Partial<DiagnosisAnswers>): a is DiagnosisAnswers {
  return (
    a.saas != null &&
    a.teamSize != null &&
    a.technicalLevel != null &&
    a.hosting != null &&
    Array.isArray(a.strengths) &&
    Array.isArray(a.requiredFeatures)
  );
}

/* ------------------------------------------------------------------ *
 * 診断対象ツール1件分の入力（呼び出し側が ossalt.jp 本体のデータと突き合わせて作る）
 * ------------------------------------------------------------------ */

export type DiagnosisToolInput = {
  meta: ToolDiagnosisMeta;
  name: string;
  /** ossalt.jp本体の health_score。算出できていなければ null。 */
  healthScore: number | null;
};

/** meta.health の分布（build-data.mjsが算出）のうち、スコアリングに使う3点。 */
export type HealthPercentiles = { p25: number; p50: number; p75: number };

/* ------------------------------------------------------------------ *
 * ハードフィルター（必須条件による絞り込み）
 * ------------------------------------------------------------------ */

/**
 * セルフホスト必須なのに非対応、または必須機能が明確にfalseの場合に除外する。
 * unknown は除外しない（「情報不足」であり「非対応」ではないため）。
 *
 * ignoreFeatureFilter / ignoreHostingFilter は、候補が0件だったときに
 * 条件を緩めて再提示するためのフラグ（evaluateDiagnosis から使う）。
 */
export function passesHardFilters(
  meta: ToolDiagnosisMeta,
  answers: DiagnosisAnswers,
  opts: { ignoreHostingFilter?: boolean; ignoreFeatureFilter?: boolean } = {}
): boolean {
  if (!opts.ignoreHostingFilter && answers.hosting === "selfhost" && meta.selfHost === false) {
    return false;
  }
  if (!opts.ignoreFeatureFilter) {
    for (const featureId of answers.requiredFeatures) {
      if (meta.features[featureId] === false) return false;
    }
  }
  return true;
}

/* ------------------------------------------------------------------ *
 * 必須機能の一致状況
 * ------------------------------------------------------------------ */

export function countFeatureMatch(
  meta: ToolDiagnosisMeta,
  requiredFeatures: string[]
): { matched: number; total: number } {
  const total = requiredFeatures.length;
  if (total === 0) return { matched: 0, total: 0 };
  let matched = 0;
  for (const id of requiredFeatures) {
    if (meta.features[id] === true) matched += 1;
  }
  return { matched, total };
}

/* ------------------------------------------------------------------ *
 * スコアリング（合計100点）
 * ------------------------------------------------------------------ */

export type ScoreBreakdown = {
  requiredFeatures: number; // 0-30
  hosting: number; // 0-20
  technicalLevel: number; // 0-15
  strengths: number; // 0-20
  teamSize: number; // 0-10
  health: number; // 0-5
};

function healthPoints(healthScore: number | null, p: HealthPercentiles | null): number {
  if (healthScore == null || p == null) return 0;
  if (healthScore >= p.p75) return 5;
  if (healthScore >= p.p50) return 3.5;
  if (healthScore >= p.p25) return 2;
  return 1;
}

function hostingPoints(meta: ToolDiagnosisMeta, hosting: HostingPreference): number {
  if (hosting === "either") return 20;
  if (hosting === "selfhost") return meta.selfHost === true ? 20 : 0;
  // hosting === "cloud"
  if (meta.managedCloud === true) return 20;
  if (meta.managedCloud === "unknown") return 10; // 情報不足。0点にはしない
  return 0;
}

function technicalLevelPoints(meta: ToolDiagnosisMeta, userLevel: TechnicalLevel): number {
  const diff = meta.technicalLevel - userLevel;
  if (diff <= 0) return 15; // ユーザーの技術レベルで十分足りる
  if (diff === 1) return 8; // 少し背伸びが必要
  return 0;
}

function strengthsPoints(meta: ToolDiagnosisMeta, userStrengths: Strength[]): number {
  if (userStrengths.length === 0) return 20; // 重視項目の指定なし＝この観点では減点しない
  const matched = userStrengths.filter((s) => meta.strengths.includes(s)).length;
  return (matched / userStrengths.length) * 20;
}

function teamSizePoints(meta: ToolDiagnosisMeta, teamSize: TeamSize): number {
  return meta.teamSize.includes(teamSize) ? 10 : 0;
}

export function scoreCandidate(
  meta: ToolDiagnosisMeta,
  healthScore: number | null,
  answers: DiagnosisAnswers,
  healthPercentiles: HealthPercentiles | null
): { total: number; breakdown: ScoreBreakdown } {
  const { matched, total } = countFeatureMatch(meta, answers.requiredFeatures);
  const requiredFeatures = total === 0 ? 30 : (matched / total) * 30;

  const breakdown: ScoreBreakdown = {
    requiredFeatures,
    hosting: hostingPoints(meta, answers.hosting),
    technicalLevel: technicalLevelPoints(meta, answers.technicalLevel),
    strengths: strengthsPoints(meta, answers.strengths),
    teamSize: teamSizePoints(meta, answers.teamSize),
    health: healthPoints(healthScore, healthPercentiles),
  };
  const total_ =
    breakdown.requiredFeatures +
    breakdown.hosting +
    breakdown.technicalLevel +
    breakdown.strengths +
    breakdown.teamSize +
    breakdown.health;
  return { total: Math.round(total_), breakdown };
}

/* ------------------------------------------------------------------ *
 * データ充足率（条件一致度とは別に、判定に使った項目のうちどれだけ
 * 「未確認」ではなく確認できていたかを表す）
 * ------------------------------------------------------------------ */

export function computeCompleteness(meta: ToolDiagnosisMeta, answers: DiagnosisAnswers): number {
  let checkable = 0;
  let known = 0;

  // 運用方法：cloud希望のときだけ managedCloud の確認状況が関係する
  if (answers.hosting !== "selfhost") {
    checkable += 1;
    if (meta.managedCloud !== "unknown") known += 1;
  }

  // 必須機能：ユーザーが選んだものだけをチェックする
  for (const id of answers.requiredFeatures) {
    checkable += 1;
    if (meta.features[id] !== "unknown") known += 1;
  }

  if (checkable === 0) return 100;
  return Math.round((known / checkable) * 100);
}

/* ------------------------------------------------------------------ *
 * 導入難易度（技術レベル要件と運用の手間から算出する表示用ラベル）
 * ------------------------------------------------------------------ */

export type Difficulty = "easy" | "normal" | "hard";
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "簡単",
  normal: "普通",
  hard: "やや高い",
};

export function getDifficulty(meta: ToolDiagnosisMeta): Difficulty {
  const sum = meta.technicalLevel + meta.maintenanceLevel;
  if (sum <= 1) return "easy";
  if (sum <= 4) return "normal";
  return "hard";
}

/* ------------------------------------------------------------------ *
 * 「合っている点」「確認しておきたい点」の生成（固定テンプレート。AI文章生成は使わない）
 * ------------------------------------------------------------------ */

export function buildReasons(
  meta: ToolDiagnosisMeta,
  answers: DiagnosisAnswers
): { good: string[]; check: string[] } {
  const good: string[] = [];
  const check: string[] = [];

  if (answers.hosting === "selfhost" || answers.hosting === "either") {
    if (meta.selfHost) good.push("セルフホスト可能");
  }
  if (answers.hosting === "cloud") {
    if (meta.managedCloud === true) good.push("公式のクラウド版がある");
    else if (meta.managedCloud === "unknown") check.push("クラウド版の有無は未確認");
    else check.push("公式のクラウド版は無い（自前での運用が必要）");
  }

  if (meta.technicalLevel <= answers.technicalLevel) {
    good.push("あなたの技術レベルで導入できる");
  } else {
    check.push("導入にはもう少し技術的な準備が必要");
  }

  for (const id of answers.requiredFeatures) {
    const label = SAAS_FEATURES[meta.saas].find((f) => f.id === id)?.label ?? id;
    const v: FeatureState = meta.features[id];
    if (v === true) good.push(`${label}に対応`);
    else if (v === "unknown") check.push(`${label}への対応状況は未確認`);
    // false のものはハードフィルターで通常除外されるため、ここには基本出てこない
  }

  for (const s of answers.strengths) {
    if (meta.strengths.includes(s)) good.push(STRENGTH_LABELS[s]);
  }

  if (!meta.teamSize.includes(answers.teamSize)) {
    check.push(`${TEAM_SIZE_LABELS[answers.teamSize]}での利用実績は少なめ`);
  }

  const difficulty = getDifficulty(meta);
  if (difficulty === "hard") {
    check.push("セルフホストではバックアップ・アップデートなどの運用が必要");
  }

  return { good, check };
}

/* ------------------------------------------------------------------ *
 * 診断結果の1候補
 * ------------------------------------------------------------------ */

export type CandidateResult = {
  toolId: string;
  name: string;
  score: number;
  breakdown: ScoreBreakdown;
  completeness: number;
  difficulty: Difficulty;
  matchedRequired: number;
  totalRequired: number;
  good: string[];
  check: string[];
};

function buildCandidate(
  input: DiagnosisToolInput,
  answers: DiagnosisAnswers,
  healthPercentiles: HealthPercentiles | null
): CandidateResult {
  const { total, breakdown } = scoreCandidate(input.meta, input.healthScore, answers, healthPercentiles);
  const { matched, total: totalRequired } = countFeatureMatch(input.meta, answers.requiredFeatures);
  const { good, check } = buildReasons(input.meta, answers);
  return {
    toolId: input.meta.toolId,
    name: input.name,
    score: total,
    breakdown,
    completeness: computeCompleteness(input.meta, answers),
    difficulty: getDifficulty(input.meta),
    matchedRequired: matched,
    totalRequired,
    good,
    check,
  };
}

/**
 * 同点のときも常に同じ順序になるよう、スコア降順→toolId昇順で安定ソートする。
 */
function sortCandidates(list: CandidateResult[]): CandidateResult[] {
  return [...list].sort((a, b) => b.score - a.score || a.toolId.localeCompare(b.toolId));
}

export type DiagnosisResult = {
  /** 最も条件が近い候補。0件ならnull。 */
  primary: CandidateResult | null;
  /** その他の候補（最大2件）。 */
  others: CandidateResult[];
  /**
   * ハードフィルターを緩めて再提示した場合に、何を緩めたかを示す。
   * 緩める必要が無ければ null。
   */
  relaxedNote: string | null;
};

const MAX_RESULTS = 3;

export function evaluateDiagnosis(
  answers: DiagnosisAnswers,
  allTools: DiagnosisToolInput[],
  healthPercentiles: HealthPercentiles | null = null
): DiagnosisResult {
  const candidates = allTools.filter((t) => t.meta.saas === answers.saas);

  const run = (opts: { ignoreHostingFilter?: boolean; ignoreFeatureFilter?: boolean }) =>
    sortCandidates(
      candidates
        .filter((c) => passesHardFilters(c.meta, answers, opts))
        .map((c) => buildCandidate(c, answers, healthPercentiles))
    ).slice(0, MAX_RESULTS);

  let results = run({});
  let relaxedNote: string | null = null;

  if (results.length === 0 && answers.requiredFeatures.length > 0) {
    results = run({ ignoreFeatureFilter: true });
    if (results.length > 0) {
      relaxedNote = "必須機能の条件を一部満たさない候補も含めて表示しています（機能面は「確認しておきたい点」に記載）。";
    }
  }

  if (results.length === 0 && answers.hosting === "selfhost") {
    results = run({ ignoreHostingFilter: true, ignoreFeatureFilter: true });
    if (results.length > 0) {
      relaxedNote = "セルフホストの条件を一部満たさない候補も含めて表示しています。";
    }
  }

  const [primary = null, ...others] = results;
  return { primary, others, relaxedNote };
}

/* ------------------------------------------------------------------ *
 * URL Search Params とのやり取り（結果の再現・共有用）
 * 個人情報は含まない（診断の回答値のみ）。
 * ------------------------------------------------------------------ */

const SAAS_ID_SET = new Set<string>(["notion", "slack", "zapier", "trello", "google-analytics"]);
const TEAM_SIZE_SET = new Set<string>(["solo", "small", "medium", "large"]);
const HOSTING_SET = new Set<string>(["selfhost", "cloud", "either"]);
const STRENGTH_SET = new Set<string>(Object.keys(STRENGTH_LABELS));

export function encodeAnswersToSearchParams(answers: DiagnosisAnswers): URLSearchParams {
  const p = new URLSearchParams();
  p.set("saas", answers.saas);
  p.set("team", answers.teamSize);
  p.set("skill", String(answers.technicalLevel));
  p.set("hosting", answers.hosting);
  if (answers.strengths.length > 0) p.set("strengths", answers.strengths.join(","));
  p.set("features", answers.requiredFeatures.length > 0 ? answers.requiredFeatures.join(",") : NO_REQUIRED_FEATURE);
  return p;
}

/**
 * URLパラメータから回答を復元する。不正・破損している場合は null を返す
 * （呼び出し側は診断トップへ戻すなど、安全な扱いをすること）。
 */
export function decodeAnswersFromSearchParams(params: URLSearchParams): DiagnosisAnswers | null {
  const saas = params.get("saas");
  const team = params.get("team");
  const skillRaw = params.get("skill");
  const hosting = params.get("hosting");
  const strengthsRaw = params.get("strengths");
  const featuresRaw = params.get("features");

  if (!saas || !SAAS_ID_SET.has(saas)) return null;
  if (!team || !TEAM_SIZE_SET.has(team)) return null;
  if (!hosting || !HOSTING_SET.has(hosting)) return null;
  const skill = Number(skillRaw);
  if (!Number.isInteger(skill) || skill < 0 || skill > 3) return null;

  const strengths = (strengthsRaw ? strengthsRaw.split(",") : []).filter((s): s is Strength =>
    STRENGTH_SET.has(s)
  );
  if (strengths.length > MAX_STRENGTHS) return null;

  const saasId = saas as SaasId;
  const validFeatureIds = new Set(SAAS_FEATURES[saasId].map((f) => f.id));
  const requiredFeatures =
    !featuresRaw || featuresRaw === NO_REQUIRED_FEATURE
      ? []
      : featuresRaw.split(",").filter((f) => validFeatureIds.has(f));

  return {
    saas: saasId,
    teamSize: team as TeamSize,
    technicalLevel: skill as TechnicalLevel,
    hosting: hosting as HostingPreference,
    strengths,
    requiredFeatures,
  };
}

export { HOSTING_PREFERENCE_LABELS, TECHNICAL_LEVEL_LABELS };
