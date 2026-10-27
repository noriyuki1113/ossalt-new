/**
 * Tool（public/data/tools.json）→ 推薦用の軽量なデータ（RecTool）への変換（純粋関数）
 *
 * ビルド時に1回だけ実行し、/for-you/catalog.json として配信する。GitHub API は呼ばない。
 */
import { classifyLicense, licenseGroupOf } from "../compare.ts";
import { buildGrowth, buildPopularity } from "../rankings.ts";
import type { ToolDiagnosisMeta } from "../diagnosis-types.ts";
import { slugifyCompetitor, type Tool } from "../tools.ts";
import type { RecTool } from "./types.ts";

export function ownerOf(githubUrl: string | null | undefined): string | null {
  const m = /github\.com\/([^/]+)\//i.exec(githubUrl ?? "");
  return m ? m[1].toLowerCase() : null;
}

export function toRecTools(tools: Tool[], diagnosis: Record<string, ToolDiagnosisMeta>): RecTool[] {
  const active = tools.filter((t) => !t.github_archived);
  const pop = new Map(buildPopularity(active).rows.map((r) => [r.tool.id, r.score]));
  const gro = new Map(buildGrowth(active).rows.map((r) => [r.tool.id, r.score]));
  return active.map((t): RecTool => {
    const d = diagnosis[t.id];
    const desc = (t.description_ja || t.description_en || "").trim();
    const competitors = [t.primary_competitor, ...(t.also_competitors ?? [])].map(slugifyCompetitor).filter(Boolean);
    return {
      id: t.id,
      name: t.name,
      desc: desc ? (desc.length > 90 ? desc.slice(0, 89) + "…" : desc) : null,
      category: t.category,
      competitors: [...new Set(competitors)],
      owner: ownerOf(t.github_url),
      topics: (t.topics ?? []).slice(0, 8),
      stars: t.stars_num,
      license: t.license,
      licenseClass: classifyLicense(t.license),
      licenseGroup: licenseGroupOf(t.license),
      docker: t.docker_available,
      jaUi: t.ja_ui,
      jaDocs: t.ja_docs,
      freshnessDays: t.freshness_days,
      releases12mo: t.releases_12mo,
      scorecard: t.scorecard_score,
      securityMd: t.security_md,
      dependabot: t.dependabot_configured,
      maintenanceNotice: !!t.maintenance_notice,
      popularity: pop.get(t.id) ?? null,
      growth: gro.get(t.id) ?? null,
      gain30: t.star_gain && t.star_gain.days >= 25 ? t.star_gain.gain : null,
      ...(d ? { diag: { saas: d.saas, selfHost: d.selfHost, technicalLevel: d.technicalLevel, maintenanceLevel: d.maintenanceLevel, strengths: d.strengths, features: d.features } } : {}),
    };
  });
}
