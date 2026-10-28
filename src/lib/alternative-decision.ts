/**
 * 「SaaSの代替」ページの判断の要約を、掲載データだけから作る（純粋関数）。
 *
 * - 「結局どれを選ぶか」に役立つ、候補ごとの早見表（ライセンス・導入・日本語・更新・人気/成長）
 * - 機能の比較表とおすすめの目安：機能データがある5つのSaaS（診断データ）のみ
 * - 乗り換えない方がよいケース：データから言えるものだけ。一般的な目安は、データではなく編集方針として分けて示す
 * - 移行の難しさは、取り込み機能のデータが無いため点数にしない（案内だけ）
 *
 * node:test から直接読み込めるよう、型以外の依存は純粋な関数だけにしている。
 */
import { licenseGroupOf, LICENSE_GROUP_LABELS, type LicenseGroup } from "./compare.ts";
import { DIFFICULTY_LABELS, getDifficulty, type Difficulty } from "./diagnosis.ts";
import { SAAS_FEATURES, SAAS_IDS, type FeatureState, type SaasId, type ToolDiagnosisMeta } from "./diagnosis-types.ts";
import { buildRecommended, type RecommendRow } from "./rankings.ts";
import type { Tool } from "./tools.ts";

export type DecisionRow = {
  tool: Tool;
  licenseGroup: LicenseGroup;
  licenseLabel: string;
  difficulty: Difficulty | null;
  difficultyLabel: string;
  docker: "あり" | "未確認" | "確認できていない";
  japanese: string;
  update: string;
  /** 人気・急成長ランキングでの順位（#40 と同じ計算）。無ければ未観測 */
  popularRank: number | null;
  growthRank: number | null;
};

export type FeatureMatrix = {
  saas: SaasId;
  features: Array<{ id: string; label: string }>;
  rows: Array<{ tool: Tool; states: FeatureState[] }>;
};

export type AlternativeDecision = {
  rows: DecisionRow[];
  matrix: FeatureMatrix | null;
  recommended: RecommendRow[] | null;
  /** データから言える「乗り換えを急がない方がよい」理由 */
  fromData: string[];
  /** データではなく編集方針にもとづく、一般的な目安 */
  general: string[];
};

export const GENERAL_NO_GO = [
  "SaaS側にしかない機能（外部サービスとの連携・サポート契約・監査対応など）に業務が依存している",
  "運用を担当できる人がいない、または止められない業務に使っている（更新・バックアップ・障害対応が自分の責任になる）",
  "いまのSaaSからデータを書き出せるか、移行先に取り込めるかが確認できていない",
];

const ACTIVE_DAYS = 180;

export function buildAlternativeDecision(
  slug: string,
  saasName: string,
  tools: Tool[],
  metas: ToolDiagnosisMeta[],
  standing: (id: string) => { popular: { rank: number } | null; growth: { rank: number } | null }
): AlternativeDecision {
  const metaById = new Map(metas.map((m) => [m.toolId, m]));
  const active = tools.filter((t) => !t.github_archived);

  const rows: DecisionRow[] = active.map((tool) => {
    const meta = metaById.get(tool.id);
    const group = licenseGroupOf(tool.license);
    const difficulty = meta ? getDifficulty(meta) : null;
    const st = standing(tool.id);
    return {
      tool,
      licenseGroup: group,
      licenseLabel: `${tool.license ?? "未確認"}（${LICENSE_GROUP_LABELS[group]}）`,
      difficulty,
      difficultyLabel: difficulty ? DIFFICULTY_LABELS[difficulty] : "未評価",
      docker: tool.docker_available === true ? "あり" : tool.docker_available === false ? "確認できていない" : "未確認",
      japanese: tool.ja_ui === true ? "画面あり" : tool.ja_docs === "official" ? "公式ドキュメントあり" : tool.ja_docs === "community" ? "有志のドキュメントあり" : "未確認",
      update: tool.freshness_days == null ? "未取得" : `${tool.freshness_days}日前`,
      popularRank: st.popular?.rank ?? null,
      growthRank: st.growth?.rank ?? null,
    };
  });

  // 機能データ（診断データ）がある5つのSaaSのみ
  const saasId = (SAAS_IDS as readonly string[]).includes(slug) ? (slug as SaasId) : null;
  let matrix: FeatureMatrix | null = null;
  let recommended: RecommendRow[] | null = null;
  if (saasId) {
    const defs = SAAS_FEATURES[saasId];
    const inGroup = active.filter((t) => metaById.get(t.id)?.saas === saasId);
    if (inGroup.length > 0) {
      matrix = {
        saas: saasId,
        features: defs.map((d) => ({ id: d.id, label: d.label })),
        rows: inGroup.map((tool) => ({ tool, states: defs.map((d) => metaById.get(tool.id)!.features[d.id]) })),
      };
      const rec = buildRecommended(inGroup, inGroup.map((t) => metaById.get(t.id)!));
      recommended = rec.bySaas[saasId] ?? null;
    }
  }

  const fromData: string[] = [];
  if (rows.length > 0 && rows.length <= 2) {
    fromData.push(`掲載している候補が${rows.length}件と少なく、${saasName}の機能を置き換えきれない可能性があります。`);
  }
  if (rows.length > 0 && rows.every((r) => r.licenseGroup !== "osi")) {
    fromData.push("掲載している候補は、すべてOSI承認ではない、または条件・混在のあるライセンスです。商用での使い方を、ライセンス本文で確認してから決めてください。");
  }
  if (rows.length > 0 && rows.every((r) => r.japanese === "未確認")) {
    fromData.push("日本語の画面・ドキュメントを確認できた候補がありません（「無い」という意味ではなく、未確認です）。英語で使えない場合は、確認が取れるまで慎重に。");
  }
  if (rows.length > 0 && rows.every((r) => (r.tool.freshness_days ?? Infinity) >= ACTIVE_DAYS)) {
    fromData.push(`直近${ACTIVE_DAYS}日以内に更新がある候補がありません。更新が止まったものを業務で使うのは避けたほうが安全です。`);
  }
  if (rows.length > 0 && rows.every((r) => r.difficulty === "hard")) {
    fromData.push("導入・運用の難易度が高い候補しかありません。運用できる人の確保が前提になります。");
  }
  if (rows.length > 0 && rows.every((r) => r.tool.docker_available !== true)) {
    fromData.push("Dockerでの導入に対応していると確認できた候補がありません。導入に手間がかかる可能性があります。");
  }

  return { rows, matrix, recommended, fromData, general: GENERAL_NO_GO };
}
