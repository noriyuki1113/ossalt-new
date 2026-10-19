#!/usr/bin/env node
/**
 * 選んだ候補の openalternative.co/<slug> ページを取得し、
 * GitHub リポジトリ・代替SaaS・公式サイトを補完して、
 * 「ツール追加」ワークフローに貼れる pending.txt 形式で出力する。
 *
 * 使い方:
 *   node scripts/enrich-openalt-candidates.mjs --only slug1,slug2
 *
 * 出力: scripts/candidates/openalt-pending.txt
 *   形式: name|id|competitor|owner/repo|official_url|category|desc_ja
 *   ※ competitor / category / desc_ja は確定していないため、
 *     プレースホルダを入れて出力する。ワークフローに貼る前に
 *     あなたがこの3つを埋めること（desc_ja は日本語で）。
 */

import fs from "node:fs";
import path from "node:path";
import { extractPageFacts } from "./discovery/openalt.mjs";
import { indexTools } from "./discovery/lib.mjs";

const ROOT = process.cwd();
const CAND_JSON = path.join(ROOT, "docs", "openalt-candidates.json");
const OUT = path.join(ROOT, "scripts", "candidates", "openalt-pending.txt");
const CONCURRENCY = 3;
const TIMEOUT_MS = 12000;

const args = process.argv;
const onlyIdx = args.indexOf("--only");
if (onlyIdx === -1 || !args[onlyIdx + 1]) {
  console.error("使い方: node scripts/enrich-openalt-candidates.mjs --only slug1,slug2");
  process.exit(1);
}
const wanted = args[onlyIdx + 1].split(",").map((s) => s.trim()).filter(Boolean);

const all = JSON.parse(fs.readFileSync(CAND_JSON, "utf8"));
const toolIdx = indexTools(JSON.parse(fs.readFileSync(path.join(ROOT, "data-source", "tools.json"), "utf8")));
const targets = all.filter((e) => wanted.includes(e.slug));
const missing = wanted.filter((w) => !targets.some((t) => t.slug === w));
if (missing.length) console.warn(`候補一覧に無い slug: ${missing.join(", ")}`);

async function get(url, attempt = 1) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: { "User-Agent": "ossalt-candidate-enricher" },
    });
    if ((res.status === 403 || res.status === 429) && attempt <= 3) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      return get(url, attempt + 1);
    }
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    })
  );
  return out;
}

console.log(`補完対象: ${targets.length}件（並列${CONCURRENCY}）…`);

const results = await mapLimit(targets, CONCURRENCY, async (e) => {
  const html = await get(`https://openalternative.co/${e.slug}`);
  if (!html) return { ...e, error: "ページ取得失敗" };

  // 公式リポジトリの手がかり。ページにリポジトリが複数あるときは決めずに保留する（確認キューと同じ判定）
  const facts = extractPageFacts(html);
  if (!facts.repo) {
    return { ...e, error: facts.confidence === "ambiguous" ? `GitHub リポジトリが複数あり特定できない（${facts.candidates.map((c) => c.repo).join(", ")}）` : "GitHub リポジトリを特定できない" };
  }
  const gh = facts.repo;
  // 掲載済みのリポジトリ（旧名を含む）なら、名前が違っても重複として止める
  const dupId = toolIdx.get(gh);
  if (dupId) return { ...e, error: `公式リポジトリが掲載済み（${dupId}）` };
  const competitor = facts.competitor;
  const website = facts.website;
  return { ...e, gh, competitor, website };
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const lines = [];
for (const r of results) {
  if (r.error) {
    console.warn(`保留: ${r.slug} (${r.error})`);
    continue;
  }
  // name|id|competitor|owner/repo|official_url|category|desc_ja
  // competitor / category / desc_ja は要人手補完のプレースホルダ
  lines.push(
    `${r.name}|${r.slug}|${r.competitor ?? "TODO_代替SaaS"}|${r.gh}|${r.website ?? "TODO_公式URL"}|TODO_カテゴリ|TODO_日本語説明（英語: ${(r.description ?? "").slice(0, 80)}）`
  );
}
fs.writeFileSync(OUT, lines.join("\n") + "\n");

console.log(`\n■ 補完成功: ${lines.length}件 → ${OUT}`);
console.log("次: TODO_ の3箇所（代替SaaS / カテゴリ / 日本語説明）を埋めて、");
console.log("GitHub の Actions → ツール追加 → Run workflow に貼る。");
