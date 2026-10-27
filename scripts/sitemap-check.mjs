#!/usr/bin/env node
/**
 * ビルド済みサイト（out/）のサイトマップとrobots.txtを検証する（読み取り専用。ネットワークに接続しない）。
 *
 *   npm run build && node scripts/sitemap-check.mjs [--dir out] [--site https://ossalt.jp]
 *
 * 確認：XMLが読める／URLが重複しない／すべて同じホスト・末尾スラッシュ／ページが out/ にある（404を載せていない）／
 *       転送ページ（meta refresh）・noindex・canonicalが別URLのページを載せていない／lastmodは日付の形／
 *       robots.txt が全体を許可し、sitemapを指している／Bingbot・Googlebotを拒否していない。
 * 失敗（問題あり）で終了コード1。lastmodが無いのは問題にしない（信頼できる日付があるものだけに付ける方針）。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function parseSitemap(xml) {
  const urls = [];
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = (m[1].match(/<loc>([^<]*)<\/loc>/) ?? [])[1];
    const lastmod = (m[1].match(/<lastmod>([^<]*)<\/lastmod>/) ?? [])[1];
    if (loc) urls.push({ loc: loc.trim().replace(/&amp;/g, "&"), lastmod: lastmod?.trim() });
  }
  return urls;
}

/** HTMLから、検索エンジンに関わる事実だけを読む */
export function pageFacts(html) {
  const robots = (html.match(/<meta[^>]+name="robots"[^>]+content="([^"]*)"/i) ?? html.match(/<meta[^>]+content="([^"]*)"[^>]+name="robots"/i) ?? [])[1] ?? "";
  const canonical = (html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i) ?? html.match(/<link[^>]+href="([^"]*)"[^>]+rel="canonical"/i) ?? [])[1] ?? "";
  const refresh = /<meta[^>]+http-equiv="refresh"/i.test(html);
  return { noindex: /noindex/i.test(robots), canonical, refresh };
}

export function checkRobots(txt, site) {
  const problems = [];
  if (!new RegExp(`^Sitemap:\\s*${site.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/sitemap\\.xml\\s*$`, "mi").test(txt)) problems.push("robots.txt に Sitemap: <site>/sitemap.xml が無い");
  // User-agent: * のグループが、全体を拒否していない
  const groups = txt.split(/\n\s*\n/);
  for (const g of groups) {
    const agents = [...g.matchAll(/^User-agent:\s*(.+)$/gim)].map((m) => m[1].trim().toLowerCase());
    const disallowAll = /^Disallow:\s*\/\s*$/im.test(g);
    if (disallowAll && agents.some((a) => ["*", "googlebot", "bingbot"].includes(a))) problems.push(`robots.txt が全体を拒否している（User-agent: ${agents.join(", ")}）`);
  }
  if (!/^User-agent:\s*\*/im.test(txt)) problems.push("robots.txt に User-agent: * が無い");
  return problems;
}

export function checkSitemap({ urls, site, readPage, hasFile }) {
  const problems = [];
  const warnings = [];
  const seen = new Set();
  for (const { loc, lastmod } of urls) {
    let u;
    try { u = new URL(loc); } catch { problems.push(`URLとして読めない: ${loc}`); continue; }
    if (`${u.protocol}//${u.host}` !== site) problems.push(`別のホスト: ${loc}`);
    if (!u.pathname.endsWith("/")) problems.push(`末尾スラッシュが無い: ${loc}`);
    if (u.search || u.hash) problems.push(`クエリ・ハッシュ付き: ${loc}`);
    if (seen.has(loc)) problems.push(`重複: ${loc}`);
    seen.add(loc);
    if (lastmod && !/^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2})?)?$/.test(lastmod)) problems.push(`lastmod の形が不正: ${loc} ${lastmod}`);
    if (!hasFile(u.pathname)) { problems.push(`out/ にページが無い（404になる）: ${loc}`); continue; }
    const f = pageFacts(readPage(u.pathname));
    if (f.refresh) problems.push(`転送ページ（meta refresh）を載せている: ${loc}`);
    if (f.noindex) problems.push(`noindexのページを載せている: ${loc}`);
    if (f.canonical && f.canonical.replace(/\/?$/, "/") !== loc.replace(/\/?$/, "/")) problems.push(`canonicalが別のURL: ${loc} → ${f.canonical}`);
    if (!f.canonical) warnings.push(`canonicalが無い: ${loc}`);
  }
  return { problems, warnings, total: urls.length };
}

function main(argv) {
  const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
  const dir = path.resolve(arg("--dir", "out"));
  const site = arg("--site", "https://ossalt.jp").replace(/\/$/, "");
  const sitemapPath = path.join(dir, "sitemap.xml");
  if (!fs.existsSync(sitemapPath)) { console.error(`sitemap.xml が ${dir} に無い（先に npm run build）`); return 1; }
  const urls = parseSitemap(fs.readFileSync(sitemapPath, "utf8"));
  const pageFile = (p) => path.join(dir, p.endsWith("/") ? p : `${p}/`, "index.html");
  const r = checkSitemap({
    urls, site,
    hasFile: (p) => fs.existsSync(pageFile(p)),
    readPage: (p) => fs.readFileSync(pageFile(p), "utf8"),
  });
  const robotsPath = path.join(dir, "robots.txt");
  const robotsProblems = fs.existsSync(robotsPath) ? checkRobots(fs.readFileSync(robotsPath, "utf8"), site) : ["robots.txt が無い"];
  const all = [...r.problems, ...robotsProblems];
  console.log(`サイトマップ: ${r.total}件。問題 ${all.length}件、注意 ${r.warnings.length}件`);
  for (const p of all.slice(0, 50)) console.log(`  ✗ ${p}`);
  for (const w of r.warnings.slice(0, 10)) console.log(`  △ ${w}`);
  return all.length ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
