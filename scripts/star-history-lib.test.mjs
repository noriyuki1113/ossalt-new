import { test } from "node:test";
import assert from "node:assert/strict";
import { appendHistory, pruneHistory, starGain } from "./star-history-lib.mjs";

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
  assert.deepEqual(starGain(rows, 200, "2026-10-01"), { gain: 50, days: 32, from: "2026-08-30" });
});

test("履歴が短ければ、最初の記録からの期間になる", () => {
  assert.deepEqual(starGain([["2026-09-24", 100]], 130, "2026-10-01"), { gain: 30, days: 7, from: "2026-09-24" });
  assert.equal(starGain([["2026-10-01", 100]], 130, "2026-10-01"), null);
  assert.equal(starGain([], 130, "2026-10-01"), null);
});

test("古い記録は境目の直前の1件だけ残す", () => {
  const h = { a: [["2024-01-01", 1], ["2025-01-01", 2], ["2026-09-01", 3]] };
  pruneHistory(h, "2026-10-01", 400);
  assert.deepEqual(h.a, [["2025-01-01", 2], ["2026-09-01", 3]]);
});
