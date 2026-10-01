/**
 * 「〇〇の代替」ページの「よくある質問」（純粋関数のみ）
 *
 * 「〇〇 代替 日本語」「〇〇 代替 docker」のような検索で知りたいことに、
 * 掲載データだけで答える。データが無い項目は「確認できていない」と書き、
 * 「非対応」「無い」とは断定しない。
 *
 * node:test から直接読み込めるよう、compare.ts（純粋関数）以外のimportを持たない。
 */
import type { Tool } from "./tools.ts";
import { classifyLicense, LICENSE_CLASS_LABELS } from "./compare.ts";

export type FaqItem = { q: string; a: string };

type FaqTool = Pick<
  Tool,
  "id" | "name" | "license" | "ja_ui" | "ja_docs" | "docker_available" | "freshness_days" | "health_score"
>;

/** 「A、B、C」の形に並べる（最大n件、超えたら「など」） */
function names(tools: FaqTool[], n = 4): string {
  const picked = tools.slice(0, n).map((t) => t.name);
  return picked.join("、") + (tools.length > n ? "など" : "");
}

const byHealth = (a: FaqTool, b: FaqTool) => (b.health_score ?? -1) - (a.health_score ?? -1);

export function buildAlternativeFaq(competitor: string, input: FaqTool[]): FaqItem[] {
  const tools = [...input].sort(byHealth);
  const n = tools.length;
  if (n === 0) return [];
  const faq: FaqItem[] = [];

  // 1) いくつあるか
  faq.push({
    q: `${competitor}の代わりになるオープンソースはいくつありますか？`,
    a:
      n === 1
        ? `当サイトでは${tools[0].name}の1件を掲載しています。`
        : `当サイトでは${n}件を掲載しています。GitHubでの活発さ（健全度）の高い順に、${names(tools)}です。`,
  });

  // 2) 日本語
  const jaUi = tools.filter((t) => t.ja_ui === true);
  const jaDocsOnly = tools.filter((t) => t.ja_ui !== true && (t.ja_docs === "official" || t.ja_docs === "community"));
  let jaAnswer: string;
  if (jaUi.length === 0 && jaDocsOnly.length === 0) {
    jaAnswer =
      "掲載しているツールのリポジトリでは、日本語の画面翻訳や日本語のドキュメントを確認できていません。翻訳を別の場所で管理している場合もあるため、導入前に実際の画面で確かめてください。";
  } else {
    const parts: string[] = [];
    if (jaUi.length) parts.push(`画面の日本語翻訳を確認できたのは${names(jaUi, 6)}（${jaUi.length}件）です。`);
    if (jaDocsOnly.length) parts.push(`日本語のドキュメントを確認できたのは${names(jaDocsOnly, 6)}です。`);
    const rest = n - jaUi.length - jaDocsOnly.length;
    if (rest > 0) parts.push(`残りの${rest}件は確認できていません（日本語に対応していないとは限りません）。`);
    jaAnswer = parts.join("");
  }
  faq.push({ q: "日本語で使えるものはありますか？", a: jaAnswer });

  // 3) Docker
  const docker = tools.filter((t) => t.docker_available === true);
  faq.push({
    q: "Dockerで動かせるものはありますか？",
    a: docker.length
      ? `リポジトリでDockerでの導入方法を確認できたのは、${names(docker, 6)}${n > 1 ? `（${docker.length}件）` : ""}です。${docker.length < n ? "それ以外のツールも、別の方法で導入できる場合があります。" : ""}`
      : "リポジトリでDockerでの導入方法を確認できたツールはありません。インストール方法は各ツールの公式ドキュメントで確認してください。",
  });

  // 4) ライセンス
  const groups = new Map<string, FaqTool[]>();
  for (const t of tools) {
    const label = LICENSE_CLASS_LABELS[classifyLicense(t.license)].replace(/（.*）/, "");
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(t);
  }
  const sourceAvailable = tools.filter((t) => classifyLicense(t.license) === "source-available");
  const licenseParts = [...groups.entries()].map(([label, ts]) => {
    const kinds = [...new Set(ts.map((t) => t.license).filter(Boolean))].slice(0, 2).join("・");
    return `${label}${kinds ? `（${kinds}${new Set(ts.map((t) => t.license)).size > 2 ? "など" : ""}）` : ""}が${ts.length}件`;
  });
  const only = n === 1 ? tools[0] : null;
  faq.push({
    q: only ? "ライセンスは何ですか？" : "ライセンスに違いはありますか？",
    a:
      (only
        ? `${only.name}のライセンスは${only.license ?? "未取得"}（${LICENSE_CLASS_LABELS[classifyLicense(only.license)]}）です。`
        : `${licenseParts.join("、")}です。`) +
      (sourceAvailable.length
        ? `${names(sourceAvailable, 6)}は、ソースコードは公開されていますが一般的なオープンソースライセンスではなく、使い方に条件があります。`
        : "") +
      "社内で使うだけなら多くの場合は問題になりませんが、改変して外部に提供する場合などは、各ライセンスの条件を確認してください。",
  });

  // 5) 更新
  const recent = tools.filter((t) => t.freshness_days != null && t.freshness_days <= 90);
  const stale = tools.filter((t) => t.freshness_days != null && t.freshness_days > 365);
  const fd = only?.freshness_days;
  faq.push({
    q: "開発は続いていますか？",
    a:
      (only
        ? fd == null
          ? `${only.name}の最終更新日は取得できていません。`
          : `${only.name}の最後の更新は${fd}日前です。`
        : `直近90日以内に更新されているのは${n}件中${recent.length}件です。`) +
      (!only && stale.length ? `${names(stale, 6)}は、最後の更新から1年以上たっています。` : "") +
      "更新が続いているかは、セキュリティの修正を受けられるかに直結します。",
  });

  // 6) 費用
  faq.push({
    q: "無料で使えますか？",
    a: "ソースコードは公開されていて、自分のサーバーで動かせます。ただし、サーバー代と、アップデートやバックアップなどの運用の手間がかかります。また、一部の機能を有料版だけで提供しているツールもあるため、必要な機能が無料で使えるかは公式サイトで確認してください。",
  });

  return faq;
}
