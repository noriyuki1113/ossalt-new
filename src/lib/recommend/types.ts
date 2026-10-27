/**
 * 推薦エンジン（Ranking Engine v2 / OSSALT For You）の型
 *
 * クライアント（/for-you/）とサーバー（ビルド時）の両方から読むため、
 * ここには型だけを置き、fs や React には依存しない。
 */
import type { LicenseClass, LicenseGroup } from "../compare.ts";
import type { FeatureState, SaasId, Strength, TechnicalLevel } from "../diagnosis-types.ts";

/** 推薦に使う、ツール1件ぶんの軽量なデータ（public/data/tools.json から作る。値の意味は Tool と同じ） */
export type RecTool = {
  id: string;
  name: string;
  /** 一覧用の短い説明（日本語が無ければ英語）。null可 */
  desc: string | null;
  category: string;
  /** 代替対象SaaSのslug。先頭が主な代替対象（primary_competitor）、以降は編集部の追加指定 */
  competitors: string[];
  /** GitHubの所有者（組織・個人）。多様性の判定に使う。取れなければ null */
  owner: string | null;
  topics: string[];
  stars: number | null;
  license: string | null;
  licenseClass: LicenseClass;
  licenseGroup: LicenseGroup;
  docker: boolean | null;
  jaUi: boolean | null;
  jaDocs: "official" | "community" | "none" | null;
  freshnessDays: number | null;
  releases12mo: number | null;
  scorecard: number | null;
  securityMd: boolean | null;
  dependabot: boolean | null;
  /** 公式の保守停止などの警告（OSSALTが原文を確認したもの）がある */
  maintenanceNotice: boolean;
  /** 人気ランキングの合計点（0〜100）。未観測は null */
  popularity: number | null;
  /** 急成長ランキングの合計点（0〜100）。比較できる実測が無ければ null */
  growth: number | null;
  /** 直近30日のStar純増（実測）。無ければ null */
  gain30: number | null;
  /** 診断データ（5つのSaaSの代替だけ）。無ければ省略 */
  diag?: {
    saas: SaasId;
    selfHost: boolean;
    technicalLevel: TechnicalLevel;
    maintenanceLevel: 0 | 1 | 2 | 3;
    strengths: Strength[];
    features: Record<string, FeatureState>;
  };
};

export type RecCatalog = {
  /** tools.json の取得日時（meta.stars_as_of）。不明なら null */
  observedAt: string | null;
  builtAt: string;
  tools: RecTool[];
  /** 代替対象SaaSのslug → 表示名 */
  saas: Record<string, string>;
  /** カテゴリのslug → 表示名 */
  categories: Record<string, string>;
  /** 存在する比較ページのslug */
  compareSlugs: string[];
};

export type Profile = "personal" | "team" | "beginner";
export type LicensePolicy = "any" | "osi" | "permissive" | "no-network-copyleft";
export type Emphasis = "maintenance" | "ease" | "security";

/** 利用者の条件（URLのクエリから復元する） */
export type RecQuery = {
  purpose: { kind: "saas"; slug: string } | { kind: "category"; slug: string };
  profile: Profile;
  skill: TechnicalLevel;
  license: LicensePolicy;
  /** 自分のサーバーで動かすことが必須 */
  selfHost: boolean;
  needDocker: boolean;
  needJa: boolean;
  commercial: boolean;
  emphasis: Emphasis[];
  /** 必要な機能（診断データのあるSaaSのときだけ有効） */
  features: string[];
};

export type SignalKey = "fit" | "maintenance" | "security" | "ease";

/** 1つの評価項目。value が null の項目は未確認（中立値で計算し、known=false） */
export type Signal = {
  key: SignalKey;
  label: string;
  /** 0〜100。未確認なら null */
  value: number | null;
  /** 計算に使った値（未確認なら中立値） */
  used: number;
  weight: number;
  points: number;
  known: boolean;
  /** 根拠の説明（数値つき） */
  basis: string;
};

export type CandidateSource = "saas" | "also" | "category" | "similar" | "diagnosis" | "popular" | "trending";

export type Candidate = { tool: RecTool; sources: CandidateSource[] };

export type Exclusion = { tool: RecTool; reason: string; rule: string };

export type ScoredCandidate = Candidate & {
  signals: Signal[];
  /** 適合度（重み付きの合計、0〜100） */
  score: number;
  /** 根拠を確認できた項目の重みの合計（0〜100%） */
  evidence: number;
  /** 適格性の判定で付いた注意（除外はしないが、確認が必要なもの） */
  flags: string[];
};

export type RankedItem = ScoredCandidate & {
  rank: number;
  /** 多様性の調整で付いた説明（あれば） */
  diversityNote: string | null;
  reasons: string[];
  cautions: string[];
};

export type RecResult = {
  items: RankedItem[];
  excluded: Exclusion[];
  /** 正規化した重み（合計1） */
  weights: Record<SignalKey, number>;
  candidateCount: number;
};
