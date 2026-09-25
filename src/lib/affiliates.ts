/**
 * VPSアフィリエイトリンク設定
 *
 * 方針: 日本向けサイトのため、日本のアフィリエイト（A8.net等）に対応した
 * 国内VPSのみを掲載する。海外事業者は報酬の受け取りが現金/クレジットいずれでも
 * 国内ASPを経由できないため、対象外とする。
 *
 * affiliateUrl が空の場合は officialUrl にフォールバックする（=未提携でもリンクは壊れない）。
 * affiliateUrl・trackingImageUrl は実際に成果報酬を計測している値なので、
 * 1文字も変えずに転記すること。
 *
 * 配列順は「公開されている最低月額の安い順」。報酬額で並べ替えてはならない
 * （プライバシーポリシー第4節の約束:「紹介料の有無や金額によって変わることはありません」）。
 *
 * ★このビルド環境は外部サイトへのアクセスができないため、4社の公式料金ページで
 * 最低月額を確認できなかった。推測で並べることは方針違反のため、確認できるまでの
 * 暫定措置として id のアルファベット順（conoha → kagoya → sakura → xserver）で
 * 並べている。運営者が各社の最低月額を確認した時点で、安い順に並べ替えること。
 */

export interface AffiliateVps {
  /** 国内VPSのみ。id は affiliate-track.ts の Umami イベントにそのまま渡る */
  id: "sakura" | "kagoya" | "xserver" | "conoha";
  name: string;
  officialUrl: string;
  affiliateUrl: string; // 空文字の場合は officialUrl を使用（=未提携）
  trackingImageUrl?: string; // A8.net等の1x1計測img
  description: string;
  recommendedFor: string;
  ctaLabel: string;
}

/**
 * 国内VPS 4社。すべてA8.net経由のアフィリエイトプログラムを持つ。
 *
 * | id       | 事業者        | ASP      | 成果報酬の目安（公式ページ・2026-09-26確認）        |
 * |----------|---------------|----------|----------------------------------------------------|
 * | conoha   | ConoHa VPS    | A8.net   | 1,000円 〜 最大53,900円（プラン・期間別）            |
 * | kagoya   | KAGOYA CLOUD  | A8.net   | 1,000円（VPS）                                      |
 * | sakura   | さくらのVPS   | A8.net   | 512プラン585円 〜 32Gプラン24,000円（プラン別）      |
 * | xserver  | Xserver VPS   | A8.net   | 提携済み                                            |
 *
 * 出典:
 * - https://www.sakura.ad.jp/function/affiliate/
 * - https://www.kagoya.jp/partner/affili/
 * - https://vps.conoha.jp/affiliate/
 */
export const AFFILIATE_VPS: AffiliateVps[] = [
  {
    id: "conoha",
    name: "ConoHa VPS",
    officialUrl: "https://www.conoha.jp/vps/",
    affiliateUrl: "https://px.a8.net/svt/ejp?a8mat=4B3HQJ+LFMK2+50+4YQYYA",
    trackingImageUrl: "https://www17.a8.net/0.gif?a8mat=4B3HQJ+LFMK2+50+4YQYYA",
    description: "国内データセンター・時間課金。管理画面が分かりやすい。",
    recommendedFor: "国内サービスで安心して始めたい人",
    ctaLabel: "公式サイトで詳細を見る",
  },
  {
    id: "kagoya",
    name: "KAGOYA CLOUD VPS",
    officialUrl: "https://www.kagoya.jp/vps/",
    // TODO: A8.net の「KAGOYA CLOUD VPS」プログラムで発行したアフィリエイトURLを貼る
    affiliateUrl: "",
    description: "完全定額制で追加料金なし。国内データセンター・日本語サポート。",
    recommendedFor: "費用を固定したい人・国産VPSを試したい人",
    ctaLabel: "公式サイトで詳細を見る",
  },
  {
    id: "sakura",
    name: "さくらのVPS",
    officialUrl: "https://vps.sakura.ad.jp/",
    // TODO: A8.net の「さくらのVPS」プログラムで発行したアフィリエイトURLを貼る
    affiliateUrl: "",
    description: "root権限つきで自由度が高く、国内でも運用実績が長い。",
    recommendedFor: "はじめてroot権限のサーバーを触る人",
    ctaLabel: "公式サイトで詳細を見る",
  },
  {
    id: "xserver",
    name: "Xserver VPS",
    officialUrl: "https://vps.xserver.ne.jp/",
    affiliateUrl: "https://px.a8.net/svt/ejp?a8mat=4B3HQJ+2LH2R6+CO4+25ES2Q",
    trackingImageUrl: "https://www19.a8.net/0.gif?a8mat=4B3HQJ+2LH2R6+CO4+25ES2Q",
    description: "国内サポート・日本語管理画面。テンプレートからの導入も簡単。",
    recommendedFor: "日本語サポート重視の初心者",
    ctaLabel: "公式サイトで詳細を見る",
  },
];

/** 実際に使うリンクURLを取得（affiliateUrlがあればそちら、なければofficial） */
export function getAffiliateHref(v: AffiliateVps): string {
  return v.affiliateUrl.trim() ? v.affiliateUrl : v.officialUrl;
}

/** id から計測ピクセルURLを取得 */
export function getTrackingImageUrl(id: AffiliateVps["id"]): string | undefined {
  return AFFILIATE_VPS.find((v) => v.id === id)?.trackingImageUrl;
}

/** 外部アフィリエイトリンクに付与する rel 属性（Googleのsponsored要件） */
export const AFFILIATE_REL = "sponsored noopener noreferrer";
