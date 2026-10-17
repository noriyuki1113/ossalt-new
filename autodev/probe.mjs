#!/usr/bin/env node
/**
 * 調査用のブラウザ探索ツール（Browser Use 相当・読み取り専用）。
 *   node autodev/probe.mjs <path> [--mobile] [--click "<selector>"]... [--fill "<selector>=<value>"]... [--out <dir>]
 * ローカルに配信した out/ の1ページを開き、操作したあとの状態を報告する：
 *   JSエラー／横にはみ出している要素／見出し／フォームの状態／スクリーンショットのパス
 * 接続できるのは 127.0.0.1 だけ。外部サイトにも本番にも接続しない。Coding Agent は結果を読んで原因を調べる。
 */
import http from "node:http";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const target = args.find((a) => a.startsWith("/"));
if (!target) { console.error("使い方: node autodev/probe.mjs /cost-lab/ [--mobile] [--click sel] [--fill sel=value]"); process.exit(2); }
const multi = (k) => args.flatMap((a, i) => (a === k ? [args[i + 1]] : []));
const outDir = args.includes("--out") ? args[args.indexOf("--out") + 1] : path.join(root, "autodev", "out", "probe");
const mobile = args.includes("--mobile");
const PORT = 4300 + Math.floor(Math.random() * 500);

function waitUp() {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const tick = () => http.get({ host: "127.0.0.1", port: PORT, path: "/" }, (r) => { r.resume(); resolve(); }).on("error", () => (Date.now() - t0 > 10000 ? reject(new Error("サーバーが起動しません")) : setTimeout(tick, 100)));
    tick();
  });
}

const server = spawn("node", [path.join(root, "e2e", "serve.mjs"), String(PORT)], { cwd: root, stdio: "ignore" });
let code = 0;
try {
  await waitUp();
  const browser = await chromium.launch();
  const ctx = await browser.newContext(mobile ? { ...devices["Pixel 7"], locale: "ja-JP" } : { viewport: { width: 1280, height: 800 }, locale: "ja-JP" });
  await ctx.route("**/*", (route) => {
    const h = new URL(route.request().url()).hostname;
    return h === "127.0.0.1" || h === "localhost" ? route.continue() : route.abort("blockedbyclient");
  });
  const page = await ctx.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !/ERR_BLOCKED_BY_CLIENT/.test(m.text())) problems.push(`console.error: ${m.text()}`); });

  const res = await page.goto(`http://127.0.0.1:${PORT}${target}`, { waitUntil: "networkidle" });
  const steps = [];
  for (const f of multi("--fill")) { const i = f.lastIndexOf("="); await page.locator(f.slice(0, i)).first().fill(f.slice(i + 1)); steps.push(`fill ${f}`); }
  for (const c of multi("--click")) { await page.locator(c).first().click(); steps.push(`click ${c}`); }

  const info = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const overflowing = [...document.querySelectorAll("body *")]
      .filter((el) => el.getBoundingClientRect().right > vw + 1 && getComputedStyle(el).position !== "fixed")
      .slice(0, 10)
      .map((el) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : ""} 右端=${Math.round(el.getBoundingClientRect().right)}px`);
    return {
      title: document.title,
      h1: [...document.querySelectorAll("h1")].map((h) => h.textContent?.trim()),
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: vw,
      overflowing,
      invalidFields: [...document.querySelectorAll("[aria-invalid=true]")].map((el) => el.id || el.getAttribute("name") || el.tagName),
      buttons: [...document.querySelectorAll("button")].slice(0, 15).map((b) => b.textContent?.trim().slice(0, 30)),
    };
  });
  mkdirSync(outDir, { recursive: true });
  const shot = path.join(outDir, `${target.replace(/\W+/g, "_")}${mobile ? "-mobile" : "-desktop"}.png`);
  await page.screenshot({ path: shot, fullPage: true });
  await browser.close();

  console.log(JSON.stringify({ url: target, status: res?.status(), viewport: mobile ? "mobile(Pixel 7)" : "desktop(1280x800)", steps, ...info, horizontalOverflowPx: Math.max(0, info.scrollWidth - info.clientWidth), jsProblems: problems, screenshot: path.relative(root, shot) }, null, 2));
} catch (e) {
  console.error(`probe 失敗: ${e.message}`);
  code = 1;
} finally {
  server.kill();
}
process.exit(code);
