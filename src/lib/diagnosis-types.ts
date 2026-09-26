/**
 * 「あなたに合うOSS診断」の型定義
 *
 * UIからもテスト（node:test）からも読み込む純粋な型定義ファイル。
 * ここには副作用もReact依存も置かない。
 */

/** MVP診断の対象SaaS（5種）。Q1の内部値。 */
export type SaasId = "notion" | "slack" | "zapier" | "trello" | "google-analytics";

export const SAAS_IDS: SaasId[] = ["notion", "slack", "zapier", "trello", "google-analytics"];

export const SAAS_LABELS: Record<SaasId, string> = {
  notion: "Notion",
  slack: "Slack",
  zapier: "Zapier",
  trello: "Trello",
  "google-analytics": "Google Analytics",
};

export type TeamSize = "solo" | "small" | "medium" | "large";
export const TEAM_SIZES: TeamSize[] = ["solo", "small", "medium", "large"];
export const TEAM_SIZE_LABELS: Record<TeamSize, string> = {
  solo: "自分だけ",
  small: "2〜10人",
  medium: "11〜50人",
  large: "51人以上",
};

/** セルフホストの技術レベル。0が最も低い（Q3の内部値）。 */
export type TechnicalLevel = 0 | 1 | 2 | 3;
export const TECHNICAL_LEVELS: TechnicalLevel[] = [0, 1, 2, 3];
export const TECHNICAL_LEVEL_LABELS: Record<TechnicalLevel, string> = {
  0: "よく分からない・やりたくない",
  1: "Dockerなら使える",
  2: "VPSやLinuxを管理できる",
  3: "本格的なインフラ運用ができる",
};

export type HostingPreference = "selfhost" | "cloud" | "either";
export const HOSTING_PREFERENCES: HostingPreference[] = ["selfhost", "cloud", "either"];
export const HOSTING_PREFERENCE_LABELS: Record<HostingPreference, string> = {
  selfhost: "自分のサーバーで管理したい",
  cloud: "クラウドでも問題ない",
  either: "どちらでもいい",
};

/** Q5「特に重視すること」。最大2個まで選択可能。 */
export type Strength =
  | "privacy"
  | "usability"
  | "cost"
  | "features"
  | "customization"
  | "active"
  | "security";

export const STRENGTHS: Strength[] = [
  "privacy",
  "usability",
  "cost",
  "features",
  "customization",
  "active",
  "security",
];

export const STRENGTH_LABELS: Record<Strength, string> = {
  privacy: "データを自分で管理したい",
  usability: "とにかく簡単に使いたい",
  cost: "費用を抑えたい",
  features: "高機能なものがいい",
  customization: "自由にカスタマイズしたい",
  active: "活発に開発されているもの",
  security: "セキュリティを重視",
};

export const MAX_STRENGTHS = 2;

/**
 * 機能の有無。boolean をそのまま使わず、3状態にする。
 * "unknown" は「確認できていない」であり、falseとして扱ってはいけない。
 */
export type FeatureState = boolean | "unknown";

/** SaaSごとの「必須機能かどうか確認する」候補一覧（Q6）。 */
export type FeatureDef = { id: string; label: string };

export const SAAS_FEATURES: Record<SaasId, FeatureDef[]> = {
  notion: [
    { id: "docs", label: "ドキュメント" },
    { id: "wiki", label: "Wiki" },
    { id: "database", label: "データベース" },
    { id: "realtimeCollaboration", label: "リアルタイム共同編集" },
    { id: "mobile", label: "モバイルアプリ" },
    { id: "api", label: "API" },
    { id: "fileAttachment", label: "ファイル添付" },
    { id: "permissions", label: "権限管理" },
  ],
  slack: [
    { id: "chat", label: "チャット" },
    { id: "threads", label: "スレッド" },
    { id: "fileSharing", label: "ファイル共有" },
    { id: "search", label: "検索" },
    { id: "notifications", label: "通知" },
    { id: "mobile", label: "モバイル" },
    { id: "sso", label: "SSO" },
    { id: "voiceVideo", label: "音声・ビデオ" },
  ],
  zapier: [
    { id: "visualWorkflow", label: "ノーコードでワークフロー作成" },
    { id: "scheduledTrigger", label: "スケジュール実行" },
    { id: "webhook", label: "Webhookでの連携" },
    { id: "apiIntegration", label: "外部サービスとのAPI連携" },
    { id: "conditionalBranch", label: "条件分岐" },
    { id: "errorHandling", label: "失敗時のリトライ・通知" },
    { id: "templates", label: "テンプレート・既製のワークフロー" },
  ],
  trello: [
    { id: "board", label: "ボード" },
    { id: "task", label: "タスク・カード" },
    { id: "assignee", label: "担当者の割り当て" },
    { id: "dueDate", label: "期限の設定" },
    { id: "comments", label: "コメント" },
    { id: "automation", label: "自動化" },
    { id: "mobile", label: "モバイル" },
  ],
  "google-analytics": [
    { id: "pageviews", label: "アクセス解析" },
    { id: "realtime", label: "リアルタイム表示" },
    { id: "events", label: "イベント計測" },
    { id: "conversion", label: "コンバージョン計測" },
    { id: "privacyFriendly", label: "プライバシーに配慮（Cookie不要など）" },
    { id: "selfhostable", label: "セルフホストできる" },
  ],
};

/** 「特になし」を選んだことを表す内部値（Q6）。 */
export const NO_REQUIRED_FEATURE = "__none__";

/**
 * 掲載ツール1件ぶんの診断用メタデータ。
 * ossalt.jp本体のツールデータ（stars・license・health_scoreなど）は
 * ここには複製しない。診断時に getTool(toolId) と突き合わせて使う。
 *
 * 値は公開されている製品ドキュメント・リポジトリの記載をもとに、
 * 2026年9月時点で手作業で確認したもの（scripts/fetch-github-api.mjs の
 * LICENSE_OVERRIDES と同じ考え方）。確認できなかった項目は
 * 推測で埋めず "unknown" のままにしている。
 */
export type ToolDiagnosisMeta = {
  toolId: string;
  saas: SaasId;
  /** 自分のサーバーで動かせるか。ossalt.jp掲載ツールは前提として自前で動かせるため、基本的にtrue。 */
  selfHost: boolean;
  /** 開発元が提供する有料のマネージドクラウド版があるか。 */
  managedCloud: boolean | "unknown";
  /** 自前で動かす場合に必要な技術レベルの目安（Q3と同じ尺度）。 */
  technicalLevel: TechnicalLevel;
  /** 動かし始めた後の運用の手間（0が最も軽い）。 */
  maintenanceLevel: 0 | 1 | 2 | 3;
  /** この人数規模で使われることが多い／向いている。 */
  teamSize: TeamSize[];
  /** このツールが強みとして知られていること。 */
  strengths: Strength[];
  /** SAAS_FEATURES[saas] のidをキーにした機能の有無。 */
  features: Record<string, FeatureState>;
};
