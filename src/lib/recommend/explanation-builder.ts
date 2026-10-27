/**
 * 6. 推薦理由の生成（Recommendation Explanation）
 *
 * 理由と注意は、採点に使った項目（signals）と適格性の注意（flags）から、決まった文面で作る。
 * 文章の生成AIは使わない。データに無いこと（機能・対応状況）は書かない。
 * 理由の文面は、その項目の点（signals の value）と同じ数字・判定から作るので、評価と食い違わない。
 */
import { EXPLAIN } from "./ranking-config.ts";
import { featureMatch, relationOf } from "./feature-extractor.ts";
import type { RecQuery, ScoredCandidate } from "./types.ts";

const LICENSE_OK: Record<RecQuery["license"], string> = {
  any: "",
  osi: "OSI承認のライセンス",
  permissive: "許容型のライセンス",
  "no-network-copyleft": "ネットワーク型コピーレフトではないライセンス",
};

export function explain(query: RecQuery, c: ScoredCandidate, saasName: string | null): { reasons: string[]; cautions: string[] } {
  const t = c.tool;
  const reasons: string[] = [];
  const cautions: string[] = [];
  const sig = Object.fromEntries(c.signals.map((s) => [s.key, s])) as Record<string, ScoredCandidate["signals"][number]>;

  // 用途
  const rel = relationOf(query, c);
  if (query.purpose.kind === "saas" && saasName) {
    if (rel.points >= 100) reasons.push(`${saasName}の代替として掲載している`);
    else if (rel.points >= 85) reasons.push(`${saasName}の代わりにもなる（編集部の指定）`);
    else cautions.push(`${saasName}の直接の代替ではなく、同じカテゴリの類似のOSS`);
  }
  const m = featureMatch(query, t);
  if (m) {
    if (m.yes === m.total) reasons.push(`必要な機能${m.total}件すべての対応を確認済み`);
    else if (m.yes > 0) reasons.push(`必要な機能${m.total}件のうち${m.yes}件の対応を確認済み`);
    if (m.unknown > 0) cautions.push(`必要な機能のうち${m.unknown}件は対応が未確認`);
  } else if (query.features.length > 0 && query.purpose.kind === "saas") {
    cautions.push("必要な機能の対応は未確認（診断データの対象外）");
  }

  // 保守
  const mt = sig.maintenance;
  if (!mt.known) cautions.push("保守状況の情報が無い（未確認）");
  else if (mt.value! >= EXPLAIN.maintenanceGood) reasons.push(`最近の開発を確認できる（最終コミット${t.freshnessDays}日前・直近12か月のリリース${t.releases12mo ?? "—"}回）`);
  else if (mt.value! <= EXPLAIN.maintenanceWeak) cautions.push(`更新が少ない（最終コミット${t.freshnessDays ?? "—"}日前・直近12か月のリリース${t.releases12mo ?? "—"}回）`);

  // セキュリティ
  const sc = sig.security;
  if (!sc.known) cautions.push("セキュリティ評価に十分なデータが無い（未確認）");
  else {
    if (t.scorecard != null && t.scorecard >= EXPLAIN.scorecardGood) reasons.push(`OpenSSF Scorecardが${t.scorecard}/10`);
    if (t.scorecard != null && t.scorecard < EXPLAIN.scorecardLow) cautions.push(`OpenSSF Scorecardが${t.scorecard}/10と低め`);
    if (t.securityMd === true) reasons.push("脆弱性の報告窓口（SECURITY.md）がある");
    if (t.securityMd === false) cautions.push("脆弱性の報告窓口（SECURITY.md）は見つからなかった");
    if (t.scorecard == null) cautions.push("OpenSSF Scorecardは未取得");
  }

  // 導入
  if (t.docker === true) reasons.push("Dockerで動かす手段を確認済み");
  if (t.diag) {
    const gap = t.diag.technicalLevel - query.skill;
    if (gap > 0) cautions.push(`初期設定に、あなたの回答より${gap}段高い技術知識が必要（診断データ）`);
  }
  if (t.jaUi === true) reasons.push("日本語の画面がある");
  else if (t.jaDocs === "official") reasons.push("公式の日本語ドキュメントがある");

  // ライセンス
  if (query.license !== "any" && t.licenseGroup === "osi" && !c.flags.some((f) => f.includes("ライセンス") || f.includes("選ぶ形式"))) {
    reasons.push(`ライセンス（${t.license}）は希望の条件（${LICENSE_OK[query.license]}）に合う`);
  }
  if (query.license === "any" && t.licenseGroup === "unknown") cautions.push("ライセンスは未確認");

  // 取り方の補足（事実だけ）
  if (c.sources.includes("trending") && t.gain30 != null && t.gain30 > 0) reasons.push(`直近30日でStarが${t.gain30.toLocaleString("ja-JP")}増えた（実測）`);

  cautions.push(...c.flags);
  if (c.evidence < 60) cautions.push(`評価に使う情報のうち確認できたのは${c.evidence}%（残りは中立の値で計算）`);
  return { reasons: [...new Set(reasons)], cautions: [...new Set(cautions)] };
}
