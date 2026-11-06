/**
 * セキュリティ表示の状態（OpenSSF Scorecard と報告窓口を分ける）のテスト。
 * 実行: npm test
 */
import test from "node:test";
import assert from "node:assert/strict";
import { getSecurityFallback, scorecardState, scorecardStatusText, securityMdLabel, type Tool } from "./tools.ts";

const base = { scorecard_score: null, source_mirror: null } as Pick<Tool, "scorecard_score" | "source_mirror">;

test("Scorecard: 点数・未評価・対象外（ミラー）を区別し、未評価を0点にしない", () => {
  assert.equal(scorecardState({ ...base, scorecard_score: 6.3 }), "scored");
  assert.equal(scorecardStatusText({ ...base, scorecard_score: 6.3 }), "6.3 / 10");
  assert.equal(scorecardState(base), "unrated");
  assert.equal(scorecardStatusText(base), "未評価");
  assert.ok(!scorecardStatusText(base).includes("0"));
  const mirror = { ...base, source_mirror: { primary_url: "https://x/", source_url: "https://y/", checked_at: "2026-11-03" } };
  assert.equal(scorecardState(mirror), "mirror");
  assert.match(scorecardStatusText(mirror), /対象外/);
  // 0点は「点数あり」（未評価とは違う）
  assert.equal(scorecardState({ ...base, scorecard_score: 0 }), "scored");
});

test("報告窓口: SECURITY.md が見つからないことを「窓口が無い」と断定しない", () => {
  assert.match(securityMdLabel(true), /確認済み/);
  assert.match(securityMdLabel(false), /見つからず/);
  assert.match(securityMdLabel(false), /未確認/);
  assert.ok(!/^なし$|窓口なし|用意されていません/.test(securityMdLabel(false)));
  assert.equal(securityMdLabel(null), "未確認");
  const fb = getSecurityFallback({ github_archived: false, advisories_count: null, security_md: false, archive_reason: null } as unknown as Tool);
  assert.ok(!fb.text.includes("窓口なし"));
});
