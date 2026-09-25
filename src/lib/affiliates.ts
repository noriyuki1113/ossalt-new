/**
 * VPSアフィリエイトリンク設定
 * affiliateUrlが空の場合はofficialUrlにフォールバックする。
 * 後からアフィリエイトURLを差し替える際は、affiliateUrlのみ更新すればよい。
 *
 * 移植元: noriyuki1113/ossalt の src/config/affiliateLinks.ts
 * affiliateUrl・trackingImageUrlは実際に成果報酬を計測している値なので、
 * 1文字も変えずに転記している。
 */

export interface AffiliateVps {
  id: "digitalocean" | "vultr" | "xserver" | "conoha";
  name: string;
  officialUrl: string;
  affiliateUrl: string; // 空文字の場合は officialUrl を使用（=未提携）
  trackingImageUrl?: string; // A8.net等の1x1計測img
  description: string;
  recommendedFor: string;
  ctaLabel: string;
}

export const AFFILIATE_VPS: AffiliateVps[] = [
  {
    id: "digitalocean",
    name: "DigitalOcean",
    officialUrl: "https://www.digitalocean.com/",
    affiliateUrl: "",
    description: "ドキュメントが豊富でAPI・CLIも充実。Docker前提のOSS運用に強い。",
    recommendedFor: "OSSを触り慣れた開発者向け",
    ctaLabel: "公式サイトで詳細を見る",
  },
  {
    id: "vultr",
    name: "Vultr",
    officialUrl: "https://www.vultr.com/",
    affiliateUrl: "",
    description: "海外リージョンが豊富で時間課金。検証用にも本番にも使いやすい。",
    recommendedFor: "海外リージョン・時間課金で試したい人",
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
