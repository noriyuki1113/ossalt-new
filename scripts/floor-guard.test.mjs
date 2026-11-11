import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDiff, analyzeDiff, isProtectedPath, ruleKey, exitCodeFor, formatReport } from "./floor-guard-lib.mjs";

/** テスト用の unified diff を作る */
const diff = (file, { add = [], del = [], newFile = false, deleted = false } = {}) =>
  [
    `diff --git a/${file} b/${file}`,
    newFile ? "new file mode 100644" : deleted ? "deleted file mode 100644" : null,
    `--- ${newFile ? "/dev/null" : `a/${file}`}`,
    `+++ ${deleted ? "/dev/null" : `b/${file}`}`,
    "@@ -1,1 +1,1 @@",
    ...del.map((l) => `-${l}`),
    ...add.map((l) => `+${l}`),
  ].filter((l) => l !== null).join("\n");
const rules = (d) => analyzeDiff(d).map((f) => `${f.severity}:${f.rule}`);

test("parseDiff: 追加行・削除行・削除されたファイル", () => {
  const d = [diff("a.mjs", { add: ["x"], del: ["y"] }), diff("t.test.mjs", { del: ["z"], deleted: true })].join("\n");
  const r = parseDiff(d);
  assert.deepEqual(r.added, [{ file: "a.mjs", text: "x" }]);
  assert.deepEqual(r.removed.map((l) => l.text), ["y", "z"]);
  assert.deepEqual(r.deleted, ["t.test.mjs"]);
});

test("parseDiff: ハンク内の '+++' '---' で始まる行は内容として扱う（ヘッダーと誤認しない）", () => {
  const d = diff("a.mjs", { add: ["++i;"], del: ["-- コメント"] });
  const r = parseDiff(d);
  assert.deepEqual(r.added.map((l) => l.text), ["++i;"]);
  assert.deepEqual(r.removed.map((l) => l.text), ["-- コメント"]);
});

test("正常系: 通常の変更・文書・データでは何も出ない", () => {
  const d = [
    diff("content/tools/a.md", { add: ["本文"], del: ["旧"] }),
    diff("src/lib/a.ts", { add: ["export const x = 1;"] }),
    diff("src/lib/a.test.ts", { add: ["assert.equal(1, 1);"] }),
    diff("public/data/tools.json", { add: ['"a": 1'] }),
  ].join("\n");
  assert.deepEqual(analyzeDiff(d), []);
});

test("保護パスの変更は check、削除は block", () => {
  assert.deepEqual(rules(diff(".github/workflows/deploy-pages.yml", { add: ["x"] })), ["check:protected-path-changed"]);
  assert.deepEqual(rules(diff("scripts/sitemap-check.mjs", { add: ["x"] })), ["check:protected-path-changed"]);
  assert.deepEqual(rules(diff("scripts/seo-build-diff-lib.mjs", { add: ["x"] })), ["check:protected-path-changed"]);
  assert.deepEqual(rules(diff("src/app/robots.ts", { add: ["x"] })), ["check:protected-path-changed"]);
  assert.deepEqual(rules(diff("e2e/noindex-thin-tools.spec.ts", { add: ["x"] })), ["check:protected-path-changed"]);
  assert.deepEqual(rules(diff(".github/workflows/e2e.yml", { del: ["x"], deleted: true })), ["block:protected-path-deleted"]);
});

test("保護パスではないワークフロー・スクリプトは対象外", () => {
  assert.equal(isProtectedPath(".github/workflows/update-data.yml"), false);
  assert.equal(isProtectedPath("scripts/page-audit.mjs"), false);
  assert.equal(isProtectedPath("src/app/page.tsx"), false);
});

test("テスト: スキップの追加・テストファイルの削除は block", () => {
  assert.deepEqual(rules(diff("e2e/a.spec.ts", { add: ['test.skip(true, "x");'] })), ["block:test-skip-added"]);
  assert.deepEqual(rules(diff("src/lib/a.test.ts", { add: ["it.skip('x', () => {});"] })), ["block:test-skip-added"]);
  assert.deepEqual(rules(diff("scripts/a.test.mjs", { add: ["test('x', { skip: true }, () => {});"] })), ["block:test-skip-added"]);
  assert.deepEqual(rules(diff("src/lib/a.test.ts", { del: ["x"], deleted: true })), ["block:test-deleted"]);
  // テストファイルでないファイルの "skip" は対象外
  assert.deepEqual(rules(diff("src/lib/a.ts", { add: ["const o = { skip: true };"] })), []);
});

test("テスト: 検証の行が減ったら check（増減が同じなら出ない）", () => {
  assert.deepEqual(rules(diff("src/lib/a.test.ts", { del: ["assert.equal(a, 1);"] })), ["check:assertion-removed"]);
  assert.deepEqual(rules(diff("src/lib/a.test.ts", { del: ["assert.equal(a, 1);"], add: ["assert.equal(a, 2);"] })), []);
});

test("抑制コメント・スタブ・空のcatchは block", () => {
  assert.deepEqual(rules(diff("src/a.ts", { add: ["// @ts-ignore"] })), ["block:suppression-added"]);
  assert.deepEqual(rules(diff("src/a.tsx", { add: ["// eslint-disable-next-line"] })), ["block:suppression-added"]);
  assert.deepEqual(rules(diff("scripts/a.mjs", { add: ['throw new Error("Not implemented");'] })), ["block:unfinished-work"]);
  assert.deepEqual(rules(diff("scripts/a.mjs", { add: ["try { x(); } catch {}"] })), ["block:unfinished-work"]);
  assert.deepEqual(rules(diff("scripts/a.mjs", { add: ["try { x(); } catch (e) { handle(e); }"] })), []);
});

test("文書(.md)に書いた '@ts-ignore' 等の説明では出ない／検査自身のファイルも対象外", () => {
  assert.deepEqual(rules(diff("CLAUDE.md", { add: ["`@ts-ignore` を増やさない"] })), []);
  assert.deepEqual(rules(diff("scripts/floor-guard-lib.mjs", { add: ["const R = /@ts-ignore/;"] })), []);
});

test("CONSTRAINTS.md: 基準の削除は block、変更は check、追加は出ない、例外の追加は check", () => {
  assert.deepEqual(rules(diff("CONSTRAINTS.md", { del: ["- テストを、理由なしにスキップ・削除しない。"] })), ["block:constraint-removed"]);
  assert.deepEqual(
    rules(diff("CONSTRAINTS.md", {
      del: ["| 単体テスト | 全件成功（現在 450件） | `npm test` | 手元 |"],
      add: ["| 単体テスト | 全件成功（現在 400件） | `npm test` | 手元 |"],
    })),
    ["check:constraint-changed"],
  );
  assert.deepEqual(rules(diff("CONSTRAINTS.md", { add: ["- 新しい基準: 守る"] })), []);
  assert.deepEqual(rules(diff("CONSTRAINTS.md", { add: ["| W1 | no-any | src/x | 理由 | @a | 2026-12-01 |"] })), ["check:exception-added"]);
  // 見出し・本文・日付の行は基準ではない
  assert.deepEqual(rules(diff("CONSTRAINTS.md", { del: ["最終確認: 2026-11-11"], add: ["最終確認: 2026-12-01"] })), []);
});

test("ruleKey: 箇条書きと表の見出し。区切り行・見出し行は基準でない", () => {
  assert.equal(ruleKey("- 抑制コメントを増やさない：現在 3"), "抑制コメントを増やさない");
  assert.equal(ruleKey("| 単体テスト | 全件成功 |"), "単体テスト");
  assert.equal(ruleKey("|---|---|"), null);
  assert.equal(ruleKey("| 項目 | 基準 |"), null);
  assert.equal(ruleKey("普通の文"), null);
});

test("exitCodeFor: 既定は常に0。strict のときだけ、block があれば1", () => {
  const block = [{ severity: "block" }], check = [{ severity: "check" }];
  assert.equal(exitCodeFor(block), 0);
  assert.equal(exitCodeFor(block, { strict: true }), 1);
  assert.equal(exitCodeFor(check, { strict: true }), 0);
  assert.equal(exitCodeFor([], { strict: true }), 0);
});

test("formatReport: 問題なし／あり", () => {
  assert.match(formatReport([], { base: "origin/x" }), /問題は見つかりませんでした/);
  const r = formatReport([{ severity: "block", rule: "test-skip-added", file: "a.spec.ts", text: "test.skip" }], { base: "b", strict: true });
  assert.match(r, /弱める可能性が高い/);
  assert.match(r, /最終判断は人が行います/);
});

// ── 実際の git リポジトリでの動作（一時ディレクトリ。ネットワークなし）
const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), "floor-guard.mjs");
const sh = (cwd, args) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", ...args], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const run = (cwd, args) => {
  try { return { code: 0, out: execFileSync("node", [CLI, ...args], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout ?? ""), err: String(e.stderr ?? "") }; }
};

test("CLI: 一時リポジトリで、正常系は0、スキップの追加は表示（既定0・strictで1）、基準が無ければ2", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "floor-guard-"));
  try {
    sh(dir, ["init", "-q", "-b", "main"]);
    mkdirSync(path.join(dir, "e2e"));
    writeFileSync(path.join(dir, "e2e", "a.spec.ts"), "test('a', () => {});\n");
    sh(dir, ["add", "."]); sh(dir, ["commit", "-q", "-m", "init"]);
    sh(dir, ["checkout", "-q", "-b", "feat"]);

    const clean = run(dir, ["--base", "main", "--strict"]);
    assert.equal(clean.code, 0);
    assert.match(clean.out, /問題は見つかりませんでした/);

    // 追跡済みファイルの変更＋未追跡ファイルの追加（どちらも検出される）
    writeFileSync(path.join(dir, "e2e", "a.spec.ts"), "test.skip(true, 'x');\n");
    mkdirSync(path.join(dir, "scripts"));
    writeFileSync(path.join(dir, "scripts", "sitemap-check.mjs"), "// new\n");
    const warn = run(dir, ["--base", "main"]);
    assert.equal(warn.code, 0);
    assert.match(warn.out, /test-skip-added/);
    assert.match(warn.out, /protected-path-changed/);
    const strict = run(dir, ["--base", "main", "--strict"]);
    assert.equal(strict.code, 1);

    const nobase = run(dir, ["--base", "no-such-ref"]);
    assert.equal(nobase.code, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
