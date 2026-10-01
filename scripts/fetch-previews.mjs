#!/usr/bin/env node
/**
 * ツールのプレビュー画像（共有用の画像）の取得
 *
 *   data-source/tools.json の公式サイト（url）と GitHub のページ
 *   ↓ og:image を探す
 *   1. 公式サイトの og:image（各プロジェクトがSNSでの共有用に用意した画像）
 *   2. 無ければ GitHub のリポジトリに設定された共有用の画像
 *      （GitHubが自動で作る文字だけのカードは使わない）
 *   ↓ 横長で十分な大きさのものだけ、幅800pxのJPEGに変換（SNSでの共有用画像にも使うため、対応の広いJPEGにする）
 *   public/previews/<id>.jpg
 *   data-source/previews.json … 取得元と取得日（30日ごとに取り直す）
 *
 * 画像は ossalt.jp 自身から配信する（閲覧者のブラウザが外部のサイトに接続しないように）。
 * 表示する際は、取得元（公式サイト／GitHub）を出典として明記する。
 *
 * 使い方:
 *   node scripts/fetch-previews.mjs               … 未取得と30日以上前のものを取得
 *   node scripts/fetch-previews.mjs --ids n8n,dify … 指定したものだけ取り直す
 *   node scripts/fetch-previews.mjs --limit 50     … 件数を絞る
 *
 * 画像の変換に sharp を使う（next の依存として npm ci で入る）。
 */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { acceptDimensions, extractOgImage, isCustomGithubPreview } from "./og-image.mjs";

const ROOT = process.cwd();
const TOOLS_PATH = path.join(ROOT, "data-source", "tools.json");
const STATE_PATH = path.join(ROOT, "data-source", "previews.json");
const OUT_DIR = path.join(ROOT, "public", "previews");

const argv = process.argv.slice(2);
const flag = (name, def) => {
  const i = argv.indexOf(name);
  return i === -1 ? def : argv[i + 1];
};
const IDS = flag("--ids", null)?.split(",").map((s) => s.trim()).filter(Boolean) ?? null;
const LIMIT = Number(flag("--limit", "0")) || 0;
const RECHECK_DAYS = 30;
const CONCURRENCY = 4;
const TIMEOUT_MS = 12000;
const MAX_HTML = 2 * 1024 * 1024;
const MAX_IMAGE = 8 * 1024 * 1024;
const UA = "Mozilla/5.0 (compatible; ossalt-preview/1.0; +https://ossalt.jp/about/)";

const raw = JSON.parse(fs.readFileSync(TOOLS_PATH, "utf8"));
const tools = (Array.isArray(raw) ? raw : raw.tools).filter((t) => !t.github_archived);
const state = fs.existsSync(STATE_PATH) ? JSON.parse(fs.readFileSync(STATE_PATH, "utf8")) : {};
fs.mkdirSync(OUT_DIR, { recursive: true });

/** 大きすぎる応答を途中で打ち切りながら読む */
async function fetchLimited(url, maxBytes, accept) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctl.signal, redirect: "follow", headers: { "User-Agent": UA, Accept: accept } });
    if (!res.ok || !res.body) return null;
    const chunks = [];
    let size = 0;
    for await (const chunk of res.body) {
      size += chunk.length;
      if (size > maxBytes) {
        ctl.abort();
        return null;
      }
      chunks.push(chunk);
    }
    return { buf: Buffer.concat(chunks), finalUrl: res.url, type: res.headers.get("content-type") ?? "" };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function findImage(pageUrl) {
  const page = await fetchLimited(pageUrl, MAX_HTML, "text/html");
  if (!page || !/html/i.test(page.type)) return null;
  return extractOgImage(page.buf.toString("utf8"), page.finalUrl || pageUrl);
}

/** 画像を取得し、条件に合えばWebPに変換して保存する */
async function saveImage(imageUrl, id) {
  const img = await fetchLimited(imageUrl, MAX_IMAGE, "image/*");
  if (!img || !/^image\//i.test(img.type)) return null;
  try {
    const meta = await sharp(img.buf, { animated: false }).metadata();
    if (!acceptDimensions(meta.width, meta.height)) return null;
    const out = await sharp(img.buf, { animated: false })
      .resize({ width: 800, withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 76, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    fs.writeFileSync(path.join(OUT_DIR, `${id}.jpg`), out.data);
    return { width: out.info.width, height: out.info.height, bytes: out.data.length };
  } catch {
    return null;
  }
}

async function processTool(t) {
  const now = new Date().toISOString();
  const candidates = [];
  if (t.url && /^https?:\/\//.test(t.url)) candidates.push({ source: "official", page: t.url });
  if (t.github_url) candidates.push({ source: "github", page: t.github_url });

  for (const c of candidates) {
    const imageUrl = await findImage(c.page);
    if (!imageUrl) continue;
    if (c.source === "github" && !isCustomGithubPreview(imageUrl)) continue;
    const saved = await saveImage(imageUrl, t.id);
    if (!saved) continue;
    return { file: `/previews/${t.id}.jpg`, source: c.source, page: c.page, image: imageUrl, ...saved, checked_at: now };
  }
  // 見つからなかった（前回の画像があれば消す）
  const old = path.join(OUT_DIR, `${t.id}.jpg`);
  if (fs.existsSync(old)) fs.unlinkSync(old);
  return { file: null, checked_at: now };
}

const isDue = (t) => {
  if (IDS) return IDS.includes(t.id);
  const s = state[t.id];
  if (!s?.checked_at) return true;
  return (Date.now() - Date.parse(s.checked_at)) / 86400e3 >= RECHECK_DAYS;
};

let targets = tools.filter(isDue);
if (LIMIT) targets = targets.slice(0, LIMIT);
console.log(`対象: ${targets.length}件（全${tools.length}件）`);

let found = 0;
let i = 0;
async function worker() {
  while (i < targets.length) {
    const t = targets[i++];
    const result = await processTool(t);
    state[t.id] = result;
    if (result.file) found++;
    console.log(`${result.file ? "✓" : "—"} ${t.id}${result.file ? `（${result.source}、${Math.round(result.bytes / 1024)}KB）` : ""}`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

// 掲載から外れたツールの画像と記録を消す
const activeIds = new Set(tools.map((t) => t.id));
for (const id of Object.keys(state)) {
  if (!activeIds.has(id)) {
    delete state[id];
    const f = path.join(OUT_DIR, `${id}.jpg`);
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
}

const sorted = Object.fromEntries(Object.entries(state).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(STATE_PATH, JSON.stringify(sorted, null, 1) + "\n");
console.log(`画像あり: ${found}件 / 今回の対象 ${targets.length}件`);
