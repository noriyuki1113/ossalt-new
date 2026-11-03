import { test } from "node:test";
import assert from "node:assert/strict";
import { ARCHIVE_REASON_LABELS, archiveNoticeTone, archivedSecurityText } from "./archive-reason.ts";

test("警告の色：後継への移行は案内、それ以外（理由不明を含む）は警告", () => {
  assert.equal(archiveNoticeTone("successor"), "info");
  for (const k of ["ended", "maintenance-ended", "unknown"] as const) assert.equal(archiveNoticeTone(k), "warn");
  assert.equal(archiveNoticeTone(undefined), "warn");
});

test("一覧の文字：理由を確認できていないものを「開発終了」と断定しない", () => {
  assert.equal(archivedSecurityText(null), "アーカイブ済み");
  assert.equal(archivedSecurityText(undefined), "アーカイブ済み");
  assert.equal(archivedSecurityText({ kind: "unknown" }), "アーカイブ済み");
  assert.equal(archivedSecurityText({ kind: "successor" }), "後継へ移行");
  assert.equal(archivedSecurityText({ kind: "ended" }), "開発終了");
  assert.equal(archivedSecurityText({ kind: "maintenance-ended" }), "開発終了");
});

test("見出しの文：不明は、理由・後継の記載が確認できないと書き、終了とは言わない", () => {
  assert.match(ARCHIVE_REASON_LABELS.unknown, /確認できません/);
  assert.doesNotMatch(ARCHIVE_REASON_LABELS.unknown, /終了/);
});
