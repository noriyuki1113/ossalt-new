/**
 * Cost Lab：SaaSを使い続ける場合と、OSSを自分のサーバーで動かす場合の総費用の比較（純粋関数のみ）
 *
 * 方針（docs/OSSALT_REVENUE_STRATEGY.md・OSSALT_AGENT_COUNCIL.md の Phase 0 の合議）:
 * - 価格の既定値を持たない。計算に使う値は、すべて利用者が入力する（例の値は「仮入力」と明示して入れるだけ）。
 * - OSSが必ず安く見える設計にしない。運用にかかる時間×時給と、移行の初期費用を必ず含める。
 * - 計算式と前提を、結果と一緒に返して画面に出す。
 */

export const PERIOD_YEARS = [1, 3, 5] as const;
export type PeriodYears = (typeof PERIOD_YEARS)[number];

export type CostInput = {
  /** SaaSの1人あたりの月額（円） */
  saasPerUserMonthly: number;
  /** 利用人数 */
  users: number;
  /** SaaSの人数によらない月額（円。基本料金など。なければ0） */
  saasFixedMonthly: number;
  /** VPSなどサーバーの月額（円） */
  serverMonthly: number;
  /** バックアップの保存先などの月額（円） */
  backupMonthly: number;
  /** 運用（更新・バックアップの確認・障害の対応）に使う時間（時間/月） */
  opsHoursMonthly: number;
  /** 運用する人の時間あたりの費用（円/時間） */
  hourlyRate: number;
  /** 移行・構築にかかる時間（時間。初回だけ） */
  migrationHours: number;
  /** 移行のその他の費用（円。初回だけ。外部への依頼など） */
  migrationOtherCost: number;
  /** 比較する期間（年） */
  years: PeriodYears;
};

export const INPUT_LIMITS: Record<keyof Omit<CostInput, "years">, { min: number; max: number; integer?: boolean }> = {
  saasPerUserMonthly: { min: 0, max: 1_000_000 },
  users: { min: 1, max: 100_000, integer: true },
  saasFixedMonthly: { min: 0, max: 100_000_000 },
  serverMonthly: { min: 0, max: 10_000_000 },
  backupMonthly: { min: 0, max: 10_000_000 },
  opsHoursMonthly: { min: 0, max: 744 },
  hourlyRate: { min: 0, max: 1_000_000 },
  migrationHours: { min: 0, max: 100_000 },
  migrationOtherCost: { min: 0, max: 1_000_000_000 },
};

export type ValidationResult = { ok: true; value: CostInput } | { ok: false; errors: Partial<Record<keyof CostInput, string>> };

/** 入力の検証。数でない・範囲外・人数が整数でない・期間が1/3/5年でない、をはじく */
export function validateInput(raw: Partial<Record<keyof CostInput, unknown>>): ValidationResult {
  const errors: Partial<Record<keyof CostInput, string>> = {};
  const out: Partial<CostInput> = {};
  for (const [key, lim] of Object.entries(INPUT_LIMITS) as [keyof typeof INPUT_LIMITS, (typeof INPUT_LIMITS)[keyof typeof INPUT_LIMITS]][]) {
    const v = raw[key];
    const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
    if (!Number.isFinite(n)) errors[key] = "数字を入力してください";
    else if (n < lim.min || n > lim.max) errors[key] = `${lim.min.toLocaleString("ja-JP")}〜${lim.max.toLocaleString("ja-JP")}の範囲で入力してください`;
    else if (lim.integer && !Number.isInteger(n)) errors[key] = "整数で入力してください";
    else out[key] = n;
  }
  const y = Number(raw.years);
  if (!(PERIOD_YEARS as readonly number[]).includes(y)) errors.years = "1年・3年・5年から選んでください";
  else out.years = y as PeriodYears;
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: out as CostInput };
}

export type Verdict = "oss_cheaper" | "saas_cheaper" | "about_same";

export type CostResult = {
  months: number;
  saas: { monthly: number; total: number };
  oss: {
    initial: number;
    initialLabor: number;
    monthlyCash: number;
    monthlyLabor: number;
    monthly: number;
    total: number;
  };
  /** SaaSの総額 − OSSの総額（正ならOSSのほうが安い） */
  difference: number;
  /** 月あたりの差（SaaS − OSS）。正なら毎月OSSのほうが安い */
  monthlyDifference: number;
  /** 初期費用を、月あたりの差で取り戻すまでの月数。取り戻せないなら null */
  breakEvenMonths: number | null;
  /** 月の費用が同じになる人数の目安（1人あたりの月額が0なら null） */
  breakEvenUsers: number | null;
  verdict: Verdict;
  cautions: string[];
};

/** 総額の差が、SaaSの総額のこの割合以内なら「ほぼ同じ」とする */
export const ABOUT_SAME_RATIO = 0.05;

const round = (n: number) => Math.round(n);

export function calculate(input: CostInput): CostResult {
  const months = input.years * 12;
  const saasMonthly = input.saasPerUserMonthly * input.users + input.saasFixedMonthly;
  const monthlyCash = input.serverMonthly + input.backupMonthly;
  const monthlyLabor = input.opsHoursMonthly * input.hourlyRate;
  const ossMonthly = monthlyCash + monthlyLabor;
  const initialLabor = input.migrationHours * input.hourlyRate;
  const initial = initialLabor + input.migrationOtherCost;

  const saasTotal = saasMonthly * months;
  const ossTotal = initial + ossMonthly * months;
  const difference = saasTotal - ossTotal;
  const monthlyDifference = saasMonthly - ossMonthly;

  let breakEvenMonths: number | null = null;
  if (initial === 0) breakEvenMonths = monthlyDifference >= 0 ? 0 : null;
  else if (monthlyDifference > 0) breakEvenMonths = Math.ceil(initial / monthlyDifference);

  const breakEvenUsers =
    input.saasPerUserMonthly > 0 ? Math.max(1, Math.ceil((ossMonthly - input.saasFixedMonthly) / input.saasPerUserMonthly)) : null;

  const scale = Math.max(saasTotal, ossTotal, 1);
  const verdict: Verdict =
    Math.abs(difference) <= scale * ABOUT_SAME_RATIO ? "about_same" : difference > 0 ? "oss_cheaper" : "saas_cheaper";

  const cautions: string[] = [];
  if (input.opsHoursMonthly === 0) {
    cautions.push("運用の時間が0になっています。更新の適用、バックアップの確認、障害の対応には、毎月ある程度の時間がかかります。");
  }
  if (input.hourlyRate === 0) {
    cautions.push("時間あたりの費用が0になっています。運用や移行の手間が、費用に含まれていません。");
  }
  if (input.migrationHours === 0 && input.migrationOtherCost === 0) {
    cautions.push("移行・構築の費用が0になっています。データの移行や、利用者への説明にも時間がかかります。");
  }
  if (breakEvenMonths !== null && breakEvenMonths > months) {
    cautions.push(`初期費用を取り戻すのに約${breakEvenMonths}か月かかり、比較の期間（${months}か月）を超えます。`);
  }
  if (breakEvenMonths === null && monthlyDifference < 0) {
    cautions.push("毎月の費用もOSSのほうが高いため、この条件では初期費用を取り戻せません。");
  }
  cautions.push(
    "SaaSの料金には、障害の対応、セキュリティの更新、サポートが含まれています。自分で動かす場合は、それらを自分たちで担うことになります。",
  );

  return {
    months,
    saas: { monthly: round(saasMonthly), total: round(saasTotal) },
    oss: {
      initial: round(initial),
      initialLabor: round(initialLabor),
      monthlyCash: round(monthlyCash),
      monthlyLabor: round(monthlyLabor),
      monthly: round(ossMonthly),
      total: round(ossTotal),
    },
    difference: round(difference),
    monthlyDifference: round(monthlyDifference),
    breakEvenMonths,
    breakEvenUsers,
    verdict,
    cautions,
  };
}

/* ------------------------------------------------------------------ *
 * URLへの保存（結果を共有するため）。入力値だけを入れ、個人を特定する情報は扱わない。
 * ------------------------------------------------------------------ */

const PARAM: Record<keyof CostInput, string> = {
  saasPerUserMonthly: "pu",
  users: "u",
  saasFixedMonthly: "sf",
  serverMonthly: "sv",
  backupMonthly: "bk",
  opsHoursMonthly: "oh",
  hourlyRate: "hr",
  migrationHours: "mh",
  migrationOtherCost: "mc",
  years: "y",
};

export function toSearchParams(input: Partial<CostInput>, extra: { saas?: string; oss?: string } = {}): string {
  const p = new URLSearchParams();
  if (extra.saas) p.set("saas", extra.saas);
  if (extra.oss) p.set("oss", extra.oss);
  for (const [k, short] of Object.entries(PARAM) as [keyof CostInput, string][]) {
    const v = input[k];
    if (typeof v === "number" && Number.isFinite(v)) p.set(short, String(v));
  }
  return p.toString();
}

const SLUG_RE = /^[a-z0-9-]{1,60}$/;

/** URLから入力値を読む。知らない値・不正な値は無視する（そのまま画面に出さない） */
export function fromSearchParams(search: string): { input: Partial<Record<keyof CostInput, string>>; saas?: string; oss?: string } {
  const p = new URLSearchParams(search);
  const input: Partial<Record<keyof CostInput, string>> = {};
  for (const [k, short] of Object.entries(PARAM) as [keyof CostInput, string][]) {
    const v = p.get(short);
    if (v !== null && /^\d{1,12}(\.\d{1,2})?$/.test(v)) input[k] = v;
  }
  const saas = p.get("saas") ?? undefined;
  const oss = p.get("oss") ?? undefined;
  return {
    input,
    saas: saas && SLUG_RE.test(saas) ? saas : undefined,
    oss: oss && SLUG_RE.test(oss) ? oss : undefined,
  };
}

/** 「例を入れる」で入れる仮の値。実際の価格ではなく、計算の流れを試すための例（画面に「仮入力」と明示する） */
export const EXAMPLE_INPUT: Omit<CostInput, "years"> = {
  saasPerUserMonthly: 1000,
  users: 20,
  saasFixedMonthly: 0,
  serverMonthly: 2000,
  backupMonthly: 500,
  opsHoursMonthly: 4,
  hourlyRate: 3000,
  migrationHours: 20,
  migrationOtherCost: 0,
};
