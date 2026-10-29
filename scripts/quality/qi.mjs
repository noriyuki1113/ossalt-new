#!/usr/bin/env node
/**
 * OSSALT Quality Intelligence（OSS詳細ページの品質監査）
 *
 *   npm run build                       # 先にビルド（監査はビルド済みの out/ を読む。公開サイトには接続しない）
 *   node scripts/quality/qi.mjs full    # 全件監査
 *   node scripts/quality/qi.mjs diff    # 前回から入力（データ・解説・共通テンプレート）が変わったページだけを報告
 *   node scripts/quality/qi.mjs one n8n # 個別監査（前回との比較つき。再監査にも使う）
 *   node scripts/quality/qi.mjs report [--top 20] [--p0]  # 最新の監査から一覧を出す（再計算しない）
 *
 * 出力
 *   reports/quality/<監査ID>/  ledger.csv・audit.json・summary.md・dashboard.html（Git管理外。再生成できる）
 *   quality/history/<監査ID>.json  点数・評価・警告の要約（Gitで保存する履歴。Search Consoleの数値は入れない）
 *   quality/fixes.json             修正状況の記録（手で更新する）
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import matter from "gray-matter";
import { extractFacts, pageIssues, validateJsonLd } from "../page-audit-lib.mjs";
import { RULES_VERSION, evaluatePage, priorityOf, diffAudits, shingles, jaccard, OSS_COMPETITORS, DOMAINS } from "./qi-lib.mjs";
import { renderDashboard } from "./qi-dashboard.mjs";

const argv = process.argv.slice(2);
const mode = argv[0] ?? "full";
const flag = (n) => argv.includes(n);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const ROOT = process.cwd();
const OUT = path.join(ROOT, "out");
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://ossalt.jp").replace(/\/$/, "");
const HIST = path.join(ROOT, "quality", "history");
const REPORTS = path.join(ROOT, "reports", "quality");
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
const readJson = (p, d = null) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return d; } };

function latestHistory() {
  const idx = readJson(path.join(HIST, "index.json"), { audits: [] });
  const last = idx.audits.at(-1);
  return last ? readJson(path.join(HIST, `${last.id}.json`)) : null;
}

if (mode === "report") { report(); process.exit(0); }
if (!fs.existsSync(path.join(OUT, "index.html"))) { console.error("out/ にビルド結果がありません。先に npm run build を実行してください。"); process.exit(2); }

/* ---------- 入力の収集 ---------- */
const parsed = readJson("public/data/tools.json");
const tools = Array.isArray(parsed) ? parsed : parsed.tools;
const meta = readJson("public/data/meta.json", {});
const sitemap = fs.existsSync(path.join(OUT, "sitemap.xml")) ? fs.readFileSync(path.join(OUT, "sitemap.xml"), "utf8") : "";
const inSitemap = (u) => sitemap.includes(`<loc>${SITE}${u}</loc>`);
const relations = readJson("data-source/alternative-relations.json", { relations: {} }).relations;
const relationOf = (id) => { for (const [saas, m] of Object.entries(relations)) if (m[id]) return `${m[id].relation}（${saas}）`; return null; };
const toolNames = new Set(tools.map((t) => t.name.toLowerCase()));
const fixesRaw = readJson(path.join(ROOT, "quality", "fixes.json"), {});
// { "<ツールid>": [{ date, status: "改善待ち"|"対応中"|"修正済み"|"確認済み", note, pr }] }（"_" で始まるキーは説明）
const fixes = Object.fromEntries(Object.entries(fixesRaw).filter(([k, v]) => !k.startsWith("_") && Array.isArray(v)));
// ライセンスの分類はサイトと同じ関数を使う（node --experimental-strip-types で読み込む）
const { licenseGroupOf } = await import("../../src/lib/compare.ts").catch(() => ({ licenseGroupOf: null }));

// 共通テンプレート（ここが変わると、全ページが「変更あり」になる）
const TEMPLATE_FILES = ["src/app/tools/[slug]/page.tsx", "src/lib/tool-brief.ts", "src/lib/tool-faq.ts", "src/components/tool-brief.tsx", "src/components/tool-glance.tsx", "src/components/verification-note.tsx", "scripts/quality/qi-lib.mjs"];
const templateHash = sha(TEMPLATE_FILES.map((f) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "")).join("\n") + RULES_VERSION);

// 手書きの解説
const guides = new Map();
for (const f of fs.readdirSync("content/tools").filter((x) => x.endsWith(".md"))) {
  const raw = fs.readFileSync(`content/tools/${f}`, "utf8");
  const { data, content } = matter(raw);
  guides.set(f.replace(/\.md$/, ""), { raw, body: content, glance: data.at_a_glance ?? null, verification: data.verification?.status ?? "unverified", sources: data.verification?.sources ?? [], checkedAt: data.verification?.checked_at ?? null, updated: data.updated ?? null });
}
const sh = new Map([...guides].map(([id, g]) => [id, shingles(g.body)]));

// 内部リンク（被リンク数）と、存在するページの集合
const existing = new Set();
const inbound = new Map();
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!["_next", "md", "data"].includes(e.name)) walk(p); continue; }
    if (e.name !== "index.html") continue;
    existing.add("/" + path.relative(OUT, dir).replace(/\\/g, "/") + "/");
  }
})(OUT);
existing.add("/");
for (const u of existing) {
  const html = fs.readFileSync(path.join(OUT, u, "index.html"), "utf8");
  for (const m of new Set([...html.matchAll(/href="\/tools\/([a-z0-9-]+)\/"/g)].map((x) => x[1]))) if (u !== `/tools/${m}/`) inbound.set(m, (inbound.get(m) ?? 0) + 1);
}

// 共通テンプレートの表示検査（代表ページ）。結果が無ければ実行する
function uxTemplateStatus() {
  const file = path.join(ROOT, "reports", "seo", "page-audit.json");
  const fresh = fs.existsSync(file) && fs.statSync(file).mtimeMs >= fs.statSync(path.join(OUT, "index.html")).mtimeMs;
  if (!fresh && !flag("--no-browser")) spawnSync(process.execPath, ["scripts/page-audit.mjs"], { stdio: "ignore" });
  const r = readJson(file);
  if (!r) return { status: "unknown", note: "代表ページの検査結果なし" };
  const toolPages = r.pages.filter((p) => p.url.startsWith("/tools/") && p.url !== "/tools/");
  const bad = r.issues.filter((i) => i.url.startsWith("/tools/") && i.url !== "/tools/" && i.severity !== "low");
  return { status: toolPages.length ? (bad.length ? "fail" : "pass") : "unknown", note: `代表 ${toolPages.length}ページ（${toolPages.map((p) => p.url).join(" ")}）`, generatedAt: r.generatedAt };
}
const ux = uxTemplateStatus();

// Search Console（手元にCSVがあるときだけ。数値はGitに保存しない）
function gscPages() {
  const base = path.join(ROOT, "agency", "data");
  if (!fs.existsSync(base)) return null;
  const dirs = fs.readdirSync(base).filter((d) => fs.existsSync(path.join(base, d, "ページ.csv"))).sort();
  if (!dirs.length) return null;
  const rows = fs.readFileSync(path.join(base, dirs.at(-1), "ページ.csv"), "utf8").trim().split("\n").slice(1);
  const m = new Map();
  for (const l of rows) { const x = l.match(/^(.*),(\d+),(\d+),([\d.]+)%,([\d.]+)$/); if (x) m.set(new URL(x[1]).pathname.replace(/\/?$/, "/"), { clicks: +x[2], impressions: +x[3], ctr: +x[4], position: +x[5] }); }
  return { source: dirs.at(-1), map: m };
}
const gsc = gscPages();

// FAQの定型率（ツール名を置き換えて、20ページ以上で同じ回答）
const faqCount = new Map();
const pageAnswers = new Map();
for (const t of tools) {
  const f = path.join(OUT, "tools", t.id, "index.html");
  if (!fs.existsSync(f)) continue;
  const html = fs.readFileSync(f, "utf8");
  const ans = [...html.matchAll(/<dd>([\s\S]*?)<\/dd>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").replaceAll(t.name, "◯◯").trim());
  pageAnswers.set(t.id, ans);
  for (const a of new Set(ans)) faqCount.set(a, (faqCount.get(a) ?? 0) + 1);
}

/* ---------- 監査 ---------- */
const only = mode === "one" ? argv[1] : null;
if (mode === "one" && !tools.some((t) => t.id === only)) { console.error(`掲載データに「${only}」がありません`); process.exit(2); }
const pages = [];
const failures = [];
for (const t of tools) {
  if (only && t.id !== only) continue;
  const url = `/tools/${t.id}/`;
  const file = path.join(OUT, "tools", t.id, "index.html");
  const g = guides.get(t.id) ?? null;
  const inputHash = sha(JSON.stringify({ ...t, star_gain: undefined, star_gain_7d: undefined, stars_num: undefined, forks_num: undefined, watchers_num: undefined, freshness_days: undefined, health_score: undefined }) + (g?.raw ?? "") + templateHash);
  const base = { id: t.id, name: t.name, url, category: t.category, competitor: t.primary_competitor, license: t.license, archived: !!t.github_archived, inputHash };
  if (!fs.existsSync(file)) { pages.push({ ...base, auditState: "not-audited", reason: "ページが生成されていない（out/ に無い）" }); continue; }
  try {
    const html = fs.readFileSync(file, "utf8");
    const facts = extractFacts(html);
    const seo = pageIssues({ url, expectedCanonical: `${SITE}${url}`, facts });
    const ld = validateJsonLd(facts.jsonLd, { pageText: facts.text });
    let best = null;
    if (g) for (const [oid, osh] of sh) { if (oid === t.id) continue; const s = jaccard(sh.get(t.id), osh); if (!best || s > best.score) best = { id: oid, score: s }; }
    const broken = [...new Set([...html.matchAll(/href="(\/(?:tools|compare|alternatives|categories)\/[a-z0-9-]+\/)"/g)].map((m) => m[1]))].filter((u) => !existing.has(u));
    const answers = pageAnswers.get(t.id) ?? [];
    const faqShare = answers.length ? answers.filter((a) => (faqCount.get(a) ?? 0) >= 20).length / answers.length : 0;
    const competitorIsOss = OSS_COMPETITORS.has(String(t.primary_competitor).toLowerCase()) || toolNames.has(String(t.primary_competitor).toLowerCase());
    const licenseGroup = licenseGroupOf ? licenseGroupOf(t.license) : null;
    const r = evaluatePage({ tool: t, html, facts, seoIssues: seo.issues, jsonLdOk: ld.problems.filter((p) => p.id === "jsonld-syntax").length === 0, inSitemap: inSitemap(url), noindex: /noindex/i.test(facts.robots ?? ""), inbound: inbound.get(t.id) ?? 0, guide: g, relation: relationOf(t.id), licenseGroup, maxSimilarity: best, competitorIsOss, uxTemplate: ux.status, faqShare, brokenLinks: broken });
    const pr = priorityOf(r, { impressions: gsc?.map.get(url)?.impressions ?? null });
    pages.push({ ...base, auditState: "audited", ...r, priority: pr.level, priorityReason: pr.reason, faqShare: Math.round(faqShare * 100), sources: g?.sources ?? [], verifiedAt: g?.checkedAt ?? null, fix: (fixes[t.id] ?? []).at(-1) ?? null, gsc: gsc?.map.get(url) ?? null });
  } catch (e) {
    failures.push({ id: t.id, error: String(e.message).slice(0, 200) });
    pages.push({ ...base, auditState: "failed", reason: `監査に失敗：${String(e.message).slice(0, 120)}` });
  }
}

/* ---------- 保存 ---------- */
const now = new Date();
const auditId = `${now.toISOString().slice(0, 10)}-${sha(now.toISOString() + mode).slice(0, 6)}`;
const audited = pages.filter((p) => p.auditState === "audited");
const count = (f) => pages.filter(f).length;
const summary = {
  auditId, mode, generatedAt: now.toISOString(), rulesVersion: RULES_VERSION, templateHash, dataBuiltAt: meta.built_at ?? null,
  target: pages.length, audited: audited.length, notAudited: count((p) => p.auditState === "not-audited"), failed: count((p) => p.auditState === "failed"),
  grades: { A: count((p) => p.grade === "A"), B: count((p) => p.grade === "B"), C: count((p) => p.grade === "C"), D: count((p) => p.grade === "D"), unrated: count((p) => p.auditState === "audited" && !p.grade) },
  provisional: count((p) => p.status === "provisional"),
  priority: { P0: count((p) => p.priority === "P0"), P1: count((p) => p.priority === "P1"), P2: count((p) => p.priority === "P2"), P3: count((p) => p.priority === "P3") },
  severeWarnings: count((p) => (p.warnings ?? []).some((w) => w.severity === "high")),
  duplicateContent: count((p) => (p.criteria ?? []).some((c) => c.id === "U4" && c.status === "fail")),
  noGuide: count((p) => (p.criteria ?? []).some((c) => c.id === "U1" && c.status === "fail")),
  fixes: { pending: Object.values(fixes).filter((x) => x.at(-1)?.status !== "修正済み" && x.at(-1)?.status !== "確認済み").length, done: Object.values(fixes).filter((x) => ["修正済み", "確認済み"].includes(x.at(-1)?.status)).length },
  ux, gscSource: gsc?.source ?? null,
};
const prev = latestHistory();
const diff = prev ? diffAudits(prev, { pages }) : null;

if (mode === "one") {
  const p = pages[0];
  const o = prev?.pages.find((x) => x.id === p.id);
  console.log(`# ${p.name}（${p.url}）  ${p.grade ?? (p.status === "unrated" ? "未評価" : "—")} ${p.score ?? "—"}点  確認できた割合 ${Math.round((p.coverage ?? 0) * 100)}%  優先度 ${p.priority ?? "—"}`);
  if (o) console.log(`前回（${prev.auditId}）：${o.grade ?? "—"} ${o.score ?? "—"}点 → 今回 ${p.score ?? "—"}点${o.inputHash !== p.inputHash ? "（入力に変更あり）" : "（入力の変更なし）"}`);
  for (const c of p.criteria ?? []) console.log(`- [${c.status}] ${c.domain}/${c.id} ${c.label}（${c.points}/${c.max}）：${c.basis}`);
  for (const w of p.warnings ?? []) console.log(`! [${w.severity}] ${w.message}（${w.evidence}）`);
  process.exit(0);
}

const dir = path.join(REPORTS, auditId);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "audit.json"), JSON.stringify({ summary, diffFromPrevious: diff, previousAuditId: prev?.auditId ?? null, failures, pages }, null, 2) + "\n");
fs.writeFileSync(path.join(dir, "ledger.csv"), toCsv(pages));
fs.writeFileSync(path.join(dir, "summary.md"), toMarkdown(summary, pages, diff, prev));
fs.writeFileSync(path.join(dir, "dashboard.html"), renderDashboard({ summary, pages, diff, previousAuditId: prev?.auditId ?? null }));
fs.rmSync(path.join(REPORTS, "latest"), { recursive: true, force: true });
fs.cpSync(dir, path.join(REPORTS, "latest"), { recursive: true });

if (mode === "full") {
  // Gitで残す履歴（Search Consoleの数値は入れない）
  fs.mkdirSync(HIST, { recursive: true });
  const compact = { auditId, generatedAt: summary.generatedAt, rulesVersion: RULES_VERSION, templateHash, target: summary.target, audited: summary.audited, grades: summary.grades, priority: summary.priority,
    pages: pages.map((p) => ({ id: p.id, state: p.auditState, score: p.score ?? null, grade: p.grade ?? null, status: p.status ?? null, coverage: p.coverage ?? null, priority: p.priority ?? null, warnings: (p.warnings ?? []).map((w) => w.id), failed: (p.criteria ?? []).filter((c) => c.status === "fail").map((c) => c.id), inputHash: p.inputHash })) };
  fs.writeFileSync(path.join(HIST, `${auditId}.json`), JSON.stringify(compact) + "\n");
  const idx = readJson(path.join(HIST, "index.json"), { audits: [] });
  idx.audits.push({ id: auditId, generatedAt: summary.generatedAt, rulesVersion: RULES_VERSION, audited: summary.audited, grades: summary.grades });
  fs.writeFileSync(path.join(HIST, "index.json"), JSON.stringify(idx, null, 2) + "\n");
}

const rel = path.relative(ROOT, dir);
console.log(`監査ID ${auditId}（${mode}・基準 ${RULES_VERSION}）：対象 ${summary.target}件／監査 ${summary.audited}件／未監査 ${summary.notAudited}件／失敗 ${summary.failed}件`);
console.log(`評価：A ${summary.grades.A}・B ${summary.grades.B}・C ${summary.grades.C}・D ${summary.grades.D}・未評価 ${summary.grades.unrated}（うち暫定 ${summary.provisional}）／優先度 P0 ${summary.priority.P0}・P1 ${summary.priority.P1}・P2 ${summary.priority.P2}・P3 ${summary.priority.P3}`);
if (mode === "diff") {
  console.log(diff ? `前回（${prev.auditId}）から入力が変わったページ：${diff.changedInput.length}件 ${diff.changedInput.slice(0, 30).join(" ")}\n改善 ${diff.improved.length}件・悪化 ${diff.worsened.length}件・追加 ${diff.added.length}件・削除 ${diff.removed.length}件` : "前回の監査がありません（先に full を実行）");
}
console.log(`出力：${rel}/（ledger.csv・audit.json・summary.md・dashboard.html）${mode === "full" ? `／履歴：quality/history/${auditId}.json` : ""}`);

/* ---------- 出力の整形 ---------- */
function csvCell(v) { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function toCsv(ps) {
  const head = ["id", "name", "url", "audit_state", "grade", "score", "status", "coverage", ...Object.keys(DOMAINS).map((k) => `domain_${k}`), "priority", "priority_reason", "warnings", "failed_criteria", "verified_at", "sources", "fix_status"];
  const lines = [head.join(",")];
  for (const p of ps) lines.push([p.id, p.name, p.url, p.auditState, p.grade, p.score, p.status, p.coverage, ...Object.keys(DOMAINS).map((k) => (p.domains?.[k]?.earnedRatio == null ? "" : Math.round(p.domains[k].earnedRatio * 100))), p.priority, p.priorityReason ?? p.reason, (p.warnings ?? []).map((w) => w.id).join(" "), (p.criteria ?? []).filter((c) => c.status === "fail").map((c) => c.id).join(" "), p.verifiedAt, (p.sources ?? []).join(" "), p.fix?.status].map(csvCell).join(","));
  return "﻿" + lines.join("\n") + "\n";
}
function toMarkdown(s, ps, d, prevA) {
  const top = topN(ps, 20);
  const L = [`# OSSALT Quality Intelligence 監査レポート（${s.auditId}）`, "", `- 生成：${s.generatedAt}（基準 ${s.rulesVersion}、モード ${s.mode}）`, `- 対象 ${s.target}件／監査 ${s.audited}件／未監査 ${s.notAudited}件／失敗 ${s.failed}件`, `- 評価：A ${s.grades.A}・B ${s.grades.B}・C ${s.grades.C}・D ${s.grades.D}・未評価 ${s.grades.unrated}（うち暫定 ${s.provisional}）`, `- 優先度：P0 ${s.priority.P0}・P1 ${s.priority.P1}・P2 ${s.priority.P2}・P3 ${s.priority.P3}`, `- 共通テンプレートの表示検査：${s.ux.status}（${s.ux.note}）`, `- Search Console：${s.gscSource ? `手元のCSV（${s.gscSource}）を優先度に使用。数値はこのレポートだけに出し、Gitには保存しない` : "CSVなし（検索の表示回数は使っていない）"}`, ""];
  if (d) L.push(`## 前回（${prevA.auditId}）との比較`, "", `入力が変わったページ ${d.changedInput.length}件・改善 ${d.improved.length}件・悪化 ${d.worsened.length}件・追加 ${d.added.length}件・削除 ${d.removed.length}件`, "");
  L.push("## 重大な警告（点数とは別）", "");
  const sev = ps.filter((p) => (p.warnings ?? []).some((w) => w.severity === "high"));
  if (!sev.length) L.push("なし", "");
  for (const p of sev) L.push(`- **${p.name}**（${p.url}）：${p.warnings.filter((w) => w.severity === "high").map((w) => `${w.message}［${w.evidence}］`).join("／")}`);
  L.push("", "## 改善の優先度トップ20", "", "| 順位 | OSS | 評価 | 優先度 | 理由 | 主な不足 |", "| ---: | --- | --- | --- | --- | --- |");
  top.forEach((p, i) => L.push(`| ${i + 1} | [${p.name}](${p.url}) | ${p.grade ?? "未評価"} ${p.score ?? ""} | ${p.priority} | ${p.priorityReason} | ${(p.criteria ?? []).filter((c) => c.status === "fail").map((c) => c.id).join(" ")} |`));
  L.push("", "## 未監査・失敗", "");
  for (const p of ps.filter((x) => x.auditState !== "audited")) L.push(`- ${p.id}：${p.reason}`);
  L.push("", "> 点数は、確認できた項目だけで計算しています。「未確認」は0点ではありません。検索順位や流入の改善を保証するものではありません。");
  return L.join("\n") + "\n";
}
function topN(ps, n) {
  const order = { P0: 0, P1: 1, P2: 2, P3: 3 };
  return ps.filter((p) => p.auditState === "audited").sort((a, b) => order[a.priority] - order[b.priority] || (b.gsc?.impressions ?? -1) - (a.gsc?.impressions ?? -1) || (a.score ?? 0) - (b.score ?? 0)).slice(0, n);
}
function report() {
  const f = path.join(REPORTS, "latest", "audit.json");
  const a = readJson(f);
  if (!a) { console.error("監査結果がありません。先に full を実行してください（npm run build のあと npm run qi:full）。"); process.exit(2); }
  const n = Number(opt("--top", 20));
  let ps = a.pages;
  if (flag("--p0")) ps = ps.filter((p) => p.priority === "P0");
  if (flag("--improved") && a.diffFromPrevious) { for (const x of a.diffFromPrevious.improved) console.log(`- ${x.id}：${x.from} → ${x.to}`); return; }
  console.log(`監査ID ${a.summary.auditId}（${a.summary.generatedAt}）`);
  for (const p of (flag("--p0") ? ps : topN(ps, n))) console.log(`- [${p.priority}] ${p.name} ${p.grade ?? "未評価"} ${p.score ?? ""}点：${p.priorityReason}（${p.url}）`);
}
