import test from "node:test";
import assert from "node:assert/strict";
import { resolveLimits, checkBudget, errorSignature, recordOutcome, newRunState, DEFAULT_LIMITS, HARD_CAPS } from "./budget.mjs";

test("上限は設定とコマンドラインの小さいほう。ハードキャップは超えない", () => {
  assert.equal(resolveLimits({ maxCostUsd: 3 }, { maxCostUsd: 10 }).maxCostUsd, 3);
  assert.equal(resolveLimits({ maxCostUsd: 3 }, { maxCostUsd: 1 }).maxCostUsd, 1);
  assert.equal(resolveLimits({ maxIterations: 999 }).maxIterations, HARD_CAPS.maxIterations);
  assert.equal(resolveLimits({}).maxIterations, DEFAULT_LIMITS.maxIterations);
  assert.throws(() => resolveLimits({ maxCostUsd: 0 }));
  assert.throws(() => resolveLimits({}, { maxIterations: "abc" }));
});

test("停止条件：回数・金額・同一エラー・時間", () => {
  const limits = resolveLimits({ maxIterations: 2, maxCostUsd: 1, maxSameErrorRepeats: 2, maxWallClockMinutes: 10 });
  const s = newRunState(0);
  assert.equal(checkBudget(limits, s, 1000).stop, false);
  assert.match(checkBudget(limits, { ...s, iterations: 2 }, 1000).reason, /最大セッション数/);
  assert.match(checkBudget(limits, { ...s, costUsd: 1.01 }, 1000).reason, /利用額/);
  assert.match(checkBudget(limits, { ...s, sameErrorRepeats: 2 }, 1000).reason, /同じエラー/);
  assert.match(checkBudget(limits, s, 11 * 60000).reason, /実行時間/);
});

test("同じエラーの連続を数える。成功でリセット。数字やパスの違いは同じエラー", () => {
  const a = errorSignature("Error at /tmp/x/123/file.ts:45 expected 3 got 4 (123ms)");
  const b = errorSignature("Error at /tmp/y/999/file.ts:99 expected 8 got 9 (7ms)");
  const c = errorSignature("TypeError: undefined is not a function");
  assert.equal(a, b);
  assert.notEqual(a, c);
  let st = newRunState(0);
  st = recordOutcome(st, { ok: false, signature: a });
  st = recordOutcome(st, { ok: false, signature: b });
  assert.equal(st.sameErrorRepeats, 2);
  st = recordOutcome(st, { ok: false, signature: c });
  assert.equal(st.sameErrorRepeats, 1);
  st = recordOutcome(st, { ok: true });
  assert.equal(st.sameErrorRepeats, 0);
});
