/**
 * サイト全体の設定と表示文言（日本語ファースト）
 *
 * 文言はすべてここに集約する。英語版を出すときは MESSAGES.en を埋めて
 * `locale` を切り替えるだけで済むようにしている。
 */

export const SITE = {
  name: "ossalt.jp",
  nameJa: "オルタナ",
  tagline: "国産SaaSの代わりに、自前で動かす",
  description:
    "日本のチームのための、オープンソース代替ソフトウェア事典。SaaSの月額をやめて自分のサーバで動かすための、料金・ライセンス・セキュリティ・導入難易度をまとめて比較できます。",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://ossalt.jp",
  locale: "ja_JP",
  lang: "ja",
  twitter: "@ossaltjp",
  // データの更新元（GitHub Actions が書き換える）
  dataUpdatedAt: null as string | null,
  // お問い合わせ先。未設定でもビルドは通り、画面にはプレースホルダを出さず
  // 未設定なら該当行を表示しない（値は運営者が環境変数で設定する）。
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
  contactUrl: process.env.NEXT_PUBLIC_CONTACT_URL || null,
  // 運営者名・プライバシーポリシーの制定日。同様に未設定でもプレースホルダは出さない。
  operatorName: process.env.NEXT_PUBLIC_OPERATOR_NAME || null,
  privacyEffectiveDate: process.env.NEXT_PUBLIC_PRIVACY_EFFECTIVE_DATE || null,
} as const;

// アクセス解析（Umami Cloud）。このIDは公開値（全ページのHTMLに出力される）で、
// 秘匿情報ではない。既定値として持たせているのは、環境変数の設定漏れによって
// 計測が無言で止まる事故を避けるため（「計測できていないことに気づかない」を防ぐ）。
const UMAMI_DEFAULT_SITE_ID = "e1003fc4-1a2c-404c-abb9-ac669e5e8e94";

/**
 * 環境変数 NEXT_PUBLIC_UMAMI_SITE_ID で上書き・無効化できる。
 * "off" を渡すと計測そのものを無効化する（script タグを出力しない）。
 */
export const UMAMI_SITE_ID: string | null = (() => {
  const raw = process.env.NEXT_PUBLIC_UMAMI_SITE_ID;
  if (raw === "off") return null;
  return raw && raw.length > 0 ? raw : UMAMI_DEFAULT_SITE_ID;
})();

export const UMAMI_SCRIPT_URL = "https://cloud.umami.is/script.js";

/** サイト内ナビゲーション */
export const NAV = [
  { href: "/tools/", label: "ツール一覧" },
  { href: "/categories/", label: "カテゴリ" },
  { href: "/alternatives/", label: "SaaSから探す" },
  { href: "/guide/", label: "選び方" },
  { href: "/blog/", label: "ブログ" },
] as const;

export const MESSAGES = {
  ja: {
    "nav.tools": "ツール一覧",
    "nav.categories": "カテゴリ",
    "nav.alternatives": "SaaSから探す",
    "nav.guide": "選び方",

    "home.eyebrow": "オープンソース代替ソフト事典",
    "home.h1a": "そのSaaS、",
    "home.h1b": "自分のサーバで動かせる。",
    "home.lede":
      "月額を払い続ける代わりに、自前で運用するという選択。{n}件のオープンソースソフトを、料金・ライセンス・セキュリティ・導入のしやすさで横並びに比較できます。",
    "home.cta.browse": "ツールを探す",
    "home.cta.guide": "選び方を見る",

    "stats.tools": "収録ツール",
    "stats.categories": "カテゴリ",
    "stats.alternatives": "代替対象SaaS",
    "stats.scored": "セキュリティ評価済み",

    "search.placeholder": "ツール名・代替したいSaaSで検索（例: Notion, Slack, n8n）",
    "search.label": "検索",
    "search.empty": "条件に合うツールが見つかりませんでした。",
    "search.emptyHint": "検索語を短くするか、カテゴリの絞り込みを解除してみてください。",
    "search.count": "{n}件",
    "search.clear": "条件を解除",

    "filter.category": "カテゴリ",
    "filter.all": "すべて",
    "filter.license": "ライセンス",
    "filter.selfhost": "Docker対応",
    "filter.japanese": "日本語の画面・資料あり",
    "filter.sort": "並び順",
    "sort.health": "健全度が高い順",
    "sort.stars": "スターが多い順",
    "sort.recent": "最近更新された順",
    "sort.name": "名前順",

    "card.alternativeTo": "代替対象",
    "card.selfhostable": "Docker対応",
    "card.selfhostUnknown": "未確認",
    "card.viewDetail": "詳細を見る",

    "metric.stars": "スター",
    "metric.forks": "フォーク",
    "metric.contributors": "コントリビュータ",
    "metric.watchers": "ウォッチャー",
    "metric.freshness": "更新の新しさ",
    "metric.license": "ライセンス",
    "metric.language": "主な言語",
    "metric.lastCommit": "最終コミット",
    "metric.created": "公開開始",
    "metric.health": "健全度",
    "metric.security": "セキュリティ",
    "metric.docker": "Docker対応",
    "metric.jaDocs": "日本語ドキュメント",
    "metric.jaUi": "画面の日本語化",

    "health.title": "健全度スコア",
    "health.explain":
      "スター・フォーク・コントリビュータ・ウォッチャー・更新の新しさの5項目から算出した、プロジェクトの勢いの目安です。上から5つの目盛りが、その5項目を表します。",
    "health.term.stars": "スター × 0.25",
    "health.term.forks": "フォーク × 0.5",
    "health.term.contributors": "コントリビュータ × 0.5",
    "health.term.watchers": "ウォッチャー × 0.25",
    "health.term.freshness": "更新の新しさ（最大−45）",
    "health.archived": "このリポジトリはアーカイブされています（開発は終了しています）",
    "health.formulaNote":
      "スターなどの数値はGitHubの公開情報、更新日は最終コミット日をもとにしています。減点は最終コミットから90日で頭打ち（最大 −45点）になります。数値が大きいほど活発ですが、規模の大きいプロジェクトほど有利になる指標です。",

    "security.rated": "OpenSSF Scorecard {score} / 10",
    "security.unrated": "未評価",
    "security.unratedReason":
      "OpenSSF Scorecard によるスキャンがまだ実施されていないため、スコアはありません。",
    "security.unratedCaution":
      "スコアが無いことを「安全」とも「危険」とも判断していません。導入を検討する際は、リポジトリの SECURITY.md やリリースの頻度もあわせてご確認ください。",
    "security.what":
      "OpenSSF Scorecard は、オープンソースプロジェクトのセキュリティ対策を第三者が機械的に採点する仕組みです。0〜10で、7.5以上が「良好」の目安です。",
    "security.checks": "主なチェック項目",
    "security.scanDate": "{date} 時点",
    "security.signals": "確認できた項目",
    "security.securityMd": "脆弱性の報告窓口（SECURITY.md）",
    "security.dependabot": "依存関係の自動更新（Dependabot）",
    "security.releases": "直近のリリース",
    "security.advisories": "既知の脆弱性（公開アドバイザリ）",
    "security.securityMdMissing": "報告窓口が用意されていません",
    "security.archivedWarning": "リポジトリがアーカイブされています。脆弱性が見つかっても修正されません。",
    "security.staleWarning": "最終コミットから{days}日経過しています（1年以上）。脆弱性の修正が行われない可能性があります。",

    "detail.overview": "概要",
    "detail.spec": "スペック",
    "detail.sameCategory": "同じカテゴリのツール",
    "detail.alternativesTo": "{competitor} の代替候補",
    "detail.official": "公式サイト",
    "detail.github": "GitHubリポジトリ",
    "detail.compare": "他の候補と比較する",
    "detail.notFound": "ツールが見つかりません",

    "alt.title": "SaaSから探す",
    "alt.lede":
      "使っている（あるいは検討している）SaaSを選ぶと、そのオープンソース代替候補を一覧できます。",
    "alt.h1": "{competitor} のオープンソース代替",
    "alt.ledeOne":
      "{competitor} の代わりに自前で動かせるオープンソースソフトは{n}件あります。",
    "alt.compareNote":
      "乗り換えを検討するときは、機能の一致度より「移行コスト」と「運用コスト」で見るほうが失敗しにくいです。下の表でライセンスとDocker対応を確認してください。",
    "alt.none": "このSaaSの代替候補はまだ登録されていません。",

    "cat.title": "カテゴリから探す",
    "cat.lede": "用途から探したいときはこちら。",
    "cat.h1": "{category} のオープンソース代替",
    "cat.count": "{n}件",
    "cat.empty": "このカテゴリにはまだツールがありません。",

    "guide.title": "自前で動かすソフトの選び方",
    "guide.lede":
      "オープンソースなら何でも安全、ということはありません。乗り換えで後悔しないための確認項目をまとめました。",

    "blog.title": "ブログ",
    "blog.lede": "セルフホストへの乗り換えを検討するときに役立つ、比較・実践情報をまとめています。",
    "blog.empty": "まだ記事がありません。",
    "blog.relatedTools": "関連ツール",
    "blog.published": "公開日",
    "blog.updatedNote": "更新日",

    "footer.dataNote":
      "掲載データはGitHubの公開情報とOpenSSF Scorecardから自動取得しています。",
    "footer.disclaimer":
      "各ツールのライセンス・提供条件は変更されることがあります。導入前に必ず公式サイトで最新の条件をご確認ください。",
    "footer.logoNotice":
      "掲載しているロゴマークはGitHub公開のプロフィール画像を表示しており、各ロゴの商標権はそれぞれの権利者に帰属します。",
    "footer.operator": "運営",
    "footer.terms": "利用規約",
    "footer.disclaimerPage": "免責事項",

    "contact.title": "お問い合わせ",
    "contact.lede":
      "掲載情報の訂正、ツールの追加リクエスト、広告・スポンサーに関するお問い合わせなどはこちらから。",

    "about.title": "このサイトについて",
    "privacy.title": "プライバシーポリシー",

    "common.updated": "最終更新",
    "common.backHome": "トップへ戻る",
    "common.required": "必須",
    "common.source": "出典",
    "common.readMore": "続きを読む",
  },
  en: {
    // 英語版を出すときはここを埋める（現状は日本語のみ表示）
  },
} as const;

export type Locale = keyof typeof MESSAGES;
export const DEFAULT_LOCALE: Locale = "ja";

/** 文言の取得。未定義ならキーをそのまま返す（開発時に気づけるように） */
export function t(
  key: keyof (typeof MESSAGES)["ja"],
  vars?: Record<string, string | number>,
  locale: Locale = DEFAULT_LOCALE
): string {
  const dict = MESSAGES[locale] as Record<string, string | undefined>;
  const fallback = MESSAGES.ja as Record<string, string>;
  let s = dict[key] ?? fallback[key] ?? String(key);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}
