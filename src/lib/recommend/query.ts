/**
 * 利用者の条件（RecQuery）と URL のクエリの相互変換、OSS診断の回答からの変換
 *
 * URL の値はすべて検証し、知らない値は既定値に戻す（壊れたURLでも安全に表示する）。
 * 個人を特定する情報は含めない（条件の選択肢だけ）。
 */
import type { DiagnosisAnswers } from "../diagnosis.ts";
import { SAAS_FEATURES, type SaasId, type TechnicalLevel } from "../diagnosis-types.ts";
import type { Emphasis, LicensePolicy, Profile, RecQuery } from "./types.ts";

const PROFILES: Profile[] = ["personal", "team", "beginner"];
const LICENSES: LicensePolicy[] = ["any", "osi", "permissive", "no-network-copyleft"];
const EMPHASES: Emphasis[] = ["maintenance", "ease", "security"];
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,60}$/;
const FEATURE_RE = /^[A-Za-z][A-Za-z0-9]{0,40}$/;

export const DEFAULT_QUERY: Omit<RecQuery, "purpose"> = {
  profile: "personal",
  skill: 1,
  license: "any",
  selfHost: true,
  needDocker: false,
  needJa: false,
  commercial: false,
  emphasis: [],
  features: [],
};

const list = (v: string | null) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);

/**
 * 有効な用途（SaaS・カテゴリ）の一覧と照らして復元する。用途が無い・不明なら null。
 */
export function decodeQuery(
  params: URLSearchParams,
  valid: { saas: Set<string>; categories: Set<string> }
): RecQuery | null {
  const saas = params.get("saas");
  const cat = params.get("cat");
  let purpose: RecQuery["purpose"] | null = null;
  if (saas && SLUG_RE.test(saas) && valid.saas.has(saas)) purpose = { kind: "saas", slug: saas };
  else if (cat && SLUG_RE.test(cat) && valid.categories.has(cat)) purpose = { kind: "category", slug: cat };
  if (!purpose) return null;

  const profile = params.get("profile");
  const skill = Number(params.get("skill"));
  const license = params.get("license");
  const bool = (k: string, d: boolean) => (params.get(k) === "1" ? true : params.get(k) === "0" ? false : d);
  return {
    purpose,
    profile: PROFILES.includes(profile as Profile) ? (profile as Profile) : DEFAULT_QUERY.profile,
    skill: (Number.isInteger(skill) && skill >= 0 && skill <= 3 && params.has("skill") ? skill : DEFAULT_QUERY.skill) as TechnicalLevel,
    license: LICENSES.includes(license as LicensePolicy) ? (license as LicensePolicy) : DEFAULT_QUERY.license,
    selfHost: bool("selfhost", DEFAULT_QUERY.selfHost),
    needDocker: bool("docker", false),
    needJa: bool("ja", false),
    commercial: bool("commercial", false),
    emphasis: [...new Set(list(params.get("focus")))].filter((e): e is Emphasis => EMPHASES.includes(e as Emphasis)),
    // 必要な機能は、診断データのあるSaaSの機能の id だけを受け付ける
    features: purpose.kind === "saas" && purpose.slug in SAAS_FEATURES
      ? [...new Set(list(params.get("features")))].filter((f) => FEATURE_RE.test(f) && SAAS_FEATURES[purpose.slug as SaasId].some((d) => d.id === f))
      : [],
  };
}

export function encodeQuery(q: RecQuery): URLSearchParams {
  const p = new URLSearchParams();
  p.set(q.purpose.kind === "saas" ? "saas" : "cat", q.purpose.slug);
  p.set("profile", q.profile);
  p.set("skill", String(q.skill));
  if (q.license !== "any") p.set("license", q.license);
  if (!q.selfHost) p.set("selfhost", "0");
  if (q.needDocker) p.set("docker", "1");
  if (q.needJa) p.set("ja", "1");
  if (q.commercial) p.set("commercial", "1");
  if (q.emphasis.length) p.set("focus", q.emphasis.join(","));
  if (q.purpose.kind === "saas" && q.features.length) p.set("features", q.features.join(","));
  return p;
}

/**
 * OSS診断の回答 → For You の条件。診断で選んだことだけを引き継ぐ（推測で条件を足さない）。
 * - 人数「自分だけ」→ 個人、それ以外 → 企業・チーム。技術レベル0（よく分からない）→ OSS初心者
 * - 重視：活発な開発 → 保守、簡単に使いたい → 導入、セキュリティ → セキュリティ
 * - 利用の条件：日本語 → 日本語が必須、商用 → 商用利用（ライセンスの注意を出す）
 */
export function queryFromDiagnosis(a: DiagnosisAnswers): RecQuery {
  const emphasis: Emphasis[] = [];
  if (a.strengths.includes("active")) emphasis.push("maintenance");
  if (a.strengths.includes("usability")) emphasis.push("ease");
  if (a.strengths.includes("security")) emphasis.push("security");
  const conditions = a.conditions ?? [];
  return {
    purpose: { kind: "saas", slug: a.saas },
    profile: a.technicalLevel === 0 ? "beginner" : a.teamSize === "solo" ? "personal" : "team",
    skill: a.technicalLevel,
    license: "any",
    selfHost: a.hosting === "selfhost",
    needDocker: false,
    needJa: conditions.includes("ja"),
    commercial: conditions.includes("commercial"),
    emphasis,
    features: [...a.requiredFeatures],
  };
}
