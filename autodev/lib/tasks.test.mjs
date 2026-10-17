import test from "node:test";
import assert from "node:assert/strict";
import { validateTasks, selectNextTask, updateTask, summarize } from "./tasks.mjs";

const base = (o = {}) => ({
  id: "AD-001", priority: 2, feature: "Cost Lab", title: "t", acceptance: ["a"], verification: [{ kind: "unit" }],
  status: "todo", attempts: 0, lastResult: null, ...o,
});

test("正しいタスクは検証を通る", () => {
  assert.deepEqual(validateTasks({ tasks: [base(), base({ id: "AD-002" })] }), []);
});

test("不正なタスクを検出する", () => {
  const errs = validateTasks({ tasks: [base({ id: "x", priority: 9, acceptance: [], verification: [{ kind: "zzz" }], status: "done" }), base({ id: "AD-001" }), base({ id: "AD-001" })] });
  assert.ok(errs.some((e) => e.includes("AD-001 の形式")));
  assert.ok(errs.some((e) => e.includes("priority")));
  assert.ok(errs.some((e) => e.includes("acceptance")));
  assert.ok(errs.some((e) => e.includes("verification.kind")));
  assert.ok(errs.some((e) => e.includes("status")));
  assert.ok(errs.some((e) => e.includes("重複")));
});

test("passed には証拠が必要", () => {
  assert.ok(validateTasks({ tasks: [base({ status: "passed" })] }).some((e) => e.includes("evidence")));
  assert.deepEqual(validateTasks({ tasks: [base({ status: "passed", lastResult: { evidence: "reports/x" } })] }), []);
});

test("次のタスク：中断中が最優先、次に優先度順、試行上限を超えたものは除く", () => {
  const doc = { tasks: [base({ id: "AD-003", priority: 1 }), base({ id: "AD-002", priority: 3, status: "in_progress" }), base({ id: "AD-001", priority: 1, attempts: 3 })] };
  assert.equal(selectNextTask(doc, { maxAttempts: 3 }).id, "AD-002");
  const doc2 = updateTask(doc, "AD-002", { status: "passed" });
  assert.equal(selectNextTask(doc2, { maxAttempts: 3 }).id, "AD-003");
  assert.equal(selectNextTask({ tasks: [base({ status: "blocked" })] }, { maxAttempts: 3 }), null);
});

test("summarize", () => {
  assert.deepEqual(summarize({ tasks: [base(), base({ id: "AD-002", status: "blocked" })] }), { todo: 1, in_progress: 0, passed: 0, failed: 0, blocked: 1 });
});
