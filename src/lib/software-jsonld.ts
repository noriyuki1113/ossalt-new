/**
 * ツール詳細ページの SoftwareApplication の構造化データ（純粋関数）。
 *
 * 根拠：Google検索セントラル「Software app（SoftwareApplication）」（最終更新 2026-09-08、確認日 2026-10-31）
 *   - 必須：name、offers.price（無料なら 0）、aggregateRating か review のどちらか（リッチリザルトの条件）
 *   - 推奨：applicationCategory（**対応する種類の値**）、operatingSystem
 *   - 構造化データは、ページの内容と一致させる（一般の構造化データのガイドライン）
 *
 * OSSALT の方針：
 *   - 実在しない Review・Rating は付けない（OpenSSF Scorecard 等は、利用者のレビューではない）→ リッチリザルトの条件は満たさない。それで良い
 *   - 価格（offers）は、**無料で入手できると確認できたときだけ**。確認できなければ付けない（推測で補わない）
 *   - 無料のセルフホスト版と、有料のホスティング版・企業向けは区別する（有料の選択肢が確認できるときは、その存在を説明に書く。金額は書かない）
 *   - OSI承認でないライセンス（ソース公開型）は、無料で使える条件が限られるため、価格を付けない
 */
import type { Tool } from "./tools.ts";
import { licenseGroupOf } from "./compare.ts";

/** Googleが applicationCategory に認める値（2026-10-31 に公式ガイドで確認） */
export const GOOGLE_APP_CATEGORIES = [
  "GameApplication", "SocialNetworkingApplication", "TravelApplication", "ShoppingApplication", "SportsApplication", "LifestyleApplication",
  "BusinessApplication", "DesignApplication", "DeveloperApplication", "DriverApplication", "EducationalApplication", "HealthApplication",
  "FinanceApplication", "SecurityApplication", "BrowserApplication", "CommunicationApplication", "DesktopEnhancementApplication",
  "EntertainmentApplication", "MultimediaApplication", "HomeApplication", "UtilitiesApplication", "ReferenceApplication",
] as const;
export type GoogleAppCategory = (typeof GOOGLE_APP_CATEGORIES)[number];

/**
 * OSSALT のカテゴリ → Google の種類（仮説：最も近いもの。代表の5ページの分だけ検証済み。ほかは承認後に確認する）
 * 該当が曖昧なカテゴリは、無理に当てはめず null（その場合は applicationCategory を出さない）
 */
export const CATEGORY_TO_GOOGLE: Record<string, GoogleAppCategory | null> = {
  "note-docs": "BusinessApplication", communication: "CommunicationApplication", project: "BusinessApplication",
  database: "DeveloperApplication", cms: "BusinessApplication", analytics: "BusinessApplication", observability: "DeveloperApplication",
  security: "SecurityApplication", devtools: "DeveloperApplication", automation: "BusinessApplication", files: "UtilitiesApplication",
  design: "DesignApplication", nocode: "DeveloperApplication", marketing: "BusinessApplication", support: "BusinessApplication",
  scheduling: "BusinessApplication", crm: "BusinessApplication", documents: "BusinessApplication", office: "BusinessApplication",
  email: "CommunicationApplication", hr: "BusinessApplication", accounting: "FinanceApplication", legal: "BusinessApplication",
  backup: "UtilitiesApplication", ai: "DeveloperApplication", video: "MultimediaApplication", ecommerce: "BusinessApplication",
  translation: "UtilitiesApplication", seo: "BusinessApplication",
};

/** 確認済みの価格の事実（data-source/pricing-facts.json）。無ければ、価格は出さない */
export type PricingFact = {
  /** ソフトウェアを、支払いなしで入手して使える（セルフホスト版・アプリ） */
  free_to_obtain: boolean;
  /** 有料の選択肢（ホスティング版・企業向けなど）が、公式に案内されている */
  paid_options: boolean;
  /** official-statement＝公式サイトの記載／license＝OSI承認のライセンス（LICENSE）から */
  basis: "official-statement" | "license";
  source_url: string;
  checked_at: string;
};

export type SoftwareJsonLdInput = {
  tool: Pick<Tool, "id" | "name" | "url" | "github_url" | "description_ja" | "license" | "category">;
  siteName: string;
  siteUrl: string;
  pricing?: PricingFact | null;
};

const isHttps = (v: unknown): v is string => { try { return typeof v === "string" && new URL(v).protocol === "https:"; } catch { return false; } };

/** 無料で入手できると「確認できた」ときだけ、offers を返す。それ以外は null（出さない） */
export function offersFor(license: string | null | undefined, pricing: PricingFact | null | undefined) {
  if (!pricing || pricing.free_to_obtain !== true) return null;
  if (!isHttps(pricing.source_url) || !/^\d{4}-\d{2}-\d{2}$/.test(pricing.checked_at)) return null;
  // OSI承認でないライセンス（ソース公開型・複数のライセンスの混在・未確認）は、無料で使える条件が限られるため、出さない
  if (licenseGroupOf(license ?? null) !== "osi") return null;
  return {
    "@type": "Offer",
    price: 0,
    priceCurrency: "JPY",
    description: pricing.paid_options
      ? "ソフトウェア（セルフホスト版・アプリ）は無料で入手できます。公式のホスティング版や企業向けの有料の選択肢は、別に案内されています。"
      : "ソフトウェア（セルフホスト版）は無料で入手できます。",
  };
}

export function buildSoftwareApplicationJsonLd({ tool, siteName, siteUrl, pricing }: SoftwareJsonLdInput): Record<string, unknown> {
  const category = CATEGORY_TO_GOOGLE[tool.category] ?? null;
  const offers = offersFor(tool.license, pricing);
  const out: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.name,
  };
  if (isHttps(tool.url)) out.url = tool.url; // 空・不正な URL は出さない
  if (category) out.applicationCategory = category;
  if (tool.description_ja) out.description = tool.description_ja;
  if (tool.license) out.license = tool.license;
  if (isHttps(tool.github_url)) out.sameAs = tool.github_url;
  if (offers) out.offers = offers;
  out.isPartOf = { "@type": "WebSite", name: siteName, url: siteUrl };
  return out;
}

export type JsonLdCheck = { problems: string[]; notes: string[]; richResultEligible: boolean };

/** Googleのガイドラインと、OSSALTの方針に照らした検査 */
export function checkSoftwareApplication(ld: Record<string, unknown>): JsonLdCheck {
  const problems: string[] = [];
  const notes: string[] = [];
  if (ld["@type"] !== "SoftwareApplication") problems.push("@type が SoftwareApplication でない");
  if (typeof ld.name !== "string" || !ld.name.trim()) problems.push("name（必須）が無い");
  if ("review" in ld || "aggregateRating" in ld) problems.push("review・aggregateRating は付けない方針（実在しないレビューを作らない）");
  if ("url" in ld && !isHttps(ld.url)) problems.push("url が https の URL でない");
  if ("applicationCategory" in ld && !(GOOGLE_APP_CATEGORIES as readonly string[]).includes(String(ld.applicationCategory))) problems.push(`applicationCategory が、Googleの対応する値でない：${String(ld.applicationCategory)}`);
  const offers = ld.offers as Record<string, unknown> | undefined;
  if (offers) {
    const price = offers.price;
    const asNumber = typeof price === "string" && price.trim() !== "" ? Number(price) : price;
    if (typeof asNumber !== "number" || !Number.isFinite(asNumber) || asNumber < 0) problems.push("offers.price が、0以上の数として読めない");
    else if (typeof price === "string") notes.push("offers.price が文字列（Googleの例は数値。文字列も読まれることが多いが、例に合わせて数値にする）");
    if (typeof asNumber === "number" && asNumber > 0 && typeof offers.priceCurrency !== "string") problems.push("価格が0より大きいのに、priceCurrency が無い");
  } else notes.push("offers なし（無料と確認できていないため。価格は推測しない）");
  // リッチリザルトの条件：offers.price ＋ （aggregateRating か review）。OSSALTは評価を付けないため、条件を満たさない（方針どおり）
  const richResultEligible = Boolean(offers) && ("aggregateRating" in ld || "review" in ld);
  if (!richResultEligible) notes.push("Googleのソフトウェアアプリのリッチリザルトの条件（評価かレビュー）は満たさない。方針どおり（実在しないレビューを作らない）");
  return { problems, notes, richResultEligible };
}
