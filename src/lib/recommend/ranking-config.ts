/**
 * 推薦エンジンの設定（初期値。変えるときはここだけを直す。/for-you/ の説明も自動で変わる）
 *
 * - 重みは利用者のタイプごと。合計100%。成長性はここに入れない（人気・急成長ランキングで別に使う）。
 * - 未確認の値は 0 や「安全」「危険」として扱わず、中立値で計算して「未確認」と表示する。
 */
import type { Emphasis, Profile, SignalKey } from "./types.ts";

export const PROFILE_WEIGHTS: Record<Profile, Record<SignalKey, number>> = {
  personal: { fit: 0.45, maintenance: 0.25, security: 0.1, ease: 0.2 },
  team: { fit: 0.35, maintenance: 0.3, security: 0.25, ease: 0.1 },
  beginner: { fit: 0.35, maintenance: 0.2, security: 0.1, ease: 0.35 },
};

export const PROFILE_LABELS: Record<Profile, string> = {
  personal: "個人・個人開発",
  team: "企業・チーム",
  beginner: "OSSは初めて",
};

export const SIGNAL_LABELS: Record<SignalKey, string> = {
  fit: "用途・機能への適合度",
  maintenance: "保守・開発の状況",
  security: "セキュリティ関連の確認情報",
  ease: "導入・運用のしやすさ",
};

/** 「重視する」を選んだ項目の重みに掛ける倍率（掛けたあと合計100%に戻す） */
export const EMPHASIS_MULTIPLIER = 1.6;
export const EMPHASIS_LABELS: Record<Emphasis, string> = {
  maintenance: "保守状況を重視",
  ease: "導入のしやすさを重視",
  security: "セキュリティ情報を重視",
};
const EMPHASIS_TO_SIGNAL: Record<Emphasis, SignalKey> = { maintenance: "maintenance", ease: "ease", security: "security" };

/** 未確認の項目に使う中立値（0〜100の中央） */
export const NEUTRAL = 50;

/** 用途の関係の強さ → 適合度の点 */
export const RELATION_POINTS = {
  /** 主な代替対象が、選んだSaaS */
  primary: 100,
  /** 編集部が、選んだSaaSの代わりにもなると指定 */
  also: 85,
  /** 選んだカテゴリに属する */
  category: 100,
  /** 選んだSaaSの代替と同じカテゴリ（類似のOSS） */
  similar: 50,
} as const;

/** 必要な機能を指定したとき、適合度のうち機能の確認率が占める割合 */
export const FEATURE_SHARE = 0.5;

/** セキュリティの確認情報の内訳（確認できたものだけで割り戻す） */
export const SECURITY_PARTS = { scorecard: 0.6, securityMd: 0.2, dependabot: 0.2 } as const;

/** 導入のしやすさの内訳 */
export const EASE_PARTS = { setup: 0.8, japanese: 0.2 } as const;
/** 診断データの導入難易度 → 点 */
export const DIFFICULTY_POINTS = { easy: 100, normal: 60, hard: 25 } as const;
/** 必要な技術レベルが利用者より1段高いごとに引く点 */
export const SKILL_GAP_PENALTY = 25;
/** 診断データが無いツールの導入（Dockerで動かす手段の確認） */
export const DOCKER_POINTS = { yes: 75, no: 35 } as const;

/** 候補の集め方 */
export const CANDIDATE_LIMITS = {
  /** 類似（同じカテゴリ）から加える最大件数 */
  similar: 12,
  /** 関連カテゴリの人気・急成長の上位から加える件数 */
  popular: 5,
  trending: 5,
} as const;

/** 多様性の調整（MMR） */
export const DIVERSITY = {
  /** 似た候補がすでに上にあるとき、最大で何点下げて並べるか */
  penalty: 15,
  /** 調整の対象にする範囲：最上位の適合度からこの点数以内 */
  margin: 20,
  /** 調整の対象にする適合度の下限（これ未満は多様性のために上げない） */
  minScore: 45,
  /** 類似度の内訳（合計して最大1） */
  sameOwner: 0.5,
  sameCategory: 0.15,
  sharedSaas: 0.1,
  topics: 0.25,
  /** 上位の表示件数。この中に、比較的小規模な候補を1件は入れる */
  topK: 6,
  /** 「比較的小規模」：人気の合計点がこれ未満 */
  smallPopularity: 50,
  /** 小規模な候補を入れる条件：上位K件の最下位との差がこの点数以内 */
  smallWithin: 8,
} as const;

/** 推薦理由・注意の閾値 */
export const EXPLAIN = {
  maintenanceGood: 70,
  maintenanceWeak: 30,
  scorecardGood: 7,
  scorecardLow: 4,
  /** 観測データがこれより古ければ注意を出す（日） */
  staleDays: 7,
} as const;

/** 利用者のタイプと「重視する」から、合計1の重みを作る */
export function resolveWeights(profile: Profile, emphasis: Emphasis[]): Record<SignalKey, number> {
  const base = { ...PROFILE_WEIGHTS[profile] };
  for (const e of new Set(emphasis)) base[EMPHASIS_TO_SIGNAL[e]] *= EMPHASIS_MULTIPLIER;
  const sum = Object.values(base).reduce((s, v) => s + v, 0);
  const out = {} as Record<SignalKey, number>;
  for (const k of Object.keys(base) as SignalKey[]) out[k] = Math.round((base[k] / sum) * 1000) / 1000;
  return out;
}
