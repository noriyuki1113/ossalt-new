#!/usr/bin/env node
/**
 * OSS詳細ページ（/tools/<id>/）の一括監査（読み取り専用・ネットワーク不使用）。
 * ビルド済みの out/ と public/data/tools.json、content/tools を読み、ページごとの問題を重大度つきで出す。
 *   npm run build && node scripts/tool-pages-audit.mjs [--dir out] [--out-dir reports/seo] [--md docs/audits/tool-pages-20261028.md]
 * 判定は「HTMLとデータに書かれている事実」だけ。検索順位・流入への影響は推測しない。
 * noindex の提案は『人手で確認する候補』であり、Search Console の流入を確認せずに実行しない。
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { extractFacts, pageIssues } from "./page-audit-lib.mjs";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const root = path.resolve(arg("--dir", "out"));
const outDir = path.resolve(arg("--out-dir", "reports/seo"));
const mdOut = arg("--md", null);
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://ossalt.jp").replace(/\/$/, "");

const parsed = JSON.parse(fs.readFileSync("public/data/tools.json", "utf8"));
const tools = Array.isArray(parsed) ? parsed : parsed.tools;
const meta = JSON.parse(fs.readFileSync("public/data/meta.json", "utf8"));
const sitemap = fs.existsSync(path.join(root, "sitemap.xml")) ? fs.readFileSync(path.join(root, "sitemap.xml"), "utf8") : "";
const inSitemap = (u) => sitemap.includes(`<loc>${SITE}${u}</loc>`);

// 手書き解説
const guides = new Map();
for (const f of fs.readdirSync("content/tools").filter((x) => x.endsWith(".md"))) {
  const { data, content } = matter(fs.readFileSync(`content/tools/${f}`, "utf8"));
  guides.set(f.replace(/\.md$/, ""), { bodyChars: content.replace(/\s+/g, "").length, glance: !!data.at_a_glance, verification: data.verification?.status ?? "unverified", updated: data.updated });
}

// 内部リンク（全ページを走査して、/tools/<id>/ への被リンク数を数える）
const inbound = new Map();
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!["_next", "md", "data"].includes(e.name)) walk(p); continue; }
    if (e.name !== "index.html") continue;
    const self = "/" + path.relative(root, dir).replace(/\\/g, "/") + "/";
    const html = fs.readFileSync(p, "utf8");
    for (const m of new Set([...html.matchAll(/href="\/tools\/([a-z0-9-]+)\/"/g)].map((x) => x[1]))) {
      if (self === `/tools/${m}/`) continue;
      inbound.set(m, (inbound.get(m) ?? 0) + 1);
    }
  }
})(root);

const norm = (s, name) => String(s).replaceAll(name, "◯◯").replace(/\s+/g, " ").trim();
const pages = [];
const descCount = new Map();
const faqCount = new Map();
for (const t of tools) {
  const file = path.join(root, "tools", t.id, "index.html");
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, "utf8");
  const facts = extractFacts(html);
  const answers = [...html.matchAll(/<dd>([\s\S]*?)<\/dd>/g)].map((m) => norm(m[1].replace(/<[^>]+>/g, ""), t.name));
  pages.push({ t, html, facts, answers });
  if (facts.description) descCount.set(facts.description, [...(descCount.get(facts.description) ?? []), t.id]);
  for (const a of new Set(answers)) faqCount.set(a, (faqCount.get(a) ?? 0) + 1);
}

const rows = [];
for (const { t, html, facts, answers } of pages) {
  const url = `/tools/${t.id}/`;
  const g = guides.get(t.id);
  const base = pageIssues({ url, expectedCanonical: `${SITE}${url}`, facts });
  const issues = base.issues.filter((i) => !["og-incomplete", "title-long", "img-no-size"].includes(i.id)).map((i) => ({ ...i }));
  const add = (id, severity, message, evidence) => issues.push({ id, severity, url, message, evidence });
  const noindex = /noindex/i.test(facts.robots ?? "");
  if (noindex && inSitemap(url)) add("noindex-in-sitemap", "high", "noindexなのにsitemap.xmlに載っている", `robots=${facts.robots}`);
  if (!noindex && !inSitemap(url)) add("indexable-not-in-sitemap", "high", "インデックス対象なのにsitemap.xmlに無い", url);
  // ライセンス：データにあるライセンス表記が、ページ本文に出ているか
  if (t.license && !facts.text.includes(String(t.license).replace(/\s*\(.*\)$/, ""))) add("license-not-on-page", "high", "データのライセンス表記がページ本文に見当たらない", `data=${t.license}`);
  // 公式出典
  const hasOfficial = (t.url && html.includes(`href="${t.url}"`)) || html.includes(`href="${t.github_url}"`);
  if (!hasOfficial) add("no-official-link", "high", "公式サイト・GitHubへのリンクが無い", `url=${t.url} github=${t.github_url}`);
  // データ鮮度
  if (!/取得日|データの取得|最終コミット/.test(facts.text)) add("no-data-date", "medium", "データの取得日・最終コミットがページ本文に出ていない", "");
  // 説明文の重複
  if (facts.description && (descCount.get(facts.description) ?? []).length > 1) add("description-duplicate", "medium", `descriptionが${descCount.get(facts.description).length}ページで同じ`, facts.description.slice(0, 80));
  // FAQの機械的な繰り返し：正規化した回答が、多くのページに同じ文で出る
  const shared = answers.filter((a) => (faqCount.get(a) ?? 0) >= 20).length;
  const faqShare = answers.length ? shared / answers.length : 0;
  // 独自の本文：手書きの解説があるか。無いものは、自動の要約とデータの表示が中心
  const own = g?.bodyChars ?? 0;
  const hasGuide = !!g;
  if (!hasGuide) add("no-guide", own === 0 && faqShare >= 0.6 ? "medium" : "low", "手書きの解説が無い（自動の要約とデータが中心）", `FAQの定型率=${Math.round(faqShare * 100)}%`);
  else if (own < 600) add("thin-guide", "medium", "手書きの解説が短い（600字未満）", `${own}字`);
  if (t.github_archived) add("archived", "medium", "アーカイブ済み（開発終了）のOSS", "noindexにするかは別途判断");
  if (hasGuide && !g.glance) add("no-glance", "low", "「30秒で」要約が無い", "");
  if (hasGuide && g.verification === "unverified") add("unverified", "low", "解説の検証状態が未検証", "");
  if ((inbound.get(t.id) ?? 0) < 3) add("few-inbound", "low", `内部リンクが少ない（${inbound.get(t.id) ?? 0}ページから）`, "");
  const worst = issues.some((i) => i.severity === "high") ? "high" : issues.some((i) => i.severity === "medium") ? "medium" : issues.some((i) => i.severity === "low") ? "low" : "ok";
  rows.push({ id: t.id, name: t.name, url, worst, hasGuide, ownChars: own, glance: !!g?.glance, verification: g?.verification ?? "unverified", inbound: inbound.get(t.id) ?? 0, faqShare: Math.round(faqShare * 100), noindex, archived: !!t.github_archived, issues });
}

const count = (f) => rows.filter(f).length;
const summary = {
  generatedAt: new Date().toISOString(),
  dataBuiltAt: meta.built_at,
  pages: rows.length,
  listed: meta.tool_count,
  worst: { high: count((r) => r.worst === "high"), medium: count((r) => r.worst === "medium"), low: count((r) => r.worst === "low"), ok: count((r) => r.worst === "ok") },
  withGuide: count((r) => r.hasGuide),
  withGlance: count((r) => r.glance),
  noindex: count((r) => r.noindex),
  byIssue: Object.fromEntries([...new Set(rows.flatMap((r) => r.issues.map((i) => i.id)))].map((id) => [id, { severity: rows.flatMap((r) => r.issues).find((i) => i.id === id).severity, pages: count((r) => r.issues.some((i) => i.id === id)) }])),
};
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "tool-pages-audit.json"), JSON.stringify({ summary, rows }, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));

if (mdOut) {
  const sev = { high: "重大", medium: "中程度", low: "軽微", ok: "問題なし" };
  const L = [
    "# OSS詳細ページ監査（全ページ）", "",
    `- 生成：${summary.generatedAt}（データの取得日：${meta.built_at}）`,
    `- 対象：${summary.pages}ページ（掲載中${summary.listed}件＋アーカイブ済みなど。\`out/tools/<id>/\` に出力されたすべて）`,
    `- 方法：\`node scripts/tool-pages-audit.mjs\`（ビルド済みHTMLとデータの照合。ネットワーク不使用。順位・流入への影響は推測しない）`,
    "", "## 集計（ページの最悪の重要度）", "",
    `| 重大 | 中程度 | 軽微 | 問題なし |`, `| ---: | ---: | ---: | ---: |`,
    `| ${summary.worst.high} | ${summary.worst.medium} | ${summary.worst.low} | ${summary.worst.ok} |`, "",
    `手書きの解説あり：${summary.withGuide}件／「30秒で」要約あり：${summary.withGlance}件／noindex：${summary.noindex}件`, "",
    "## 問題の種類ごとの件数", "", "| 問題 | 重要度 | ページ数 |", "| --- | --- | ---: |",
    ...Object.entries(summary.byIssue).sort((a, b) => ({ high: 0, medium: 1, low: 2 })[a[1].severity] - ({ high: 0, medium: 1, low: 2 })[b[1].severity] || b[1].pages - a[1].pages).map(([id, v]) => `| ${id} | ${sev[v.severity]} | ${v.pages} |`),
    "", "## 重大・中程度の問題があるページ", "",
  ];
  for (const r of rows.filter((r) => r.worst === "high")) L.push(`- **${r.id}**：${r.issues.filter((i) => i.severity === "high").map((i) => `${i.id}（${i.evidence}）`).join("、")}`);
  L.push("", "## ページ別一覧", "", "| ページ | 最悪 | 手書き（字） | 要約 | 被リンク | FAQ定型率 | 問題 |", "| --- | --- | ---: | :-: | ---: | ---: | --- |");
  for (const r of rows) L.push(`| ${r.id} | ${sev[r.worst]} | ${r.ownChars || "—"} | ${r.glance ? "○" : ""} | ${r.inbound} | ${r.faqShare}% | ${r.issues.filter((i) => i.severity !== "low").map((i) => i.id).join(" ")} |`);
  fs.mkdirSync(path.dirname(path.resolve(mdOut)), { recursive: true });
  fs.writeFileSync(path.resolve(mdOut), L.join("\n") + "\n");
}
