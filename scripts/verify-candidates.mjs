#!/usr/bin/env node
/**
 * 候補リストの検証
 *
 *   scripts/candidates/*.txt （name|id|competitor|owner/repo|official_url|category|desc_ja）
 *   ↓
 *   GitHubリポジトリと公式サイトの実在をHTTPで確認
 *   ↓
 *   01_candidates.verified.json … 生存分のみ
 *   01_candidates.rejected.json … 落ちた分と理由
 *
 * GitHub API はトークン無しだと毎時60回しか使えないため、APIは使わない。
 * github.com/<owner>/<repo> への HEAD リクエスト（301/200=存在、404=不存在）で判定する。
 */

import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "scripts", "candidates");
const CONCURRENCY = 8;
const TIMEOUT_MS = 15000;

function parseLine(line, file) {
  const raw = line.trim();
  if (!raw || raw.startsWith("#")) return null;
  const parts = raw.split("|").map((s) => s.trim());
  if (parts.length < 7) {
    return { error: `フィールド不足(${parts.length}/7)`, raw, file };
  }
  const [name, id, competitor, gh, url, category, descJa] = parts;
  if (!/^[\w.-]+\/[\w.-]+$/.test(gh)) {
    return { error: `リポジトリ形式が不正: ${gh}`, raw, file };
  }
  return { name, id, competitor, gh, url, category, descJa, file };
}

async function head(url) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: ctl.signal,
      headers: { "User-Agent": "ossalt-data-check/1.0" },
    });
    return { status: res.status, location: res.headers.get("location") || "" };
  } catch (e) {
    return { status: 0, error: String(e?.name || e) };
  } finally {
    clearTimeout(timer);
  }
}

/** GitHub は 200 か 301（リネーム）なら存在扱い。404 / 0 は落とす */
async function checkRepo(gh) {
  const r = await head(`https://github.com/${gh}`);
  if (r.status === 200) return { ok: true, note: "200" };
  if (r.status === 301 || r.status === 302) {
    const m = String(r.location).match(/github\.com\/([\w.-]+\/[\w.-]+)/);
    return { ok: true, note: `redirect${m ? `->${m[1]}` : ""}`, movedTo: m ? m[1] : null };
  }
  return { ok: false, reason: r.status ? `HTTP ${r.status}` : `接続失敗(${r.error})` };
}

/** 公式サイトは 200/30x なら生存。落ちてもリポジトリが生きていれば採用可 */
async function checkSite(url) {
  if (!url) return { ok: false, reason: "URL未記入" };
  const r = await head(url);
  if (r.status >= 200 && r.status < 400) return { ok: true, note: String(r.status) };
  return { ok: false, reason: r.status ? `HTTP ${r.status}` : `接続失敗(${r.error})` };
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

const files = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith(".txt"))
  .sort();

const rows = [];
const bad = [];
for (const f of files) {
  const text = fs.readFileSync(path.join(DIR, f), "utf8");
  for (const line of text.split("\n")) {
    const r = parseLine(line, f);
    if (r?.error) bad.push(r);
    else if (r) rows.push(r);
  }
}

// id の重複を検出
const seen = new Map();
const dupes = [];
for (const r of rows) {
  if (seen.has(r.id)) dupes.push(`${r.id}（${seen.get(r.id)} と ${r.file}）`);
  else seen.set(r.id, r.file);
}

console.log(`読み込み: ${rows.length}件 / 書式エラー ${bad.length}件 / id重複 ${dupes.length}件`);
if (bad.length) bad.forEach((b) => console.log("  ERR:", b.file, b.error, "|", b.raw?.slice(0, 70)));
if (dupes.length) dupes.forEach((d) => console.log("  DUP:", d));

console.log(`\nGitHubリポジトリを確認中（並列${CONCURRENCY}）…`);
const repoResults = await mapLimit(rows, CONCURRENCY, (r) => checkRepo(r.gh));

console.log("公式サイトを確認中…");
const siteResults = await mapLimit(rows, CONCURRENCY, (r) => checkSite(r.url));

const verified = [];
const rejected = [];

rows.forEach((r, i) => {
  const repo = repoResults[i];
  const site = siteResults[i];
  const finalRepo = repo.movedTo ?? r.gh;
  const record = {
    name: r.name,
    id: r.id,
    competitor: r.competitor,
    gh: finalRepo,
    ghOriginal: r.gh,
    url: site.ok ? r.url : `https://github.com/${finalRepo}`,
    urlVerified: site.ok,
    urlNote: site.ok ? site.note : site.reason,
    category: r.category,
    descJa: r.descJa,
  };

  if (!repo.ok) {
    rejected.push({ ...record, reason: `リポジトリ ${repo.reason}` });
  } else {
    verified.push(record);
  }
});

fs.writeFileSync(
  path.join(DIR, "01_candidates.verified.json"),
  JSON.stringify(verified, null, 1)
);
fs.writeFileSync(
  path.join(DIR, "01_candidates.rejected.json"),
  JSON.stringify(rejected, null, 1)
);

const moved = verified.filter((v) => v.gh !== v.ghOriginal);
const urlFallback = verified.filter((v) => !v.urlVerified);

console.log(`\n■ 採用: ${verified.length}件`);
console.log(`■ 除外: ${rejected.length}件`);
if (moved.length) {
  console.log(`\n[リダイレクトで修正したリポジトリ ${moved.length}件]`);
  moved.forEach((m) => console.log(`  ${m.ghOriginal} -> ${m.gh}`));
}
if (urlFallback.length) {
  console.log(`\n[公式サイトが応答せずGitHubをURLにしたもの ${urlFallback.length}件]`);
  urlFallback.forEach((m) => console.log(`  ${m.id}: ${m.urlNote}`));
}
if (rejected.length) {
  console.log("\n[除外したもの]");
  rejected.forEach((m) => console.log(`  ${m.id} (${m.ghOriginal}): ${m.reason}`));
}
