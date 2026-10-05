/**
 * 「A vs B」比較ページのロジック（純粋関数のみ）
 *
 * 同じSaaSの代替候補どうしを組み合わせ、掲載データだけから違いを文章にする。
 * 推測や生成AIの文章は使わない。データが無い項目は「未確認」として扱い、
 * 「無い」「非対応」とは断定しない。
 *
 * node:test から直接読み込めるよう、型以外のimportを持たない。
 */
import type { Tool } from "./tools.ts";

/* ------------------------------------------------------------------ *
 * ライセンスの分類（ブログ「ライセンスの分類」と同じ7分類）
 * ------------------------------------------------------------------ */

export type LicenseClass =
  | "permissive"
  | "weak-copyleft"
  | "copyleft"
  | "network-copyleft"
  | "source-available"
  | "partial"
  | "dual"
  | "unknown";

export const LICENSE_CLASS_LABELS: Record<LicenseClass, string> = {
  permissive: "許容型",
  "weak-copyleft": "弱いコピーレフト",
  copyleft: "コピーレフト",
  "network-copyleft": "ネットワーク型コピーレフト",
  "source-available": "ソース公開型（一般的なオープンソースではない）",
  partial: "構成要素によって異なる",
  dual: "複数のライセンスから選択",
  unknown: "未取得",
};

const SOURCE_AVAILABLE_RE =
  /BUSL|SSPL|MSCL|Elastic License|FSL|Sustainable Use|Commons Clause|改変条項|独自条項|Source Available|Community License|(^|\s)[A-Za-z]+ (Lite )?License$/;
const PARTIAL_RE = /構成要素|別ライセンス|コアのみ/;

function classifySingle(part: string): LicenseClass {
  const p = part.trim();
  if (/^(MIT|Apache|BSD|ISC|PostgreSQL|Zlib|Unlicense|0BSD)/i.test(p)) return "permissive";
  if (/^(MPL|LGPL|EPL)/i.test(p)) return "weak-copyleft";
  if (/^(AGPL|OSL)/i.test(p)) return "network-copyleft";
  if (/^GPL/i.test(p)) return "copyleft";
  return "unknown";
}

export function classifyLicense(license: string | null | undefined): LicenseClass {
  if (!license || !license.trim()) return "unknown";
  const l = license.trim();
  if (SOURCE_AVAILABLE_RE.test(l)) return "source-available";
  if (PARTIAL_RE.test(l)) return "partial";
  const parts = l.split("/").map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    const classes = new Set(parts.map(classifySingle));
    return classes.size === 1 ? [...classes][0] : "dual";
  }
  return classifySingle(l);
}

/* ------------------------------------------------------------------ *
 * 比較する組み合わせ
 * ------------------------------------------------------------------ */

/** 各SaaSの代替のうち、健全度の上位何件どうしを組み合わせるか。 */
export const COMPARE_TOP_N = 3;

export type ComparePair = { slug: string; a: string; b: string; competitor: string };

/** URLのslug。idを昇順にそろえ、「a-vs-b」と「b-vs-a」の重複ページを作らない。 */
export function compareSlug(id1: string, id2: string): string {
  const [a, b] = [id1, id2].sort();
  return `${a}-vs-${b}`;
}

/**
 * アーカイブ済みを除いたツール一覧から、比較ページの組み合わせを作る。
 * 同じ primary_competitor の中で健全度の上位 topN 件どうしを組み合わせる。
 */
export function buildComparePairs(
  tools: Pick<Tool, "id" | "primary_competitor" | "health_score" | "github_archived">[],
  topN = COMPARE_TOP_N
): ComparePair[] {
  const groups = new Map<string, typeof tools>();
  for (const t of tools) {
    if (t.github_archived || !t.primary_competitor) continue;
    const list = groups.get(t.primary_competitor) ?? [];
    list.push(t);
    groups.set(t.primary_competitor, list);
  }
  const pairs: ComparePair[] = [];
  for (const [competitor, list] of groups) {
    const top = [...list]
      .sort((x, y) => (y.health_score ?? -1) - (x.health_score ?? -1) || x.id.localeCompare(y.id))
      .slice(0, topN);
    for (let i = 0; i < top.length; i += 1) {
      for (let j = i + 1; j < top.length; j += 1) {
        const [a, b] = [top[i].id, top[j].id].sort();
        pairs.push({ slug: `${a}-vs-${b}`, a, b, competitor });
      }
    }
  }
  return pairs.sort((x, y) => x.slug.localeCompare(y.slug));
}

/* ------------------------------------------------------------------ *
 * 主な違い（データから機械的に文章を作る）
 * ------------------------------------------------------------------ */

type CompareTool = Pick<
  Tool,
  | "name"
  | "license"
  | "stars_num"
  | "releases_12mo"
  | "freshness_days"
  | "docker_available"
  | "ja_ui"
  | "ja_docs"
  | "scorecard_score"
  | "security_md"
>;

function fmt(n: number): string {
  return n.toLocaleString("ja-JP");
}

export function buildDifferences(a: CompareTool, b: CompareTool): string[] {
  const out: string[] = [];

  // ライセンス
  const ca = classifyLicense(a.license);
  const cb = classifyLicense(b.license);
  if (ca !== "unknown" && cb !== "unknown") {
    if (ca === cb) {
      out.push(`ライセンスはどちらも${LICENSE_CLASS_LABELS[ca]}です（${a.name}：${a.license}、${b.name}：${b.license}）。`);
    } else {
      out.push(
        `ライセンスの性格が異なります。${a.name}は${LICENSE_CLASS_LABELS[ca]}（${a.license}）、${b.name}は${LICENSE_CLASS_LABELS[cb]}（${b.license}）です。`
      );
    }
    const sa = [a, b].filter((t) => classifyLicense(t.license) === "source-available");
    if (sa.length > 0) {
      out.push(
        `${sa.map((t) => t.name).join("と")}は一般的なオープンソースライセンスではありません。社外に提供するサービスに組み込む場合などは、条件を確認してください。`
      );
    }
  } else if (ca === "unknown" || cb === "unknown") {
    const unknownName = ca === "unknown" ? a.name : b.name;
    out.push(`${unknownName}のライセンスは当サイトで取得できていません。公式の情報で確認してください。`);
  }

  // 注目度（スター数）
  if (a.stars_num != null && b.stars_num != null && a.stars_num > 0 && b.stars_num > 0) {
    const [hi, lo] = a.stars_num >= b.stars_num ? [a, b] : [b, a];
    const ratio = (hi.stars_num as number) / (lo.stars_num as number);
    if (ratio >= 1.5) {
      out.push(
        `GitHubのスター数は${hi.name}が約${ratio.toFixed(1)}倍です（${fmt(hi.stars_num as number)}と${fmt(lo.stars_num as number)}）。スターは注目度の目安で、品質の差ではありません。`
      );
    } else {
      out.push(`GitHubのスター数は同じくらいです（${a.name}：${fmt(a.stars_num)}、${b.name}：${fmt(b.stars_num)}）。`);
    }
  }

  // 更新の頻度（直近12か月のリリース数）
  if (a.releases_12mo != null && b.releases_12mo != null) {
    if (a.releases_12mo !== b.releases_12mo) {
      out.push(
        `直近12か月のリリース（新しい版の公開）は、${a.name}が${a.releases_12mo}回、${b.name}が${b.releases_12mo}回です。リリースの区切り方はプロジェクトによって違うため、回数の多さだけで判断しないでください。`
      );
    }
  }

  // 更新が止まっていないか
  for (const t of [a, b]) {
    if (t.freshness_days != null && t.freshness_days > 180) {
      out.push(`${t.name}は最終コミットから${t.freshness_days}日が経っています。更新の状況を確認してから導入しましょう。`);
    }
  }

  // Docker（null は「未確認」であり「非対応」ではない）
  if (a.docker_available === true && b.docker_available === true) {
    out.push("どちらも、Dockerでの導入手順やファイルを確認できています。");
  } else if (a.docker_available === true || b.docker_available === true) {
    const [yes, other] = a.docker_available === true ? [a, b] : [b, a];
    out.push(`Dockerでの導入手順やファイルを確認できたのは${yes.name}です（${other.name}は未確認）。`);
  }

  // 日本語
  const jaA = a.ja_ui === true;
  const jaB = b.ja_ui === true;
  if (jaA && jaB) {
    out.push("どちらも、画面の日本語翻訳ファイルがあります（すべての画面が訳されているとは限りません）。");
  } else if (jaA || jaB) {
    const [yes, other] = jaA ? [a, b] : [b, a];
    out.push(`画面の日本語翻訳ファイルを確認できたのは${yes.name}です（${other.name}は未確認）。`);
  }

  // セキュリティ
  if (a.scorecard_score != null && b.scorecard_score != null) {
    out.push(
      `OpenSSF Scorecard（セキュリティ対策の機械採点）は、${a.name}が${a.scorecard_score.toFixed(1)}、${b.name}が${b.scorecard_score.toFixed(1)}です。`
    );
  } else if (a.scorecard_score != null || b.scorecard_score != null) {
    const [has, none] = a.scorecard_score != null ? [a, b] : [b, a];
    out.push(
      `OpenSSF Scorecardの評価があるのは${has.name}（${(has.scorecard_score as number).toFixed(1)}）です。${none.name}は未評価で、評価が無いことは危険という意味ではありません。`
    );
  }
  if (a.security_md !== b.security_md && a.security_md != null && b.security_md != null) {
    const [yes, no] = a.security_md ? [a, b] : [b, a];
    out.push(`脆弱性の報告窓口（SECURITY.md）は、${yes.name}にはあり、${no.name}には見つかりませんでした。`);
  }

  return out;
}
