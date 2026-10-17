/**
 * 実行の上限と停止条件。上限は autodev/config.json にあり、コマンドラインで下げることはできても、
 * 設定ファイルの上限より上げることはできない（run.mjs 側で min を取る）。
 */
import { createHash } from "node:crypto";

export const DEFAULT_LIMITS = {
  maxIterations: 3, // 1回の起動で回すセッション数
  maxAttemptsPerTask: 3, // 1タスクの試行回数
  maxSameErrorRepeats: 2, // 同じエラーがこの回数続いたら停止
  maxCostUsd: 5, // 1回の起動での AI 利用額の合計（ドル）
  maxCostUsdPerSession: 2, // 1セッション（1回の claude 呼び出し）の上限
  maxWallClockMinutes: 60,
};

/** ハードキャップ。設定やコマンドラインでもこれは超えられない。 */
export const HARD_CAPS = { maxIterations: 20, maxAttemptsPerTask: 5, maxSameErrorRepeats: 5, maxCostUsd: 50, maxCostUsdPerSession: 10, maxWallClockMinutes: 240 };

export function resolveLimits(config = {}, overrides = {}) {
  const out = {};
  for (const k of Object.keys(DEFAULT_LIMITS)) {
    const wanted = overrides[k] ?? config[k] ?? DEFAULT_LIMITS[k];
    const n = Number(wanted);
    if (!Number.isFinite(n) || n <= 0) throw new Error(`上限 ${k} が不正です: ${wanted}`);
    out[k] = Math.min(n, HARD_CAPS[k], config[k] ?? Infinity, overrides[k] ?? Infinity);
  }
  return out;
}

/** 失敗ログから「同じエラーか」を比べる指紋を作る（数字・時刻・パス・一時IDの違いを無視）。 */
export function errorSignature(text) {
  const norm = String(text)
    .replace(/\x1b\[[0-9;]*m/g, "")
    .replace(/\/[\w.\-/@]*\//g, "/…/")
    .replace(/\b\d{4}-\d{2}-\d{2}[T ][\d:.]+Z?\b/g, "<time>")
    .replace(/\b[0-9a-f]{7,40}\b/g, "<hash>")
    .replace(/\d+(\.\d+)?(ms|s)?/g, "N")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
  return createHash("sha256").update(norm).digest("hex").slice(0, 16);
}

export function recordOutcome(state, { ok, signature }) {
  if (ok) return { ...state, sameErrorRepeats: 0, lastSignature: null };
  const same = signature && signature === state.lastSignature;
  return { ...state, lastSignature: signature, sameErrorRepeats: same ? state.sameErrorRepeats + 1 : 1 };
}

/** @returns {{stop: boolean, reason?: string}} */
export function checkBudget(limits, state, now = Date.now()) {
  if (state.iterations >= limits.maxIterations) return { stop: true, reason: `最大セッション数（${limits.maxIterations}）に達しました` };
  if (state.costUsd >= limits.maxCostUsd) return { stop: true, reason: `AI利用額の上限（$${limits.maxCostUsd}）に達しました（累計 $${state.costUsd.toFixed(2)}）` };
  if (state.sameErrorRepeats >= limits.maxSameErrorRepeats) return { stop: true, reason: `同じエラーが${state.sameErrorRepeats}回続いたため停止しました` };
  if ((now - state.startedAt) / 60000 >= limits.maxWallClockMinutes) return { stop: true, reason: `実行時間の上限（${limits.maxWallClockMinutes}分）に達しました` };
  return { stop: false };
}

export function newRunState(now = Date.now()) {
  return { startedAt: now, iterations: 0, costUsd: 0, sameErrorRepeats: 0, lastSignature: null };
}
