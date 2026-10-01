/**
 * 国内のSaaS（日本の事業者が提供する、または日本で広く使われているSaaS）の一覧
 *
 * /alternatives/japan/ のまとめページで使う。slug は /alternatives/<slug>/ と同じ。
 * 代替が掲載されていないslugは、ページ側で自動的に表示しない。
 */
export const JAPAN_SAAS_GROUPS: Array<{ label: string; slugs: string[] }> = [
  { label: "業務アプリ・プロジェクト管理", slugs: ["kintone", "backlog"] },
  { label: "会計・お金", slugs: ["freee", "moneyforward"] },
  { label: "人事・勤怠", slugs: ["smarthr", "king-of-time"] },
  { label: "契約・営業", slugs: ["cloudsign", "sansan"] },
  { label: "イベント・発信", slugs: ["peatix", "note"] },
  { label: "音声・文字起こし", slugs: ["notta", "voicepeak"] },
];
