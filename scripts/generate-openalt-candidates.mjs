#!/usr/bin/env node
/**
 * OpenAlternative 公開 README から「追加候補の軽い一覧」を生成する。
 *
 * 元データ: github.com/piotrkulpinski/open-source-alternatives の README.md
 * （awesome-list。GitHub URL や公式サイトは含まれない点に注意）
 *
 * 出力:
 *   docs/openalt-candidates.json … 未掲載候補（名前・英語説明・ライセンス・スター・本家カテゴリ）
 *   docs/openalt-candidates.md   … 人が眺める用のカテゴリ別一覧
 *
 * 既存の data-source/tools.json と照合し、掲載済みを除いた「未掲載のみ」を出す。
 * GitHub リポジトリや代替SaaSは次段階（enrich-openalt-candidates.mjs）で補完する。
 * ※ ここに出るライセンス・スター・説明は第三者の一覧の記載（未確認）。確認と掲載の流れは
 *   確認キュー（scripts/discover-openalt.mjs、docs/discovery/OPENALT_QUEUE.md）を使う。
 */

import fs from "node:fs";
import path from "node:path";
import { loadOverrides } from "./overrides.mjs";
import { parseOpenAltReadme } from "./discovery/openalt.mjs";

const ROOT = process.cwd();
const SRC_TOOLS = path.join(ROOT, "data-source", "tools.json");
const OUT_DIR = path.join(ROOT, "docs");
const SOURCE =
  "https://raw.githubusercontent.com/piotrkulpinski/open-source-alternatives/main/README.md";

const res = await fetch(SOURCE, {
  headers: { "User-Agent": "ossalt-candidate-generator" },
});
if (!res.ok) throw new Error(`README 取得失敗: ${res.status}`);
const markdown = await res.text();

// 解析は確認キュー（discover-openalt.mjs）と共通（scripts/discovery/openalt.mjs）。同じ slug は最初の1件。
const uniq = parseOpenAltReadme(markdown);

// 既存掲載との照合（id または name の小文字一致）
const existing = JSON.parse(fs.readFileSync(SRC_TOOLS, "utf8"));
const existIds = new Set(existing.map((t) => t.id));
const existNames = new Set(existing.map((t) => String(t.name || "").toLowerCase()));
// 掲載除外リスト（data-source/overrides.json）に載っているidは、
// 一度掲載を外した理由（用途の不一致・非OSSライセンス等）があるため、
// 未掲載候補としても提案しない。
const { exclude: excludedIds } = loadOverrides();

const fresh = uniq.filter(
  (e) => !existIds.has(e.slug) && !existNames.has(e.name.toLowerCase()) && !excludedIds.has(e.slug)
);

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(
  path.join(OUT_DIR, "openalt-candidates.json"),
  JSON.stringify(fresh, null, 1)
);

// 人が眺める用
let md = `# OpenAlternative 追加候補（未掲載のみ）\n\n`;
md += `- 元: ${SOURCE}\n`;
md += `- 全ユニーク: ${uniq.length}件 / **未掲載: ${fresh.length}件**\n`;
md += `- 生成: ${new Date().toISOString().slice(0, 10)}\n\n`;
md += `※ ライセンス・Star・説明は OpenAlternative 一覧の記載（第三者の情報・未確認）です。公式リポジトリでの確認は確認キュー（docs/discovery/openalt-queue.md）で行います。\n\n`;
 md += `採用したいものは slug を控え、次を実行:\n`;
md += "`node scripts/enrich-openalt-candidates.mjs --only slug1,slug2`\n\n";
const byMajor = new Map();
for (const e of fresh) {
  if (!byMajor.has(e.major)) byMajor.set(e.major, []);
  byMajor.get(e.major).push(e);
}
for (const [maj, list] of byMajor) {
  md += `## ${maj}（${list.length}件）\n\n`;
  for (const e of list.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }))) {
    const lic = e.license_hint ? ` \`${e.license_hint}\`` : "";
    const st = e.stars_hint ? ` ⭐${e.stars_hint}` : "";
    md += `- \`${e.slug}\` — **${e.name}**${lic}${st}: ${e.description ?? ""}\n`;
  }
  md += "\n";
}
fs.writeFileSync(path.join(OUT_DIR, "openalt-candidates.md"), md);

console.log(`全ユニーク: ${uniq.length}件 / 未掲載: ${fresh.length}件`);
console.log(`出力: docs/openalt-candidates.md`);
