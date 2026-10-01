/**
 * ライセンス分類ページ（/licenses/）の定義
 *
 * 分類そのものは src/lib/compare.ts の classifyLicense() を使う
 * （ブログ「ライセンスの分類」・比較ページと同じ7分類）。
 * 件数が少ない分類（複数から選択・構成要素により異なる・未取得）は、
 * 中身の薄いページになるため個別ページを作らず、一覧ページで件数だけ示す。
 */
import type { LicenseClass } from "./compare.ts";

export type LicensePageDef = {
  slug: LicenseClass;
  title: string;
  examples: string;
  summary: string;
  caution: string;
};

export const LICENSE_PAGES: LicensePageDef[] = [
  {
    slug: "permissive",
    title: "許容型",
    examples: "MIT、Apache-2.0、BSD",
    summary:
      "著作権の表示とライセンスの文面を残せば、改変・再配布・商用利用のいずれも自由にできます。自社の製品に組み込む場合も、もっとも扱いやすいタイプです。",
    caution: "Apache-2.0には特許に関する条項があります。製品に組み込む場合は、NOTICEファイルの扱いも確認しましょう。",
  },
  {
    slug: "weak-copyleft",
    title: "弱いコピーレフト",
    examples: "MPL-2.0、LGPL",
    summary:
      "改変したものを配布する場合に、ソースコードの公開義務が生じます。ただし義務の範囲は、改変したファイルやライブラリ自体に限られます。",
    caution: "ライブラリとして組み込む場合の条件（動的リンクか、静的リンクか）は、ライセンスごとに確認してください。",
  },
  {
    slug: "copyleft",
    title: "コピーレフト",
    examples: "GPL-2.0、GPL-3.0",
    summary:
      "改変したものを配布する（ソフトとして他者に渡す）場合に、同じライセンスでソースコードを公開する義務があります。自社のサーバーで動かすだけなら、一般的には配布にあたりません。",
    caution: "受託開発でお客さんに納品する場合は「配布」にあたるため、お客さんへの義務を確認しましょう。",
  },
  {
    slug: "network-copyleft",
    title: "ネットワーク型コピーレフト",
    examples: "AGPL-3.0、OSL-3.0",
    summary:
      "GPLの考え方に加えて、改変したものをネットワーク越しに利用者に使わせる場合にも、その利用者にソースコードを提供する義務があります。改変せずにそのまま使う限り、この義務は基本的に生じません。",
    caution: "改変して、社外のお客さんに提供するサービスに使う場合は注意が必要です。",
  },
  {
    slug: "source-available",
    title: "ソース公開型（一般的なオープンソースではない）",
    examples: "BUSL、Elastic License、FSL、独自ライセンス",
    summary:
      "ソースコードは読めますが、一般的なオープンソースライセンスの条件を満たさないものです。多くは「そのソフトを使って、競合するサービスを他者に提供すること」などを制限しています。",
    caution: "社内で使う分には問題になりにくいものの、条件は製品ごとに異なります。社外に提供するサービスに使う場合は、必ず原文を確認してください。",
  },
];

/** 個別ページを作らない分類（一覧ページで件数だけ示す） */
export const LICENSE_MINOR_CLASSES: LicenseClass[] = ["dual", "partial", "unknown"];

export function getLicensePage(slug: string): LicensePageDef | undefined {
  return LICENSE_PAGES.find((p) => p.slug === slug);
}
