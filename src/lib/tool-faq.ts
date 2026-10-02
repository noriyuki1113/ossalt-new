/**
 * ツールページの「よくある質問」（純粋関数のみ）
 *
 * 「〇〇 日本語」「〇〇 docker」「〇〇 商用利用」のような検索で知りたいことに、
 * 掲載データだけで答える。データが無い項目は「確認できていない」と書き、
 * 「非対応」「無い」とは断定しない。言い回しは alternative-faq.ts とそろえる。
 *
 * node:test から直接読み込めるよう、compare.ts（純粋関数）以外のimportを持たない。
 */
import type { Tool } from "./tools.ts";
import { classifyLicense, LICENSE_CLASS_LABELS, type LicenseClass } from "./compare.ts";

export type FaqItem = { q: string; a: string };

type FaqTool = Pick<
  Tool,
  | "id"
  | "name"
  | "license"
  | "ja_ui"
  | "ja_docs"
  | "docker_available"
  | "freshness_days"
  | "health_score"
  | "github_archived"
  | "releases_12mo"
  | "scorecard_score"
  | "security_md"
> & { star_gain?: Tool["star_gain"] };

const LICENSE_USE: Record<LicenseClass, string> = {
  permissive:
    "制限の少ない「許容型」のライセンスで、社内の業務で使うことも、改変することも、広く認められています。配布するときは、著作権の表示などの条件を守る必要があります。",
  "weak-copyleft":
    "「弱いコピーレフト」のライセンスで、社内の業務で使うことは認められています。このツール自体のファイルを改変して配布する場合は、その部分のソースコードを公開する条件があります。",
  copyleft:
    "「コピーレフト」のライセンスで、社内の業務で使うことは認められています。改変したものを配布する場合は、ソースコードを同じ条件で公開する必要があります。",
  "network-copyleft":
    "「ネットワーク型コピーレフト」のライセンスで、社内の業務で使うことは認められています。改変したものを、インターネット越しのサービスとして外部に提供する場合は、そのソースコードを公開する必要があります。",
  "source-available":
    "ソースコードは公開されていますが、一般的なオープンソースライセンスではありません。社内の業務で使うことは認められていることが多い一方で、他社向けのサービスとして提供することなどに制限があります。使い方が条件に合うかを、ライセンス文で確認してください。",
  partial: "構成要素によってライセンスが異なります。使う部分のライセンスを、それぞれ確認してください。",
  dual: "複数のライセンスから選べる形です。使い方に合うライセンスを確認してください。",
  unknown: "当サイトではライセンスを取得できていません。リポジトリのライセンス文を確認してください。",
};

export function buildToolFaq(
  tool: FaqTool,
  opts: { competitor: string | null; others: Array<Pick<Tool, "id" | "name">> },
): FaqItem[] {
  const faq: FaqItem[] = [];
  const name = tool.name;

  // 1) 日本語
  const jaDocs = tool.ja_docs === "official" || tool.ja_docs === "community";
  faq.push({
    q: `${name}は日本語で使えますか？`,
    a:
      tool.ja_ui === true
        ? `リポジトリに画面の日本語翻訳のファイルがあることを確認できています。${jaDocs ? "日本語のドキュメントも確認できています。" : ""}翻訳されている範囲はツールによって異なるため、導入前に実際の画面で確かめてください。`
        : jaDocs
          ? "日本語のドキュメント（READMEなど）を確認できています。画面の日本語翻訳は、当サイトでは確認できていません。"
          : "当サイトでは、画面の日本語翻訳や日本語のドキュメントを確認できていません。翻訳を別の場所で管理している場合もあるため、日本語に対応していないとは限りません。導入前に実際の画面で確かめてください。",
  });

  // 2) Docker
  faq.push({
    q: `${name}はDockerで動かせますか？`,
    a:
      tool.docker_available === true
        ? "リポジトリで、Docker用のファイルや公式のコンテナイメージの案内を確認できています。手順は公式のドキュメントに従ってください。"
        : "当サイトでは、Dockerでの導入方法を確認できていません。別の方法で導入するツールや、Dockerの案内を別の場所に置いているツールもあるため、公式のドキュメントで確認してください。",
  });

  // 3) 費用と業務での利用
  const cls = classifyLicense(tool.license);
  faq.push({
    q: `${name}は無料で使えますか？ 業務で使ってもよいですか？`,
    a:
      `ライセンスは${tool.license ?? "未取得"}（${LICENSE_CLASS_LABELS[cls]}）です。` +
      LICENSE_USE[cls] +
      "自分のサーバーで動かす場合も、サーバー代と、アップデートやバックアップなどの運用の手間がかかります。また、一部の機能を有料版だけで提供しているツールもあります。",
  });

  // 4) 開発の状況
  const fd = tool.freshness_days;
  const parts: string[] = [];
  if (tool.github_archived) {
    parts.push("このリポジトリはアーカイブされていて、開発は終了しています。新しく導入する場合は、ほかの候補も検討してください。");
  } else if (fd == null) {
    parts.push("最終更新日は取得できていません。");
  } else {
    parts.push(`最後の更新は${fd <= 0 ? "今日" : `${fd}日前`}です。`);
    if (fd > 365) parts.push("1年以上更新がないため、セキュリティの修正を受けられるかに注意が必要です。");
  }
  if (!tool.github_archived && tool.releases_12mo != null) {
    parts.push(`過去12か月のリリースは${tool.releases_12mo}回です。`);
  }
  if (!tool.github_archived && tool.star_gain && tool.star_gain.gain > 0) {
    parts.push(`GitHubのスターは、直近${tool.star_gain.days}日間で${tool.star_gain.gain.toLocaleString("ja-JP")}増えています。`);
  }
  faq.push({ q: `${name}の開発は続いていますか？`, a: parts.join("") });

  // 5) セキュリティ
  faq.push({
    q: `${name}のセキュリティの評価は？`,
    a:
      (tool.scorecard_score != null
        ? `OpenSSF Scorecard（第三者による自動の採点）は10点満点中${tool.scorecard_score}点です（7.5点以上が良好の目安）。`
        : "OpenSSF Scorecard の評価はまだありません（評価がないことは、安全・危険のどちらも意味しません）。") +
      (tool.security_md === true ? "脆弱性の報告窓口（SECURITY.md）があります。" : "") +
      "導入後は、セキュリティの更新を確実に適用してください。",
  });

  // 6) ほかの候補
  if (opts.competitor) {
    const others = opts.others.filter((o) => o.id !== tool.id).slice(0, 4);
    faq.push({
      q: `${opts.competitor}の代わりになる、${name}以外のツールは？`,
      a: others.length
        ? `当サイトでは、${others.map((o) => o.name).join("、")}${opts.others.length - 1 > others.length ? "など" : ""}も掲載しています。下の比較表で、ライセンスや更新状況を見比べられます。`
        : `当サイトで${opts.competitor}の代わりとして掲載しているのは、今のところ${name}だけです。`,
    });
  }

  return faq;
}
