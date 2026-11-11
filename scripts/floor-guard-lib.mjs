/**
 * floor-guard の判定（純粋な関数。git にも、ファイルにも、ネットワークにもアクセスしない）。
 *
 * CONSTRAINTS.md の「基準を弱めて通していないか」を、変更の差分（unified diff）から見つける。
 * 結果は事実の一覧で、良し悪しの最終判断は人が行う。SEOの公開ゲートの設定・スクリプトを変更する差分は、
 * 必ず「保護パスに変更あり」として表示する（自動で弱体化とは判定しない）。
 *
 * 重大度:
 *   block … 基準を弱める可能性が高い変更（--strict のとき、終了コード1にする）
 *   check … 人が確認すべき変更（終了コードには影響しない）
 */

/** CONSTRAINTS.md の「保護パス」と同じ（変更するときは、両方を合わせる） */
export const PROTECTED_PATTERNS = [
  /^\.github\/workflows\/(deploy-pages|production-seo-check|seo-weekly|e2e)\.yml$/,
  /^scripts\/(sitemap-check|seo-build-diff|seo-audit)[^/]*$/,
  /^scripts\/(verify-production|count-audit)[^/]*$/,
  /^src\/app\/(robots|sitemap)\.ts$/,
  /^next\.config\.mjs$/,
  /^public\/_redirects$/,
  /^ops\/cloudflare\//,
  /^e2e\/(noindex-thin-tools|legacy-redirects|seo-revenue|sweep)\.spec\.ts$/,
];

export const isProtectedPath = (file) => PROTECTED_PATTERNS.some((re) => re.test(file));
const isTestFile = (f) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(f);
const isCodeFile = (f) => /\.[cm]?[jt]sx?$/.test(f);
/** この検査自身は、検出する文字列を含むため、内容の検査から除く */
const isSelf = (f) => /^scripts\/floor-guard[^/]*$/.test(f);
const isConstraints = (f) => f === "CONSTRAINTS.md";

const SUPPRESSION = /@ts-ignore|@ts-nocheck|@ts-expect-error|eslint-disable|biome-ignore|\/\/\s*istanbul ignore|nosemgrep|gitleaks:allow/;
const STUB = /throw new Error\(\s*["'`]\s*not implemented|catch\s*(\(\s*\w*\s*\))?\s*\{\s*\}/i;
const SKIP = /\b(?:test|it|describe)\.(?:skip|todo|fixme)\b|\bx(?:it|describe)\(|\{\s*skip:\s*(?:true|["'`])/;
const ASSERTION = /\b(?:assert|expect)\b/;

/** unified diff を、追加行・削除行・削除されたファイル・変更されたファイルに分ける */
export function parseDiff(diffText) {
  const added = [], removed = [], deleted = [], changed = new Set();
  let file = "", oldFile = "", inHeader = false;
  const pathOf = (s) => s.replace(/^"?[ab]\//, "").replace(/"$/, "");
  for (const line of String(diffText).split("\n")) {
    if (line.startsWith("diff ")) { inHeader = true; file = ""; oldFile = ""; continue; }
    if (line.startsWith("@@")) { inHeader = false; continue; }
    if (inHeader) {
      if (line.startsWith("--- ")) oldFile = line.slice(4) === "/dev/null" ? "" : pathOf(line.slice(4));
      else if (line.startsWith("+++ ")) {
        const nf = line.slice(4);
        if (nf === "/dev/null") { file = oldFile; if (file) { deleted.push(file); changed.add(file); } }
        else { file = pathOf(nf); changed.add(file); }
      }
      continue;
    }
    // ヘッダーが無い（rename のみ等）場合は無視。ハンク内は、+/- で始まる行が内容。
    if (!file) continue;
    if (line.startsWith("+")) added.push({ file, text: line.slice(1) });
    else if (line.startsWith("-")) removed.push({ file, text: line.slice(1) });
  }
  return { added, removed, deleted, changed: [...changed] };
}

/** CONSTRAINTS.md の「基準」の行（箇条書き・表の行）の見出し。基準でない行は null */
export function ruleKey(text) {
  const s = text.trim();
  if (s.startsWith("|")) {
    const cell = s.split("|").map((c) => c.trim()).filter(Boolean)[0] ?? "";
    return /^-+$/.test(cell) || cell === "項目" || cell === "区分" ? null : cell || null;
  }
  if (/^[-*] /.test(s)) return s.slice(2).split(/[：:]/)[0].trim() || null;
  return null;
}

/** 差分から、基準を弱める可能性のある変更を見つける */
export function analyzeDiff(diffText) {
  const { added, removed, deleted, changed } = parseDiff(diffText);
  const findings = [];
  const flag = (severity, rule, file, text = "") => findings.push({ severity, rule, file, text: text.trim().slice(0, 120) });

  for (const f of changed) {
    if (!isProtectedPath(f)) continue;
    if (deleted.includes(f)) flag("block", "protected-path-deleted", f, "保護パスのファイルが削除された");
    else flag("check", "protected-path-changed", f, "保護パスに変更あり（強化であることの説明と、オーナーの承認を確認）");
  }

  for (const f of deleted) if (isTestFile(f)) flag("block", "test-deleted", f, "テストファイルが削除された");

  for (const { file, text } of added) {
    if (isSelf(file)) continue;
    if (isTestFile(file) && SKIP.test(text)) flag("block", "test-skip-added", file, text);
    if (isCodeFile(file) && SUPPRESSION.test(text)) flag("block", "suppression-added", file, text);
    if (isCodeFile(file) && STUB.test(text)) flag("block", "unfinished-work", file, text);
    if (isConstraints(file) && /^\|\s*[WE]\d+\s*\|/.test(text.trim())) flag("check", "exception-added", file, text);
  }

  const addedByFile = new Map();
  for (const { file, text } of added) addedByFile.set(file, (addedByFile.get(file) ?? 0) + (ASSERTION.test(text) ? 1 : 0));
  const removedAssertions = new Map();
  for (const { file, text } of removed) {
    if (isTestFile(file) && !deleted.includes(file) && ASSERTION.test(text)) {
      removedAssertions.set(file, (removedAssertions.get(file) ?? 0) + 1);
    }
  }
  for (const [file, n] of removedAssertions) {
    const addedN = addedByFile.get(file) ?? 0;
    if (n > addedN) flag("check", "assertion-removed", file, `検証の行が ${n} 行減り、${addedN} 行増えた`);
  }

  // CONSTRAINTS.md の基準の削除・変更
  const addedKeys = new Set(added.filter((l) => isConstraints(l.file)).map((l) => ruleKey(l.text)).filter(Boolean));
  const seen = new Set();
  for (const { file, text } of removed) {
    if (!isConstraints(file)) continue;
    const key = ruleKey(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (addedKeys.has(key)) flag("check", "constraint-changed", file, `基準が変更された（弱めていないか確認）: ${key}`);
    else flag("block", "constraint-removed", file, `基準が削除された: ${key}`);
  }
  return findings;
}

/** 終了コード: 通常は 0（表示のみ）。strict のとき、block があれば 1 */
export function exitCodeFor(findings, { strict = false } = {}) {
  return strict && findings.some((f) => f.severity === "block") ? 1 : 0;
}

export function formatReport(findings, { base = "", strict = false } = {}) {
  if (!findings.length) return `floor-guard: 問題は見つかりませんでした（基準 ${base || "?"} との差分）`;
  const label = { block: "弱める可能性が高い", check: "確認" };
  const lines = [`floor-guard: ${findings.length}件（基準 ${base || "?"} との差分${strict ? "・strict" : ""}）`];
  for (const f of findings) lines.push(`  [${label[f.severity]}] ${f.rule}  ${f.file}${f.text ? `  — ${f.text}` : ""}`);
  lines.push("  ※ 事実の一覧です。最終判断は人が行います（基準は CONSTRAINTS.md）。");
  return lines.join("\n");
}
