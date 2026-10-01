import { test } from "node:test";
import assert from "node:assert/strict";
import { freshnessState, starContext } from "./star-context.ts";

const all = [
  { id: "a", category: "x", stars_num: 1000 },
  { id: "b", category: "x", stars_num: 500 },
  { id: "c", category: "x", stars_num: 500 },
  { id: "d", category: "y", stars_num: 2000 },
  { id: "e", category: "y", stars_num: null },
];

test("カテゴリ内の順位（同数は同順位）", () => {
  assert.deepEqual(starContext(all[0], all), { catRank: 1, catTotal: 3, topPercent: 50 });
  assert.equal(starContext(all[1], all).catRank, 2);
  assert.equal(starContext(all[2], all).catRank, 2);
});

test("全体で上位50%を超える場合は出さない", () => {
  assert.equal(starContext(all[1], all).topPercent, null);
  assert.equal(starContext(all[3], all).topPercent, 25);
});

test("スター数が無ければ順位を出さない", () => {
  assert.deepEqual(starContext(all[4], all), { catRank: null, catTotal: 1, topPercent: null });
});

test("更新の状態", () => {
  assert.equal(freshnessState(3)?.tone, "good");
  assert.equal(freshnessState(200)?.tone, "neutral");
  assert.equal(freshnessState(500)?.tone, "warn");
  assert.equal(freshnessState(null), null);
});
