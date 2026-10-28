#!/usr/bin/env node
/**
 * 重要ページのブラウザ監査（Playwright + axe-core）。ビルド済みの out/ を localhost で配信して調べる。
 * 外部へ通信しない（本番・計測・フォントには触れない）。読み取り専用。
 *
 *   npm run build && node scripts/page-audit.mjs [--dir out] [--out-dir reports/seo] [--only /tools/gitea/] [--strict]
 *
 * 確認：title・description・canonical・noindex・h1・Open Graph・JSON-LD（構文と基本項目、FAQの可視一致）・画像のalt/size・
 *       コンソールエラー・横スクロール（390px）・axe（重大・深刻）・LCP/CLS（ラボ値）。
 * --strict：重大（high）の指摘が1件でもあれば終了コード1。
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { extractFacts, pageIssues, duplicateIssues, renderMarkdown } from "./page-audit-lib.mjs";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const root = path.resolve(arg("--dir", "out"));
const outDir = path.resolve(arg("--out-dir", "reports/seo"));
const only = arg("--only", null);
const strict = argv.includes("--strict");
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://ossalt.jp").replace(/\/$/, "");

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".txt": "text/plain", ".xml": "application/xml", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".ico": "image/x-icon" };
function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const rel = decodeURIComponent((req.url ?? "/").split("?")[0]);
      let f = path.normalize(path.join(root, rel));
      if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
      if (rel.endsWith("/")) f = path.join(f, "index.html");
      else if (!path.extname(f)) f = path.join(f, "index.html");
      fs.readFile(f, (e, d) => {
        if (e) { res.writeHead(404, { "content-type": TYPES[".html"] }); return res.end("not found"); }
        res.writeHead(200, { "content-type": TYPES[path.extname(f)] ?? "application/octet-stream" });
        res.end(d);
      });
    }).listen(0, "127.0.0.1", () => resolve(srv));
  });
}

if (!fs.existsSync(path.join(root, "index.html"))) { console.error(`${root} にビルド結果が無い（先に npm run build）`); process.exit(2); }
const targets = (only ? [only] : JSON.parse(fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "page-audit-targets.json"), "utf8")).targets);

const srv = await serve();
const origin = `http://127.0.0.1:${srv.address().port}`;
const browser = await chromium.launch();
const pages = [];
const issues = [];
const warnings = [];

for (const target of targets) {
  const filePath = path.join(root, target.split("?")[0], "index.html");
  if (!fs.existsSync(filePath)) { warnings.push(`対象が out/ に無いため飛ばした: ${target}`); continue; }
  const canonicalPath = target.split("?")[0];
  const html = fs.readFileSync(filePath, "utf8");
  const facts = extractFacts(html);
  const base = pageIssues({ url: target, expectedCanonical: `${SITE}${canonicalPath}`, facts });
  const rec = { url: target, facts, jsonLdTypes: base.jsonLdTypes };
  issues.push(...base.issues);

  // デスクトップ：コンソールエラー・axe・ラボ値
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "ja-JP" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !/ERR_BLOCKED_BY_CLIENT|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.route("**/*", (route) => { const h = new URL(route.request().url()).hostname; return h === "127.0.0.1" ? route.continue() : route.abort("blockedbyclient"); });
  await page.addInitScript(() => {
    window.__cls = 0; window.__lcp = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  try {
    const res = await page.goto(origin + target, { waitUntil: "load" });
    await page.waitForTimeout(1200);
    if (res && res.status() >= 400) issues.push({ id: "http-error", severity: "high", url: target, message: `ローカルで HTTP ${res.status()}`, evidence: `status=${res.status()}` });
    const lab = await page.evaluate(() => ({ lcp: Math.round(window.__lcp), cls: Math.round(window.__cls * 1000) / 1000 }));
    rec.lcp = lab.lcp; rec.cls = lab.cls;
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    rec.axe = serious.length;
    for (const v of serious) issues.push({ id: `axe-${v.id}`, severity: v.impact === "critical" ? "high" : "medium", url: target, message: `アクセシビリティ（${v.impact}）：${v.help}`, evidence: `${v.nodes.length}箇所。例: ${v.nodes[0]?.target?.join(" ")}` });
  } catch (e) {
    issues.push({ id: "audit-error", severity: "medium", url: target, message: "ブラウザでの監査に失敗", evidence: String(e.message).slice(0, 200) });
  }
  rec.consoleErrors = errors.length;
  for (const e of errors.slice(0, 3)) issues.push({ id: "console-error", severity: "medium", url: target, message: "コンソールエラー", evidence: e.slice(0, 200) });
  await ctx.close();

  // モバイル：横スクロール
  const m = await browser.newContext({ viewport: { width: 390, height: 800 }, locale: "ja-JP" });
  const mp = await m.newPage();
  await mp.route("**/*", (route) => { const h = new URL(route.request().url()).hostname; return h === "127.0.0.1" ? route.continue() : route.abort("blockedbyclient"); });
  try {
    await mp.goto(origin + target, { waitUntil: "load" });
    await mp.waitForTimeout(400);
    rec.overflow = await mp.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
    if (rec.overflow > 1) issues.push({ id: "mobile-overflow", severity: "medium", url: target, message: `390px幅で横スクロールが${rec.overflow}pxある`, evidence: `scrollWidth-clientWidth=${rec.overflow}` });
  } catch { /* 上で記録済み */ }
  await m.close();
  pages.push(rec);
}
await browser.close();
srv.close();

issues.push(...duplicateIssues(pages));
fs.mkdirSync(outDir, { recursive: true });
const generatedAt = new Date().toISOString();
const env = `Chromium（Playwright）、ローカル配信（${path.relative(process.cwd(), root) || "."}）、デスクトップ1280px／モバイル390px、通信制限なし・1回測定`;
const json = { generatedAt, base: SITE, env, warnings, pages: pages.map(({ facts, ...p }) => ({ ...p, title: facts.title, description: facts.description, canonical: facts.canonical, robots: facts.robots, h1: facts.h1 })), issues };
fs.writeFileSync(path.join(outDir, "page-audit.json"), JSON.stringify(json, null, 2) + "\n");
fs.writeFileSync(path.join(outDir, "page-audit.md"), renderMarkdown({ generatedAt, base: SITE, pages, issues, env }) + (warnings.length ? `\n## 警告\n\n${warnings.map((w) => `- ${w}`).join("\n")}\n` : ""));
const high = issues.filter((i) => i.severity === "high").length;
console.log(`ページ監査: ${pages.length}ページ。重大 ${high}／中 ${issues.filter((i) => i.severity === "medium").length}／軽微 ${issues.filter((i) => i.severity === "low").length}。${path.relative(process.cwd(), outDir)}/page-audit.{json,md}`);
process.exit(strict && high > 0 ? 1 : 0);
