/**
 * 診断用データと ossalt.jp 本体データ（stars・health_score等）を突き合わせる。
 * fsを読む lib/data.ts に依存するため、サーバー専用（クライアントコンポーネントから直接importしない）。
 */
import { getTools, getMeta } from "./data";
import { TOOL_DIAGNOSIS } from "./diagnosis-data";
import type { HealthPercentiles, DiagnosisToolInput } from "./diagnosis";
import type { SaasId } from "./diagnosis-types";

/** 診断対象（TOOL_DIAGNOSISに登録済み）のツールをすべて、本体データと突き合わせて返す。 */
export function getAllDiagnosisToolInputs(): DiagnosisToolInput[] {
  const byId = new Map(getTools().map((t) => [t.id, t]));
  const out: DiagnosisToolInput[] = [];
  for (const meta of Object.values(TOOL_DIAGNOSIS)) {
    const tool = byId.get(meta.toolId);
    if (!tool) continue; // データ側の不整合はテストで検出する。ここでは黙って除外する
    out.push({ meta, name: tool.name, healthScore: tool.health_score });
  }
  return out;
}

export function getDiagnosisToolInputsForSaas(saas: SaasId): DiagnosisToolInput[] {
  return getAllDiagnosisToolInputs().filter((t) => t.meta.saas === saas);
}

export function getHealthPercentiles(): HealthPercentiles | null {
  const h = getMeta().health;
  if (!h) return null;
  return { p25: h.p25, p50: h.p50, p75: h.p75 };
}
