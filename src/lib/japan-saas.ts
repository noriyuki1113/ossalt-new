/**
 * 国内のSaaS（日本の事業者が提供する、または日本で広く使われているSaaS）の一覧
 *
 * /alternatives/japan/ のまとめページで使う。slug は /alternatives/<slug>/ と同じ。
 * 代替が掲載されていないslugは、ページ側で自動的に表示しない。
 */
export const JAPAN_SAAS_GROUPS: Array<{ label: string; slugs: string[] }> = [
  { label: "チャット・業務アプリ", slugs: ["chatwork", "kintone"] },
  { label: "タスク・プロジェクト管理", slugs: ["backlog", "jooto"] },
  { label: "会計・請求書・お金", slugs: ["freee", "misoca", "moneyforward"] },
  { label: "人事・勤怠", slugs: ["smarthr", "king-of-time"] },
  { label: "契約・営業・問い合わせ", slugs: ["cloudsign", "sansan", "mail-dealer", "formrun"] },
  { label: "日程調整・イベント", slugs: ["chouseisan", "timerex", "peatix"] },
  { label: "ネットショップ・発信", slugs: ["base", "note"] },
  { label: "音声・文字起こし", slugs: ["notta", "voicepeak"] },
];
