#!/usr/bin/env node
/**
 * 旧URL→新URLの転送の整合性を、ビルド済みの out/ と data-source/redirects.json で調べる（読み取り専用）。
 *   node scripts/seo-redirects-audit.mjs [--dir out] [--out-dir reports/seo] [--strict]
 * 確認：転送ページが存在する／転送先が存在する／連鎖・ループがない／転送ページのcanonicalが転送先／サイトマップに旧URLが載っていない。
 * 注意：本番のHTTPステータス（301）は、ここでは確認できない（verify-production.mjs の担当）。
 */
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const root = path.resolve(arg("--dir", "out"));
const outDir = path.resolve(arg("--out-dir", "reports/seo"));
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://ossalt.jp").replace(/\/$/, "");

const raw = JSON.parse(fs.readFileSync("data-source/redirects.json", "utf8"));
const list = Object.entries(raw.redirects ?? raw).filter(([k]) => k.startsWith("/")).map(([from, to]) => ({ from, to }));
const map = new Map(list.map((r) => [r.from, r.to]));
const norm = (p) => p.replace(/\/?$/, "/");
const exists = (p) => fs.existsSync(path.join(root, p, "index.html"));
const sitemap = fs.existsSync(path.join(root, "sitemap.xml")) ? fs.readFileSync(path.join(root, "sitemap.xml"), "utf8") : "";

const issues = [];
const add = (id, severity, from, message, evidence) => issues.push({ id, severity, url: from, message, evidence });
for (const [from, to] of map) {
  if (!exists(from)) add("stub-missing", "high", from, "転送ページが out/ に無い", `out${from}index.html`);
  else {
    const html = fs.readFileSync(path.join(root, from, "index.html"), "utf8");
    const canon = (html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i) ?? [])[1];
    if (canon && norm(canon.replace(SITE, "")) !== norm(to)) add("stub-canonical", "high", from, "転送ページのcanonicalが転送先と違う", `canonical=${canon} 転送先=${to}`);
    if (!/http-equiv="refresh"/i.test(html)) add("stub-no-refresh", "medium", from, "meta refreshが無い", "");
  }
  if (!exists(to.split("#")[0])) add("target-missing", "high", from, "転送先のページが存在しない", `転送先=${to}`);
  if (map.has(norm(to)) || map.has(to)) add("chain", "high", from, "転送が連鎖している（転送先がさらに転送される）", `${from} → ${to} → ${map.get(to) ?? map.get(norm(to))}`);
  if (norm(from) === norm(to)) add("loop", "high", from, "自分自身への転送", to);
  if (sitemap.includes(`<loc>${SITE}${from}</loc>`)) add("in-sitemap", "high", from, "旧URLがsitemap.xmlに載っている", from);
}
const high = issues.filter((i) => i.severity === "high").length;
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "redirects-audit.json"), JSON.stringify({ generatedAt: new Date().toISOString(), total: map.size, issues }, null, 2) + "\n");
console.log(`転送監査: ${map.size}件。重大 ${high}／その他 ${issues.length - high}。`);
for (const i of issues.slice(0, 20)) console.log(`- [${i.severity}] ${i.id} ${i.url}：${i.message}（${i.evidence}）`);
process.exit(argv.includes("--strict") && high > 0 ? 1 : 0);
