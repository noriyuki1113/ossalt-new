import test from "node:test";
import assert from "node:assert/strict";
import { renderPrBody } from "./pr.mjs";

test("PR本文に必要な見出しがすべてある", () => {
  const md = renderPrBody({
    task: { id: "AD-009", title: "直す", feature: "Cost Lab", acceptance: ["a", "b"] },
    branch: "autodev/AD-009",
    files: ["src/x.ts"],
    verification: { steps: [{ name: "単体テスト", ok: true, detail: "10件" }], e2e: { passed: 70, failed: 0, flaky: 0 }, evidenceDir: "reports/qa/runs/x", notes: ["残り1"] },
    before: "Error: x", after: "全テスト成功", limits: { maxCostUsd: 5 }, costUsd: 0.5,
  });
  for (const h of ["## 解決した課題", "## 修正したファイル", "## テスト結果", "## ブラウザ検証結果", "## 修正前後の証拠", "## 既知の制約・残課題"]) assert.ok(md.includes(h), h);
  assert.match(md, /自動マージ・本番公開は行いません/);
  assert.match(md, /成功 70/);
});
