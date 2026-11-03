import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeDevelopmentMove, sanitizeSourceMirror, MIRROR_UNRELIABLE_FIELDS } from "./overrides.mjs";

const ok = {
  from_url: "https://github.com/pocketbase/pocketbase", to_url: "https://ganigeorgiev.com/pocketbase/pocketbase",
  source_url: "https://github.com/pocketbase/pocketbase/discussions/7873", announced_on: "2026-10-26", checked_at: "2026-10-31", note: "  メモ  ",
};

test("開発場所の移転：公式の発表・移転先・日付がそろっていれば採用する", () => {
  const m = sanitizeDevelopmentMove(ok, "2026-10-31");
  assert.equal(m.to_url, "https://ganigeorgiev.com/pocketbase/pocketbase");
  assert.equal(m.note, "メモ");
  assert.equal(sanitizeDevelopmentMove({ ...ok, note: undefined }, "2026-10-31").note, undefined);
});

test("欠けているもの・不正なものは、推測で補わず null", () => {
  for (const k of ["from_url", "to_url", "source_url", "announced_on", "checked_at"]) assert.equal(sanitizeDevelopmentMove({ ...ok, [k]: undefined }, "2026-10-31"), null, k);
  assert.equal(sanitizeDevelopmentMove({ ...ok, to_url: "http://example.com/x" }, "2026-10-31"), null); // https のみ
  assert.equal(sanitizeDevelopmentMove({ ...ok, to_url: "javascript:alert(1)" }, "2026-10-31"), null);
  assert.equal(sanitizeDevelopmentMove({ ...ok, announced_on: "2026-02-30" }, "2026-10-31"), null); // 実在しない日付
  assert.equal(sanitizeDevelopmentMove({ ...ok, announced_on: "2026-11-05" }, "2026-10-31"), null); // 未来
  assert.equal(sanitizeDevelopmentMove({ ...ok, to_url: ok.from_url }, "2026-10-31"), null); // 移転先が同じ
  assert.equal(sanitizeDevelopmentMove(null), null);
  assert.equal(sanitizeDevelopmentMove("x"), null);
});

import { sanitizeArchiveReason } from "./overrides.mjs";

const reason = {
  kind: "maintenance-ended", text: "  公式のREADMEに…とあります。  ", source_url: "https://github.com/filebrowser/filebrowser/blob/master/README.md", checked_at: "2026-11-03",
};

test("アーカイブの理由：区分・要約・出典・確認日がそろっていれば採用する", () => {
  const r = sanitizeArchiveReason(reason, "2026-11-03");
  assert.equal(r.kind, "maintenance-ended");
  assert.equal(r.text, "公式のREADMEに…とあります。");
  assert.equal(r.successor_id, undefined);
  assert.equal(sanitizeArchiveReason({ ...reason, kind: "successor", successor_id: "univer" }, "2026-11-03").successor_id, "univer");
});

test("アーカイブの理由：欠けている・不正なものは、推測で補わず null", () => {
  for (const k of ["kind", "text", "source_url", "checked_at"]) assert.equal(sanitizeArchiveReason({ ...reason, [k]: undefined }, "2026-11-03"), null, k);
  assert.equal(sanitizeArchiveReason({ ...reason, kind: "paused" }, "2026-11-03"), null); // 区分は4つだけ（一時停止などを推測で作らない）
  assert.equal(sanitizeArchiveReason({ ...reason, text: "   " }, "2026-11-03"), null);
  assert.equal(sanitizeArchiveReason({ ...reason, source_url: "http://example.com" }, "2026-11-03"), null);
  assert.equal(sanitizeArchiveReason({ ...reason, checked_at: "2026-11-30" }, "2026-11-03"), null); // 未来
  assert.equal(sanitizeArchiveReason({ ...reason, checked_at: "2026-02-30" }, "2026-11-03"), null);
  assert.equal(sanitizeArchiveReason(null), null);
});

test("アーカイブの理由：successor_id は、英数字とハイフンだけ（リンクに使うため）", () => {
  assert.equal(sanitizeArchiveReason({ ...reason, successor_id: "../x" }, "2026-11-03").successor_id, undefined);
  assert.equal(sanitizeArchiveReason({ ...reason, successor_id: "Univer" }, "2026-11-03").successor_id, undefined);
});

const mirrorOk = { primary_url: "https://code.ffmpeg.org/FFmpeg/FFmpeg", source_url: "https://github.com/FFmpeg/FFmpeg", checked_at: "2026-11-03" };

test("ミラー：一次の開発元・根拠・確認日がそろっていれば採用し、hide_contributors は true のときだけ残す", () => {
  assert.deepEqual(sanitizeSourceMirror(mirrorOk, "2026-11-03"), mirrorOk);
  assert.equal(sanitizeSourceMirror({ ...mirrorOk, hide_contributors: true }, "2026-11-03").hide_contributors, true);
  assert.equal("hide_contributors" in sanitizeSourceMirror({ ...mirrorOk, hide_contributors: "yes" }, "2026-11-03"), false);
});

test("ミラー：欠けている・https でない・未来や存在しない日付は採用しない（推測で補わない）", () => {
  for (const bad of [
    null, "x", {}, { ...mirrorOk, primary_url: undefined }, { ...mirrorOk, source_url: "http://github.com/x/y" },
    { ...mirrorOk, checked_at: "2026-11-04" }, { ...mirrorOk, checked_at: "2026-02-30" }, { ...mirrorOk, checked_at: "" },
  ]) assert.equal(sanitizeSourceMirror(bad, "2026-11-03"), null);
});

test("ミラーで未確認にするフィールドは、ミラーの設定・履歴から取れる値だけ。Star・Fork・最終コミットは含めない", () => {
  assert.ok(MIRROR_UNRELIABLE_FIELDS.includes("scorecard_score") && MIRROR_UNRELIABLE_FIELDS.includes("releases_12mo"));
  for (const keep of ["stars_num", "forks_num", "last_commit", "freshness_days", "health_score", "contributors_num"]) assert.ok(!MIRROR_UNRELIABLE_FIELDS.includes(keep));
});
