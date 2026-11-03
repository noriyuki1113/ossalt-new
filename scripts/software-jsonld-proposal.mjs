#!/usr/bin/env node
/**
 * 構造化データ（SoftwareApplication）の修正案を、代表のツールで作り、検査する（読み取り専用・サイトは変更しない）。
 *   node --experimental-strip-types scripts/software-jsonld-proposal.mjs [--ids notesnook,vikunja,gitea,vaultwarden,n8n] [--out docs/audits/software-application-jsonld-20261031.md]
 * 現行の構造化データは、ビルド済みの out/ から読む（無ければ「未取得」）。
 */
import fs from "node:fs";
import path from "node:path";
import { buildSoftwareApplicationJsonLd, checkSoftwareApplication } from "../src/lib/software-jsonld.ts";

const ROOT = process.cwd();
const arg = (n, d) => { const i = process.argv.indexOf(n); return i === -1 ? d : process.argv[i + 1]; };
const ids = (arg("--ids", "notesnook,vikunja,gitea,vaultwarden,n8n")).split(",").map((s) => s.trim()).filter(Boolean);
const tools = JSON.parse(fs.readFileSync(path.join(ROOT, "public/data/tools.json"), "utf8"));
const pricing = JSON.parse(fs.readFileSync(path.join(ROOT, "data-source/pricing-facts.json"), "utf8"));
const site = { siteName: "ossalt.jp", siteUrl: "https://ossalt.jp" };

function current(id) {
  try {
    const h = fs.readFileSync(path.join(ROOT, "out/tools", id, "index.html"), "utf8");
    return [...h.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])).find((x) => x["@type"] === "SoftwareApplication") ?? null;
  } catch { return null; }
}
const L = ["# SoftwareApplication の構造化データ：代表のツールでの修正案と検証", "",
  `- 作成：${new Date().toISOString().slice(0, 10)}／根拠：Google検索セントラル「Software app」（最終更新 2026-09-08、確認日 2026-10-31）`,
  "- **サイトの出力は変更していません**（この文書と、純粋関数・テスト・価格の事実のデータだけ）。全ページへの反映は、結果を見たうえで、別に承認を取ります", ""];
for (const id of ids) {
  const t = tools.find((x) => x.id === id);
  if (!t) { L.push(`## ${id}`, "", "掲載データに無い（スキップ）", ""); continue; }
  const before = current(id);
  const after = buildSoftwareApplicationJsonLd({ tool: t, ...site, pricing: pricing[id] ?? null });
  const chk = checkSoftwareApplication(after);
  const chkBefore = before ? checkSoftwareApplication(before) : null;
  L.push(`## ${t.name}（/tools/${id}/）`, "",
    `- ライセンス：${t.license ?? "未取得"}／カテゴリ：${t.category}／確認済みの価格の事実：${pricing[id] ? `あり（${pricing[id].basis}、${pricing[id].checked_at}）` : "**なし**"}`,
    `- 現行の検査：${chkBefore ? (chkBefore.problems.join("；") || "問題なし") : "未取得（out/ が無い）"}`,
    `- 修正案の検査：${chk.problems.join("；") || "問題なし"}。注記：${chk.notes.join("；")}`, "",
    "現行：", "```json", JSON.stringify(before, null, 2) ?? "null", "```", "修正案：", "```json", JSON.stringify(after, null, 2), "```", "");
}
const out = arg("--out", null);
if (out) { fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); fs.writeFileSync(out, L.join("\n") + "\n"); console.log(`保存：${out}`); } else console.log(L.join("\n"));
