import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateEntry } from "./seo-effect-lib.mjs";

const cond = (from, to) => ({ from, to, days: 28, searchType: "web", country: { value: "all" }, device: { value: "all" }, brandFiltered: true });
const exp = (from, to, page, extra = {}) => ({ conditions: cond(from, to), sample: false, pages: { rows: [page] }, pairs: null, queries: null, rawRows: { pages: 10 }, ...extra });
const page = (impressions, position, clicks = 5) => ({ label: "https://ossalt.jp/alternatives/notion/", kind: "page", clicks, impressions, ctr: clicks / impressions, position });
const entry = { id: 1, date: "2026-10-06", url: "https://ossalt.jp/alternatives/notion/", query: "notion 代替" };
const before = (p) => exp("2026-09-08", "2026-10-05", p);
const after = (p, from = "2026-10-13", to = "2026-11-09") => exp(from, to, p);

test("同条件で順位とCTRが改善 → 『改善の兆候』（断定しない）。記録候補は improved", () => {
  const r = evaluateEntry(entry, before(page(200, 14, 3)), after(page(210, 11, 6)));
  assert.match(r.verdict, /改善の兆候/);
  assert.equal(r.suggestedOutcome, "improved");
  assert.ok(r.caveats.some((c) => c.includes("因果は証明できない")));
});

test("表示回数が少ないと評価不能", () => {
  const r = evaluateEntry(entry, before(page(20, 14)), after(page(30, 9)));
  assert.match(r.verdict, /評価不能/);
  assert.equal(r.suggestedOutcome, "not-assessable");
});

test("後の期間が変更日をまたぐ・前の期間が変更日以降なら、評価不能", () => {
  const r = evaluateEntry(entry, exp("2026-09-15", "2026-10-12", page(200, 14)), after(page(210, 11)));
  assert.match(r.verdict, /評価不能（条件/);
});

test("変更直後に始まる後期間は注意、同じURLの他の変更は切り分け不能と注記", () => {
  const r = evaluateEntry(entry, before(page(200, 14)), after(page(210, 11), "2026-10-08", "2026-11-04"), { otherEntries: [{ id: 2, date: "2026-10-20", url: entry.url }] });
  assert.ok(r.conditionWarnings.some((w) => w.includes("再クロール")));
  assert.ok(r.conditionWarnings.some((w) => w.includes("他の変更")));
});

test("クエリ×ページのCSVが無いと、対象クエリの前後は未確認と明示", () => {
  const r = evaluateEntry(entry, before(page(200, 14)), after(page(210, 11)));
  assert.ok(r.unverified.some((u) => u.includes("クエリ×ページ")));
});

test("行が無いときは、表示ゼロと決めつけず評価不能", () => {
  const r = evaluateEntry(entry, before(page(200, 14)), { ...after(page(210, 11)), pages: { rows: [] } });
  assert.match(r.verdict, /行が無い/);
});
