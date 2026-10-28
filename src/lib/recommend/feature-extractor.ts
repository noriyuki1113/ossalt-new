/**
 * 3. 特徴量の抽出（Feature Extraction）
 *
 * 単位の違う値を、項目ごとに 0〜100 の点にそろえる。確認できない項目は null（未確認）。
 * 未確認を 0 点や「安全」「危険」として扱わない（扱いは scoring-engine.ts で中立値にする）。
 */
import { freshnessPoints, releasePoints } from "../rankings.ts";
import { getDifficulty } from "../diagnosis.ts";
import type { ToolDiagnosisMeta } from "../diagnosis-types.ts";
import {
  DIFFICULTY_POINTS,
  DOCKER_POINTS,
  EASE_PARTS,
  FEATURE_SHARE,
  RELATION_POINTS,
  SECURITY_PARTS,
  SKILL_GAP_PENALTY,
} from "./ranking-config.ts";
import type { Candidate, RecQuery, RecTool, SignalKey } from "./types.ts";

export type Feature = { value: number | null; basis: string };
export type Features = Record<SignalKey, Feature>;

const r1 = (n: number) => Math.round(n * 10) / 10;

/** 用途への関係の強さ（候補の取り方から） */
export function relationOf(query: RecQuery, c: Candidate): { points: number; label: string } {
  if (query.purpose.kind === "category") return { points: RELATION_POINTS.category, label: "選んだカテゴリのOSS" };
  if (c.sources.includes("saas") || (c.sources.includes("diagnosis") && c.tool.competitors[0] === query.purpose.slug))
    return { points: RELATION_POINTS.primary, label: "主な代替対象が、選んだSaaS" };
  if (c.sources.includes("also") || c.sources.includes("diagnosis"))
    return { points: RELATION_POINTS.also, label: "選んだSaaSの代わりにもなる（編集部の指定）" };
  return { points: RELATION_POINTS.similar, label: "選んだSaaSの代替と同じカテゴリ（類似のOSS）" };
}

export function featureMatch(query: RecQuery, t: RecTool): { yes: number; unknown: number; total: number } | null {
  if (query.features.length === 0 || query.purpose.kind !== "saas") return null;
  if (!t.diag || t.diag.saas !== query.purpose.slug) return null;
  const total = query.features.length;
  const yes = query.features.filter((f) => t.diag!.features[f] === true).length;
  const unknown = query.features.filter((f) => t.diag!.features[f] !== true && t.diag!.features[f] !== false).length;
  return { yes, unknown, total };
}

function fit(query: RecQuery, c: Candidate): Feature {
  const rel = relationOf(query, c);
  if (query.features.length === 0 || query.purpose.kind !== "saas") return { value: rel.points, basis: rel.label };
  const m = featureMatch(query, c.tool);
  if (!m) return { value: rel.points, basis: `${rel.label}。必要な機能の対応は未確認（関係の強さだけで計算）` };
  // 未確認の機能は「半分」として数える（あるとも無いとも決めつけない）
  const ratio = (m.yes + m.unknown * 0.5) / m.total;
  const value = r1(rel.points * (1 - FEATURE_SHARE) + ratio * 100 * FEATURE_SHARE);
  return { value, basis: `${rel.label}。必要な機能${m.total}件のうち対応を確認${m.yes}件・未確認${m.unknown}件` };
}

function maintenance(t: RecTool): Feature {
  const fr = freshnessPoints(t.freshnessDays);
  const rl = releasePoints(t.releases12mo);
  if (fr == null && rl == null) return { value: null, basis: "最終コミット・リリースの記録を取得できていない" };
  const value = fr != null && rl != null ? fr * 0.7 + rl * 0.3 : (fr ?? rl)!;
  return {
    value: r1(value),
    basis: `最終コミット${t.freshnessDays ?? "—"}日前・直近12か月のリリース${t.releases12mo ?? "—"}回（更新70%・リリース30%）`,
  };
}

function security(t: RecTool): Feature {
  const parts: Array<[number, number, string]> = [];
  if (t.scorecard != null) parts.push([SECURITY_PARTS.scorecard, t.scorecard * 10, `OpenSSF Scorecard ${t.scorecard}/10`]);
  if (t.securityMd != null) parts.push([SECURITY_PARTS.securityMd, t.securityMd ? 100 : 0, t.securityMd ? "SECURITY.mdあり" : "SECURITY.mdなし"]);
  if (t.dependabot != null) parts.push([SECURITY_PARTS.dependabot, t.dependabot ? 100 : 0, t.dependabot ? "Dependabotの設定あり" : "Dependabotの設定なし"]);
  if (parts.length === 0) return { value: null, basis: "Scorecard・SECURITY.md・Dependabotのいずれも確認できていない" };
  const w = parts.reduce((s, p) => s + p[0], 0);
  return { value: r1(parts.reduce((s, p) => s + p[0] * p[1], 0) / w), basis: parts.map((p) => p[2]).join("・") + "（確認できた項目だけで計算）" };
}

function ease(query: RecQuery, t: RecTool): Feature {
  let setup: number | null = null;
  let setupBasis = "";
  if (t.diag) {
    const d = getDifficulty(t.diag as Pick<ToolDiagnosisMeta, "technicalLevel" | "maintenanceLevel"> as ToolDiagnosisMeta);
    const gap = Math.max(0, t.diag.technicalLevel - query.skill);
    setup = Math.max(0, DIFFICULTY_POINTS[d] - gap * SKILL_GAP_PENALTY);
    setupBasis = `診断データの導入難易度「${d === "easy" ? "簡単" : d === "normal" ? "普通" : "やや高い"}」${gap > 0 ? `・必要な技術レベルがあなたより${gap}段高い` : ""}`;
  } else if (t.docker != null) {
    setup = t.docker ? DOCKER_POINTS.yes : DOCKER_POINTS.no;
    setupBasis = t.docker ? "Dockerで動かす手段を確認済み" : "Dockerで動かす手段は確認できなかった";
  }
  let ja: number | null = null;
  if (t.jaUi === true || t.jaDocs === "official") ja = 100;
  else if (t.jaDocs === "community") ja = 60;
  else if (t.jaUi === false && t.jaDocs === "none") ja = 0;
  const jaBasis = ja == null ? "" : ja === 100 ? "日本語の画面または公式の日本語ドキュメントあり" : ja === 60 ? "有志の日本語ドキュメントあり" : "日本語の画面・ドキュメントなし（確認済み）";
  if (setup == null && ja == null) return { value: null, basis: "導入の手間を判断できるデータが無い" };
  const parts: Array<[number, number]> = [];
  if (setup != null) parts.push([EASE_PARTS.setup, setup]);
  if (ja != null) parts.push([EASE_PARTS.japanese, ja]);
  const w = parts.reduce((s, p) => s + p[0], 0);
  return { value: r1(parts.reduce((s, p) => s + p[0] * p[1], 0) / w), basis: [setupBasis, jaBasis].filter(Boolean).join("・") };
}

export function extractFeatures(query: RecQuery, c: Candidate): Features {
  return { fit: fit(query, c), maintenance: maintenance(c.tool), security: security(c.tool), ease: ease(query, c.tool) };
}
