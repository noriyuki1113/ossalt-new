#!/usr/bin/env node
/**
 * 掲載件数の整合性チェック（読み取り専用）。ビルド済みの out/ で、「N件を収録」「掲載N件」「全N件」などの
 * 掲載総数の記載が、最新の掲載データ（public/data/meta.json の tool_count）と一致するかを調べる。
 * 日付つきの過去の集計（記事の「2026年9月26日時点」など）は、content/blog 側で時点を明記するため対象外。
 *   npm run build && node scripts/count-audit.mjs [--dir out] [--strict]
 */
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const dir = path.resolve(argv.includes("--dir") ? argv[argv.indexOf("--dir") + 1] : "out");
const meta = JSON.parse(fs.readFileSync("public/data/meta.json", "utf8"));
const expected = meta.tool_count;
const PATTERNS = [/(\d{3})件を収録/g, /(?:掲載|収録|登録)(?:している|中の|ツール|OSS)?[^<>。、\d]{0,6}(\d{3})件/g, /全(\d{3})件/g, /(\d{3})件のオープンソース/g];

const bad = new Map();
let claims = 0;
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!["_next", "data"].includes(e.name)) walk(p); continue; }
    if (!/\.(html|txt|md)$/.test(e.name)) continue;
    const rel = "/" + path.relative(dir, p).replace(/\\/g, "/");
    // 日付つきの過去の集計（記事）は対象外
    if (rel.startsWith("/blog/") || rel.startsWith("/md/blog/")) continue;
    const text = fs.readFileSync(p, "utf8");
    for (const re of PATTERNS) for (const m of text.matchAll(re)) {
      claims++;
      // 「2026年9月時点・掲載ツール379件」のように、時点が明記された過去の集計は対象外
      if (/時点/.test(text.slice(Math.max(0, m.index - 25), m.index + m[0].length))) continue;
      const n = Number(m[1]);
      if (n !== expected) bad.set(`${rel}（${m[0]}）`, n);
    }
  }
})(dir);

console.log(`掲載件数の整合性: 掲載データ=${expected}件。記載${claims}か所を確認。不一致 ${bad.size}件。`);
for (const [k, n] of [...bad].slice(0, 30)) console.log(`- ${k} → ${n}`);
process.exit(argv.includes("--strict") && bad.size ? 1 : 0);
