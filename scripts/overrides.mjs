#!/usr/bin/env node
/**
 * data-source/overrides.json の読み込み（共有ヘルパー）
 *
 *   exclude: 掲載しないid（public/data/tools.jsonに出力しない）
 *   patch:   idごとに上書きする項目（例: primary_competitorの訂正）
 *   preview_block: プレビュー画像を載せないid（公式サイトの共有用画像が、その製品とは
 *                  関係のないもの＝ドキュメント生成ツールの既定の画像など、の場合）
 *
 * data-source/tools.json を直接編集するだけだと、scripts/add-tools.mjs や
 * 候補生成スクリプトの再実行で同じ問題が戻ってくる可能性があるため、
 * build-data.mjs と add-tools.mjs の両方がこのファイルを参照して
 * 同じ判断をするようにする（2026-09-30 修正指示書）。
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OVERRIDES_PATH = path.join(ROOT, "data-source", "overrides.json");

/** @returns {{ exclude: Set<string>, patch: Record<string, Record<string, unknown>>, previewBlock: Set<string> }} */
export function loadOverrides() {
  try {
    const raw = JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf8"));
    return {
      exclude: new Set(Array.isArray(raw.exclude) ? raw.exclude.map(String) : []),
      patch: raw.patch && typeof raw.patch === "object" && !Array.isArray(raw.patch) ? raw.patch : {},
      previewBlock: new Set(Array.isArray(raw.preview_block) ? raw.preview_block.map(String) : []),
    };
  } catch {
    return { exclude: new Set(), patch: {}, previewBlock: new Set() };
  }
}

/**
 * 開発場所の移転の記録（patch の development_move）を検証する。
 * 公式の発表・移転先・日付が揃っているものだけを採用し、欠けていれば null（推測で補わない）。
 *   { from_url, to_url, announced_on, source_url, checked_at, note? }
 * URL は https のみ。日付は YYYY-MM-DD で、実在する日付。未来の日付は不可。
 */
export function sanitizeDevelopmentMove(raw, today = new Date().toISOString().slice(0, 10)) {
  if (!raw || typeof raw !== "object") return null;
  const https = (v) => { try { const u = new URL(String(v)); return u.protocol === "https:" ? u.href : null; } catch { return null; } };
  const day = (v) => {
    const s = String(v ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const d = new Date(`${s}T00:00:00Z`);
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s && s <= today ? s : null;
  };
  const out = { from_url: https(raw.from_url), to_url: https(raw.to_url), source_url: https(raw.source_url), announced_on: day(raw.announced_on), checked_at: day(raw.checked_at) };
  if (Object.values(out).some((v) => v == null)) return null;
  if (out.from_url === out.to_url) return null;
  const note = typeof raw.note === "string" && raw.note.trim() ? raw.note.trim().slice(0, 300) : null;
  return note ? { ...out, note } : out;
}
