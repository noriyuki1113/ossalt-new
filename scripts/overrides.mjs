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

/**
 * アーカイブの理由（patch の archive_reason）を検証する。
 *   { kind: ended | maintenance-ended | successor | unknown, text, source_url, checked_at, successor_id? }
 * 公式の記載の要約（text）・出典（https）・確認日（実在する、未来でない日付）がそろっているものだけを採用し、
 * 欠けていれば null（推測で補わない）。
 */
export function sanitizeArchiveReason(raw, today = new Date().toISOString().slice(0, 10)) {
  if (!raw || typeof raw !== "object") return null;
  if (!["ended", "maintenance-ended", "successor", "unknown"].includes(raw.kind)) return null;
  const https = (v) => { try { const u = new URL(String(v)); return u.protocol === "https:" ? u.href : null; } catch { return null; } };
  const s = String(raw.checked_at ?? "");
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00Z`) : null;
  const checked_at = d && Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s && s <= today ? s : null;
  const text = typeof raw.text === "string" ? raw.text.trim().slice(0, 700) : "";
  const source_url = https(raw.source_url);
  if (!text || !source_url || !checked_at) return null;
  const out = { kind: raw.kind, text, source_url, checked_at };
  if (typeof raw.successor_id === "string" && /^[a-z0-9][a-z0-9-]{0,60}$/.test(raw.successor_id)) out.successor_id = raw.successor_id;
  return out;
}

/**
 * GitHub のリポジトリが「ミラー」（本当の開発場所は別）であることの記録（patch の source_mirror）を検証する。
 *   { primary_url, source_url, checked_at, hide_contributors? }
 * 一次の開発元のURL（https）・根拠のURL（https。リポジトリの説明やREADME）・確認日（実在する、未来でない日付）がそろっているものだけを採用し、
 * 欠けていれば null（推測で補わない）。採用されたツールは、ミラーの設定を採点する Scorecard や、ミラーに無い Releases・SECURITY.md・
 * Dependabot・アドバイザリの値を「未確認」として扱う（build-data が null にする）。
 */
export function sanitizeSourceMirror(raw, today = new Date().toISOString().slice(0, 10)) {
  if (!raw || typeof raw !== "object") return null;
  const https = (v) => { try { const u = new URL(String(v)); return u.protocol === "https:" ? u.href : null; } catch { return null; } };
  const s = String(raw.checked_at ?? "");
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00Z`) : null;
  const checked_at = d && Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s && s <= today ? s : null;
  const primary_url = https(raw.primary_url), source_url = https(raw.source_url);
  if (!primary_url || !source_url || !checked_at) return null;
  return { primary_url, source_url, checked_at, ...(raw.hide_contributors === true ? { hide_contributors: true } : {}) };
}

/** ミラーの数値として「未確認（null）」にするフィールド */
export const MIRROR_UNRELIABLE_FIELDS = ["scorecard_score", "scorecard_date", "scorecard_checks", "security_md", "dependabot_configured", "latest_release_at", "releases_12mo", "advisories_count"];
