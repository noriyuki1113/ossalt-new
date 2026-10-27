/**
 * 3種類のランキング（人気・急成長・おすすめ）の計算（純粋関数のみ）
 *
 * - 人気：Stars・Forks・Contributors の掲載ツール内での順位（上位何%か）の加重和
 * - 急成長：直近7日・30日のStar純増の順位と、規模補正した成長率の順位の加重和
 * - おすすめ：用途適合度・保守・ライセンス・ドキュメント・導入のしやすさの加重和（0〜100点）
 *
 * 方針
 * - 単位の違う指標は、掲載ツール内での順位（パーセンタイル）にそろえて足す。
 *   同じ値は中間の順位にする。外れ値や負の純増にも使える。
 * - 実測の記録が足りないものは、0や推計で埋めず「未観測」として順位の外に出す。
 * - おすすめの「用途適合度」は、診断データのある5つのSaaSの主要機能に対する確認率だけで算出できる。
 *   それ以外は算出できないため、順位を付けない（適用外）。
 * - 既存の health_score（一覧の既定の並び順）とは別の指標で、こちらは変更しない。
 *
 * node:test から直接読み込めるよう、型以外の依存は純粋な関数だけにしている。
 */
import { licenseGroupOf, classifyLicense, type LicenseGroup } from "./compare.ts";
import { getDifficulty, type Difficulty } from "./diagnosis.ts";
import { SAAS_FEATURES, SAAS_LABELS, type SaasId, type ToolDiagnosisMeta } from "./diagnosis-types.ts";
import type { Tool } from "./tools.ts";

/* ------------------------------------------------------------------ *
 * 重み（初期案。変えるときはここだけ直し、ページの説明も自動で変わる）
 * ------------------------------------------------------------------ */

export const POPULARITY_WEIGHTS = { stars: 0.5, forks: 0.25, contributors: 0.25 } as const;
export const GROWTH_WEIGHTS = { gain7d: 0.5, gain30d: 0.3, rate: 0.2 } as const;
export const RECOMMEND_WEIGHTS = { fit: 0.35, maintenance: 0.25, license: 0.15, docs: 0.15, ease: 0.1 } as const;

/** 成長率の規模補正。分母に足す「仮想のStar数」。小さなリポジトリの少しの増加が大きな率にならないようにする */
export const RATE_SHRINK = 1000;
/** 30日の増加として扱う実測期間の下限（日）。記録の期間がこれ未満なら未観測 */
export const MIN_DAYS_30D = 25;

/* ------------------------------------------------------------------ *
 * 正規化
 * ------------------------------------------------------------------ */

/**
 * 各値の「掲載ツール内での順位」を 0〜100 にする（大きいほど高い）。
 * 同じ値は中間の順位（(それより小さい数 + 同じ数の半分) ÷ 全体）にする。
 */
export function percentileRanks(values: number[]): number[] {
  const n = values.length;
  if (n === 0) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const lowerBound = (x: number) => {
    let lo = 0, hi = n;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] < x) lo = mid + 1; else hi = mid; }
    return lo;
  };
  const upperBound = (x: number) => {
    let lo = 0, hi = n;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] <= x) lo = mid + 1; else hi = mid; }
    return lo;
  };
  return values.map((v) => {
    const below = lowerBound(v);
    const equal = upperBound(v) - below;
    return ((below + equal / 2) / n) * 100;
  });
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** 合計が同点のときの並び：Starが多い順、さらに同じなら id 順（常に同じ順序になる） */
function byScore<T extends { score: number; tool: Pick<Tool, "id" | "stars_num"> }>(a: T, b: T): number {
  return b.score - a.score || (b.tool.stars_num ?? 0) - (a.tool.stars_num ?? 0) || a.tool.id.localeCompare(b.tool.id);
}

/* ------------------------------------------------------------------ *
 * A. 人気
 * ------------------------------------------------------------------ */

export type RankPart = { key: string; label: string; weight: number; value: string; pct: number; points: number; note?: string };
export type PopularityRow = { tool: Tool; score: number; parts: RankPart[] };

const fmtInt = (n: number) => n.toLocaleString("ja-JP");

export function buildPopularity(tools: Tool[]): { rows: PopularityRow[]; unobserved: Tool[] } {
  const ok = tools.filter(
    (t) => !t.github_archived && t.stars_num != null && t.forks_num != null && t.contributors_num != null
  );
  const unobserved = tools.filter((t) => !t.github_archived && !ok.includes(t));
  const stars = percentileRanks(ok.map((t) => t.stars_num as number));
  const forks = percentileRanks(ok.map((t) => t.forks_num as number));
  const contributors = percentileRanks(ok.map((t) => t.contributors_num as number));
  const rows = ok.map((tool, i): PopularityRow => {
    const part = (key: keyof typeof POPULARITY_WEIGHTS, label: string, value: number, pct: number): RankPart => ({
      key, label, weight: POPULARITY_WEIGHTS[key], value: fmtInt(value), pct: round1(pct),
      points: round1(pct * POPULARITY_WEIGHTS[key]),
    });
    const parts = [
      part("stars", "Stars", tool.stars_num as number, stars[i]),
      part("forks", "Forks", tool.forks_num as number, forks[i]),
      part("contributors", "Contributors", tool.contributors_num as number, contributors[i]),
    ];
    return { tool, score: round1(parts.reduce((s, p) => s + p.points, 0)), parts };
  });
  rows.sort(byScore);
  return { rows, unobserved };
}

/* ------------------------------------------------------------------ *
 * B. 急成長
 * ------------------------------------------------------------------ */

export type GrowthRow = {
  tool: Tool;
  score: number;
  parts: RankPart[];
  /** 実測の期間（7日・30日それぞれの開始日・終了日・日数） */
  window7: { from: string; to: string; days: number };
  window30: { from: string; to: string; days: number };
  /** 規模補正した成長率（%）。30日の純増 ÷ (30日前のStar数 + RATE_SHRINK) */
  adjustedRatePct: number;
};

/** 実測の記録が足りず、成長を比べられないもの（理由つき） */
export type Unobserved = { tool: Tool; reason: string };

export function growthWindows(t: Tool): { w7: NonNullable<Tool["star_gain_7d"]>; w30: NonNullable<Tool["star_gain"]> } | { reason: string } {
  if (t.stars_num == null) return { reason: "Star数が未取得" };
  if (!t.star_gain_7d) return { reason: "7日以上前の実測の記録がまだ無い" };
  if (!t.star_gain || t.star_gain.days < MIN_DAYS_30D) return { reason: `30日の実測（${MIN_DAYS_30D}日以上）がまだ無い` };
  return { w7: t.star_gain_7d, w30: t.star_gain };
}

export function buildGrowth(tools: Tool[]): { rows: GrowthRow[]; unobserved: Unobserved[] } {
  const active = tools.filter((t) => !t.github_archived);
  const eligible: Array<{ tool: Tool; w7: NonNullable<Tool["star_gain_7d"]>; w30: NonNullable<Tool["star_gain"]>; rate: number }> = [];
  const unobserved: Unobserved[] = [];
  for (const tool of active) {
    const w = growthWindows(tool);
    if ("reason" in w) { unobserved.push({ tool, reason: w.reason }); continue; }
    const base = Math.max(0, (tool.stars_num as number) - w.w30.gain);
    eligible.push({ tool, w7: w.w7, w30: w.w30, rate: w.w30.gain / (base + RATE_SHRINK) });
  }
  const p7 = percentileRanks(eligible.map((e) => e.w7.gain));
  const p30 = percentileRanks(eligible.map((e) => e.w30.gain));
  const pr = percentileRanks(eligible.map((e) => e.rate));
  const rows = eligible.map((e, i): GrowthRow => {
    const sign = (n: number) => (n > 0 ? "+" : "") + fmtInt(n);
    const part = (key: keyof typeof GROWTH_WEIGHTS, label: string, value: string, pct: number, note?: string): RankPart => ({
      key, label, weight: GROWTH_WEIGHTS[key], value, pct: round1(pct), points: round1(pct * GROWTH_WEIGHTS[key]), note,
    });
    const ratePct = Math.round(e.rate * 1000) / 10;
    const parts = [
      part("gain7d", "7日の純増", sign(e.w7.gain), p7[i], `実測${e.w7.days}日`),
      part("gain30d", "30日の純増", sign(e.w30.gain), p30[i], `実測${e.w30.days}日`),
      part("rate", "補正した成長率", `${ratePct > 0 ? "+" : ""}${ratePct}%`, pr[i], "30日の純増 ÷（30日前のStar+1,000）"),
    ];
    return {
      tool: e.tool,
      score: round1(parts.reduce((s, p) => s + p.points, 0)),
      parts,
      window7: { from: e.w7.from, to: e.w7.to, days: e.w7.days },
      window30: { from: e.w30.from, to: e.w30.to ?? "", days: e.w30.days },
      adjustedRatePct: ratePct,
    };
  });
  rows.sort(byScore);
  return { rows, unobserved };
}

/* ------------------------------------------------------------------ *
 * C. おすすめ（診断データのある5つのSaaSだけ）
 * ------------------------------------------------------------------ */

export type RecommendPart = { key: keyof typeof RECOMMEND_WEIGHTS; label: string; weight: number; points: number; weighted: number; note: string; known: boolean };
export type RecommendRow = {
  tool: Tool;
  saas: SaasId;
  score: number;
  parts: RecommendPart[];
  /** 根拠が確認できた項目の重みの合計（%）。100未満なら、未確認の項目は0点として計算している */
  evidencePct: number;
};

/** 直近コミットからの日数 → 点（0〜100） */
export function freshnessPoints(days: number | null): number | null {
  if (days == null) return null;
  if (days <= 30) return 100;
  if (days <= 90) return 80;
  if (days <= 180) return 50;
  if (days <= 365) return 20;
  return 0;
}
/** 直近12か月のリリース回数 → 点（0〜100） */
export function releasePoints(n: number | null): number | null {
  if (n == null) return null;
  if (n >= 6) return 100;
  if (n >= 3) return 70;
  if (n >= 1) return 40;
  return 0;
}

const LICENSE_POINTS: Record<string, number> = {
  permissive: 100, "weak-copyleft": 90, copyleft: 80, "network-copyleft": 70,
};
/** ライセンス適合性（事業での社内利用で、条件が少ないほど高い） */
export function licensePoints(license: string | null): { points: number; known: boolean; note: string } {
  const group: LicenseGroup = licenseGroupOf(license);
  const cls = classifyLicense(license);
  if (group === "unknown") return { points: 0, known: false, note: "ライセンスが未確認" };
  if (group === "source-available") return { points: 30, known: true, note: `${license}（ソース公開型。商用利用に条件がある）` };
  if (group === "mixed") return { points: 40, known: true, note: `${license}（複数・混在。使う部分の確認が必要）` };
  if (cls === "dual") return { points: 90, known: true, note: `${license}（OSI承認のライセンスから選べる）` };
  return { points: LICENSE_POINTS[cls] ?? 0, known: true, note: `${license}（${cls === "permissive" ? "許容型" : cls === "weak-copyleft" ? "弱いコピーレフト" : cls === "copyleft" ? "コピーレフト" : "ネットワーク型コピーレフト"}）` };
}

export function docsPoints(t: Pick<Tool, "ja_ui" | "ja_docs">): { points: number; known: boolean; note: string } {
  if (t.ja_ui === true) return { points: 100, known: true, note: "日本語の画面がある" };
  if (t.ja_docs === "official") return { points: 100, known: true, note: "公式の日本語ドキュメントがある" };
  if (t.ja_docs === "community") return { points: 60, known: true, note: "有志による日本語ドキュメントがある" };
  return { points: 0, known: false, note: "日本語の対応は未確認（「無い」という意味ではない）" };
}

const EASE_POINTS: Record<Difficulty, number> = { easy: 100, normal: 60, hard: 20 };
const EASE_LABEL: Record<Difficulty, string> = { easy: "簡単", normal: "普通", hard: "やや高い" };

export function buildRecommended(
  tools: Tool[],
  metas: ToolDiagnosisMeta[]
): { bySaas: Partial<Record<SaasId, RecommendRow[]>>; applicable: number } {
  const byId = new Map(tools.filter((t) => !t.github_archived).map((t) => [t.id, t]));
  const bySaas: Partial<Record<SaasId, RecommendRow[]>> = {};
  let applicable = 0;
  for (const meta of metas) {
    const tool = byId.get(meta.toolId);
    if (!tool) continue;
    const features = SAAS_FEATURES[meta.saas];
    const yes = features.filter((f) => meta.features[f.id] === true).length;
    const no = features.filter((f) => meta.features[f.id] === false).length;
    const unk = features.length - yes - no;
    const fit = (yes / features.length) * 100;

    const fr = freshnessPoints(tool.freshness_days);
    const rl = releasePoints(tool.releases_12mo);
    const maintenanceKnown = fr != null || rl != null;
    const maintenance = fr != null && rl != null ? fr * 0.7 + rl * 0.3 : fr ?? rl ?? 0;
    const lic = licensePoints(tool.license);
    const docs = docsPoints(tool);
    const difficulty = getDifficulty(meta);

    const mk = (key: keyof typeof RECOMMEND_WEIGHTS, label: string, points: number, note: string, known = true): RecommendPart => ({
      key, label, weight: RECOMMEND_WEIGHTS[key], points: round1(points), weighted: round1(points * RECOMMEND_WEIGHTS[key]), note, known,
    });
    const parts = [
      mk("fit", `用途適合度（${SAAS_LABELS[meta.saas]}の主要機能）`, fit,
        `主要機能${features.length}項目のうち、対応を確認できたのは${yes}項目（未対応を確認${no}、未確認${unk}）`, yes + no > 0),
      mk("maintenance", "保守・更新状況", maintenance,
        `最終コミット${tool.freshness_days ?? "—"}日前（${fr ?? "—"}点）／直近12か月のリリース${tool.releases_12mo ?? "—"}回（${rl ?? "—"}点）。更新70%・リリース30%`, maintenanceKnown),
      mk("license", "ライセンス適合性", lic.points, lic.note, lic.known),
      mk("docs", "ドキュメント（日本語の対応）", docs.points, docs.note, docs.known),
      mk("ease", "導入・運用のしやすさ", EASE_POINTS[difficulty], `診断データの導入難易度「${EASE_LABEL[difficulty]}」`),
    ];
    const score = round1(parts.reduce((s, p) => s + p.weighted, 0));
    const evidencePct = round1(parts.filter((p) => p.known).reduce((s, p) => s + p.weight, 0) * 100);
    (bySaas[meta.saas] ??= []).push({ tool, saas: meta.saas, score, parts, evidencePct });
    applicable += 1;
  }
  for (const rows of Object.values(bySaas)) rows!.sort(byScore);
  return { bySaas, applicable };
}
