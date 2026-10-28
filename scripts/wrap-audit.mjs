#!/usr/bin/env node
/**
 * 日本語の折り返し監査：見出し・本文が、語の途中で改行されていないかを調べる（読み取り専用）。
 * iOS Safari は word-break: auto-phrase に未対応のため、それを無効にした状態（word-break: normal）で測る。
 * 「語」の判定は Intl.Segmenter('ja')。Chromiumでの近似で、実機のSafariとは完全には一致しない。
 *
 *   npm run build && node scripts/wrap-audit.mjs [--dir out] [--width 390] [--out reports/seo/wrap-audit.json] [--strict]
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const root = path.resolve(arg("--dir", "out"));
const width = Number(arg("--width", 390));
const outFile = path.resolve(arg("--out", "reports/seo/wrap-audit.json"));

/** 代表ページ：重要ページ＋種類ごとの見本（slugはビルド結果から拾う） */
function targets() {
  const fixed = ["/", "/tools/", "/alternatives/", "/compare/", "/categories/", "/rankings/", "/trending/", "/changes/", "/diagnosis/", "/cost-lab/", "/for-you/", "/japanese/", "/licenses/", "/blog/", "/submit/", "/about/", "/editorial/", "/guide/"];
  const pick = (dir, n) => (fs.existsSync(path.join(root, dir)) ? fs.readdirSync(path.join(root, dir)).filter((f) => fs.existsSync(path.join(root, dir, f, "index.html"))).slice(0, n).map((f) => `/${dir}/${f}/`) : []);
  const special = ["/tools/gitea/", "/tools/plane/", "/alternatives/github/", "/alternatives/notion/", "/alternatives/chatgpt/", "/alternatives/salesforce/", "/compare/ollama-vs-open-webui/", "/categories/note-docs/"];
  return [...new Set([...fixed, ...special, ...pick("tools", 12), ...pick("alternatives", 12), ...pick("compare", 8), ...pick("categories", 5), ...pick("blog", 3)])].filter((u) => fs.existsSync(path.join(root, u, "index.html")));
}

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };
const srv = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split("?")[0]));
  if (f.endsWith("/") || !path.extname(f)) f = path.join(f, "index.html");
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": TYPES[path.extname(f)] ?? "application/octet-stream" }); r.end(d); });
}).listen(0);
await new Promise((res) => srv.on("listening", res));
const origin = `http://127.0.0.1:${srv.address().port}`;

const browser = await chromium.launch();
const findings = [];
const list = targets();
for (const u of list) {
  const page = await (await browser.newContext({ viewport: { width, height: 800 }, locale: "ja-JP" })).newPage();
  await page.route("**/*", (r) => (new URL(r.request().url()).hostname === "127.0.0.1" ? r.continue() : r.abort()));
  await page.goto(origin + u);
  await page.waitForTimeout(300);
  await page.addStyleTag({ content: "main h1, main h2, main h3, main p, main li, main dd { word-break: normal !important; }" });
  const bad = await page.evaluate(() => {
    const seg = new Intl.Segmenter("ja", { granularity: "word" });
    const out = [];
    for (const el of document.querySelectorAll("main h1, main h2, main h3, main .lede, main header p, main .hero p")) {
      if (el.closest("[hidden], details:not([open])")) continue;
      const rect = el.getBoundingClientRect();
      if (!rect.height) continue;
      const text = el.innerText.replace(/\s+/g, " ");
      if (text.length < 4) continue;
      // 文字ごとの行位置
      const chars = [];
      const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      let n;
      while ((n = tw.nextNode())) for (let i = 0; i < n.length; i++) { range.setStart(n, i); range.setEnd(n, i + 1); const rr = range.getBoundingClientRect(); if (rr.height) chars.push({ ch: n.data[i], top: Math.round(rr.top) }); }
      const full = chars.map((c) => c.ch).join("");
      const words = []; let pos = 0;
      for (const s of seg.segment(full)) { words.push({ start: pos, end: pos + s.segment.length }); pos += s.segment.length; }
      const hits = [];
      for (let i = 1; i < chars.length; i++) {
        if (chars[i].top <= chars[i - 1].top + 4 || /\s/.test(chars[i].ch) || /\s/.test(chars[i - 1].ch)) continue;
        const w = words.find((x) => x.start < i && i < x.end);
        // 語の中で切れている。ただし、語尾のかな1文字だけが次の行に移る場合（運用す｜る）は、読みやすさへの影響が小さいので数えない
        if (w && w.end - w.start >= 4 && i - w.start >= 2 && w.end - i >= 2) hits.push(full.slice(Math.max(0, i - 6), i) + "｜" + full.slice(i, i + 6));
      }
      if (hits.length) out.push({ tag: el.tagName, text: full.slice(0, 40), hits: hits.slice(0, 3), count: hits.length });
    }
    return out;
  });
  for (const b of bad) findings.push({ url: u, ...b });
  await page.context().close();
}
await browser.close(); srv.close();
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify({ generatedAt: new Date().toISOString(), width, env: "Chromium・word-break:normal（auto-phrase無効）・Intl.Segmenter('ja')での近似", pages: list.length, findings }, null, 2) + "\n");
const byTag = {};
for (const f of findings) byTag[f.tag] = (byTag[f.tag] ?? 0) + 1;
console.log(`折り返し監査: ${list.length}ページ（${width}px）。語の途中（2文字以上ずつ）で改行している見出し・導入文 ${findings.length}件 ${JSON.stringify(byTag)}`);
for (const f of findings.slice(0, 60)) console.log(`- ${f.url} ${f.tag}「${f.text}」 ${f.hits.join(" / ")}`);
process.exit(argv.includes("--strict") && findings.length ? 1 : 0);
