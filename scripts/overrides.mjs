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
