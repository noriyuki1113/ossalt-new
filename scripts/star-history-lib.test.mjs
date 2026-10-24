import { test } from "node:test";
import assert from "node:assert/strict";
import { appendHistory, jstDate, pruneHistory, starGain } from "./star-history-lib.mjs";

test("値が変わったときだけ記録し、同じ日は上書きする", () => {
  const h = {};
  appendHistory(h, [{ id: "a", stars_num: 10 }], "2026-09-01");
  appendHistory(h, [{ id: "a", stars_num: 10 }], "2026-09-02");
  appendHistory(h, [{ id: "a", stars_num: 12 }], "2026-09-03");
  appendHistory(h, [{ id: "a", stars_num: 13 }], "2026-09-03");
  appendHistory(h, [{ id: "b", stars_num: null }], "2026-09-03");
  assert.deepEqual(h, { a: [["2026-09-01", 10], ["2026-09-03", 13]] });
});

test("直近30日の増加：期間の開始日以前の最後の記録が起点", () => {
  const rows = [["2026-08-01", 100], ["2026-08-30", 150], ["2026-09-10", 180]];
  assert.deepEqual(starGain(rows, 200, "2026-10-01"), { gain: 50, days: 32, from: "2026-08-30", to: "2026-10-01" });
});

test("履歴が短ければ、最初の記録からの期間になる", () => {
  assert.deepEqual(starGain([["2026-09-24", 100]], 130, "2026-10-01"), { gain: 30, days: 7, from: "2026-09-24", to: "2026-10-01" });
  assert.equal(starGain([["2026-10-01", 100]], 130, "2026-10-01"), null);
  assert.equal(starGain([], 130, "2026-10-01"), null);
});

test("古い記録は境目の直前の1件だけ残す", () => {
  const h = { a: [["2024-01-01", 1], ["2025-01-01", 2], ["2026-09-01", 3]] };
  pruneHistory(h, "2026-10-01", 400);
  assert.deepEqual(h.a, [["2025-01-01", 2], ["2026-09-01", 3]]);
});

test("7日間（strict）：7日以上前の実測が無ければ出さない。間隔が空きすぎても出さない", () => {
  // 4日おきの取得：10/23 の7日前（10/16）以前で最後の記録は 10/15 → 8日間
  const rows = [["2026-10-11", 100], ["2026-10-15", 110], ["2026-10-19", 125]];
  assert.deepEqual(starGain(rows, 140, "2026-10-23", 7, { strict: true, maxDays: 10 }), { gain: 30, days: 8, from: "2026-10-15", to: "2026-10-23" });
  // 記録が4日分しか無い：短い期間で代用しない
  assert.equal(starGain([["2026-10-19", 125]], 140, "2026-10-23", 7, { strict: true, maxDays: 10 }), null);
  // 7日以上前の記録はあるが、20日も前（値が変わらず記録が無かった等）：比べられない
  assert.equal(starGain([["2026-10-03", 125]], 140, "2026-10-23", 7, { strict: true, maxDays: 10 }), null);
});

test("取得日時を日本時間の日付にする", () => {
  assert.equal(jstDate("2026-10-23T20:47:58.422Z"), "2026-10-24");
  assert.equal(jstDate("2026-10-23T10:00:00Z"), "2026-10-23");
  assert.equal(jstDate(undefined), null);
  assert.equal(jstDate("broken"), null);
});
