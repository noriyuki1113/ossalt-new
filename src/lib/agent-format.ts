/**
 * AIエージェント・プログラム向けのデータ（JSON API・Markdown版）の組み立て（純粋関数のみ）
 *
 * 方針：
 * - 値が取得できていない・確認できていない項目は null にする（false や「非対応」にしない）
 * - 各レコードに、人が見るページのURLと、データの更新日を必ず含める（出典として示せるように）
 *
 * node:test から直接読み込めるよう、compare.ts（純粋関数）以外のimportを持たない。
 */
import type { Tool } from "./tools.ts";
import { classifyLicense, type LicenseClass } from "./compare.ts";

export const API_VERSION = "v1";

export type ToolRecord = {
  id: string;
  name: string;
  /** ossalt.jp のツールページ（人向け） */
  page_url: string;
  /** このツールのMarkdown版 */
  markdown_url: string;
  official_url: string | null;
  github_url: string;
  description_ja: string | null;
  category: { slug: string; name_ja: string | null };
  /** 代わりになるSaaS（先頭が主な代替対象） */
  alternative_to: string[];
  license: string | null;
  license_class: LicenseClass;
  /** true = 画面の日本語翻訳ファイルを確認できた。null = 未確認（非対応という意味ではない） */
  ja_ui: true | null;
  /** "official" / "community" = 日本語のドキュメントを確認できた。null = 未確認 */
  ja_docs: "official" | "community" | null;
  /** true = Dockerでの導入方法を確認できた。null = 未確認 */
  docker: true | null;
  stars: number | null;
  /** 直近の期間（days日）でのスターの増加 */
  star_gain: { gain: number; days: number } | null;
  last_commit: string | null;
  days_since_last_commit: number | null;
  archived: boolean;
  /** OpenSSF Scorecard（0〜10）。null = 未評価 */
  scorecard: { score: number; date: string | null } | null;
  security_policy: boolean | null;
  releases_last_12_months: number | null;
  health_score: number | null;
};

const nn = <T>(v: T | null | undefined): T | null => (v === undefined ? null : v);

export function toolRecord(
  t: Tool,
  opts: { base: string; categoryName: string | null },
): ToolRecord {
  const competitors = [t.primary_competitor_ja || t.primary_competitor, ...(t.also_competitors ?? [])].filter(
    (x): x is string => Boolean(x),
  );
  return {
    id: t.id,
    name: t.name,
    page_url: `${opts.base}/tools/${t.id}/`,
    markdown_url: `${opts.base}/md/tools/${t.id}.md`,
    official_url: t.url || null,
    github_url: t.github_url,
    description_ja: nn(t.description_ja),
    category: { slug: t.category, name_ja: opts.categoryName },
    alternative_to: [...new Set(competitors)],
    license: nn(t.license),
    license_class: classifyLicense(t.license),
    ja_ui: t.ja_ui === true ? true : null,
    ja_docs: t.ja_docs === "official" || t.ja_docs === "community" ? t.ja_docs : null,
    docker: t.docker_available === true ? true : null,
    stars: nn(t.stars_num),
    star_gain: t.star_gain ? { gain: t.star_gain.gain, days: t.star_gain.days } : null,
    last_commit: nn(t.last_commit),
    days_since_last_commit: nn(t.freshness_days),
    archived: Boolean(t.github_archived),
    scorecard: t.scorecard_score != null ? { score: t.scorecard_score, date: nn(t.scorecard_date) } : null,
    security_policy: nn(t.security_md),
    releases_last_12_months: nn(t.releases_12mo),
    health_score: t.health_score != null ? Math.round(t.health_score) : null,
  };
}

/** 一覧用の小さなレコード */
export function toolSummary(r: ToolRecord) {
  return {
    id: r.id,
    name: r.name,
    page_url: r.page_url,
    api_url: r.page_url.replace(/\/tools\/([^/]+)\/$/, `/api/${API_VERSION}/tools/$1.json`),
    category: r.category.slug,
    alternative_to: r.alternative_to,
    license: r.license,
    license_class: r.license_class,
    ja_ui: r.ja_ui,
    docker: r.docker,
    stars: r.stars,
    days_since_last_commit: r.days_since_last_commit,
    scorecard: r.scorecard?.score ?? null,
  };
}

const LICENSE_CLASS_JA: Record<LicenseClass, string> = {
  permissive: "許容型",
  "weak-copyleft": "弱いコピーレフト",
  copyleft: "コピーレフト",
  "network-copyleft": "ネットワーク型コピーレフト",
  "source-available": "ソース公開型・一般的なオープンソースライセンスではない",
  partial: "構成要素によって異なる",
  dual: "複数のライセンスから選択",
  unknown: "未取得",
};

const yn = (v: unknown, yes: string) => (v ? yes : "未確認");

/** ツールのMarkdown版 */
export function toolMarkdown(r: ToolRecord, opts: { guideMarkdown?: string; builtAt: string }): string {
  const lines = [
    `# ${r.name}`,
    "",
    `${r.alternative_to[0] ?? ""}の代わりになるオープンソース。${r.description_ja ?? ""}`.trim(),
    "",
    `- ossalt.jp のページ: ${r.page_url}`,
    `- 公式サイト: ${r.official_url ?? "未取得"}`,
    `- GitHub: ${r.github_url}`,
    `- 代わりになるSaaS: ${r.alternative_to.join("、") || "未設定"}`,
    `- カテゴリ: ${r.category.name_ja ?? r.category.slug}`,
    `- ライセンス: ${r.license ?? "未取得"}（${LICENSE_CLASS_JA[r.license_class]}）`,
    `- 画面の日本語翻訳: ${yn(r.ja_ui, "あり")}`,
    `- 日本語のドキュメント: ${yn(r.ja_docs, "あり")}`,
    `- Dockerでの導入: ${yn(r.docker, "あり")}`,
    `- GitHubのスター: ${r.stars?.toLocaleString("ja-JP") ?? "未取得"}` +
      (r.star_gain && r.star_gain.gain > 0 ? `（直近${r.star_gain.days}日間で+${r.star_gain.gain.toLocaleString("ja-JP")}）` : ""),
    `- 最終コミット: ${r.last_commit?.slice(0, 10) ?? "未取得"}`,
    `- OpenSSF Scorecard: ${r.scorecard ? `${r.scorecard.score} / 10` : "未評価"}`,
    r.archived ? "- 注意: このリポジトリはアーカイブされています（開発終了）" : null,
  ].filter((l): l is string => l !== null);
  if (opts.guideMarkdown) lines.push("", `## ${r.name}とは`, "", opts.guideMarkdown);
  lines.push(
    "",
    "---",
    `データ: ossalt.jp（${opts.builtAt.slice(0, 10)}時点。GitHubの公開データとリポジトリの自動調査による）。「未確認」は「非対応」という意味ではありません。導入前に公式の情報を確認してください。`,
  );
  return lines.join("\n") + "\n";
}

/** 「〇〇の代替」のMarkdown版 */
export function alternativeMarkdown(
  name: string,
  pageUrl: string,
  records: ToolRecord[],
  opts: { intro?: string; guideMarkdown?: string; builtAt: string },
): string {
  const lines = [`# ${name}の代わりになるオープンソース（${records.length}件）`, "", `ossalt.jp のページ: ${pageUrl}`, ""];
  if (opts.intro) lines.push(opts.intro, "");
  lines.push("| ツール | ライセンス | 日本語の画面 | Docker | スター | 最終コミット | Scorecard |", "|---|---|---|---|---|---|---|");
  for (const r of records) {
    lines.push(
      `| [${r.name}](${r.markdown_url}) | ${r.license ?? "未取得"} | ${yn(r.ja_ui, "あり")} | ${yn(r.docker, "あり")} | ${r.stars?.toLocaleString("ja-JP") ?? "—"} | ${r.last_commit?.slice(0, 10) ?? "—"} | ${r.scorecard ? r.scorecard.score : "未評価"} |`,
    );
  }
  if (opts.guideMarkdown) lines.push("", opts.guideMarkdown);
  lines.push(
    "",
    "---",
    `データ: ossalt.jp（${opts.builtAt.slice(0, 10)}時点）。「未確認」は「非対応」という意味ではありません。`,
  );
  return lines.join("\n") + "\n";
}
