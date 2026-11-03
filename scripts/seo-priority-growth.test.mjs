import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreRow, trendFactor, qiFactor, intentFit } from "./seo-priority.mjs";

const pair = (o = {}) => ({ kind: "pair", label: "q → p", query: "notion 代替", page: "https://ossalt.jp/alternatives/notion/", clicks: 3, impressions: 200, ctr: 0.015, position: 12, ...o });
const bands = {};

test("拡張の入力が無いとき、点数は従来の係数だけで決まり、データ不足を列挙する", () => {
  const s = scoreRow(pair(), { bands });
  assert.ok(s.score > 0);
  assert.ok(s.dataGaps.some((g) => g.startsWith("前期間比較")));
  assert.ok(s.dataGaps.some((g) => g.startsWith("内容の充実度")));
  assert.ok(s.dataGaps.includes("AI Overview・SERP機能：未確認"));
});

test("前期間で順位が下がっていると点数が上がり、すでに改善中だと下がる。低サンプルは効かせない", () => {
  const base = scoreRow(pair(), { bands }).score;
  const worse = scoreRow(pair({ cmp: { status: "both", lowSample: false, dPosition: 3, dImpressionsRatio: 0 } }), { bands }).score;
  const better = scoreRow(pair({ cmp: { status: "both", lowSample: false, dPosition: -3, dImpressionsRatio: 0 } }), { bands }).score;
  const low = scoreRow(pair({ cmp: { status: "both", lowSample: true, dPosition: 9 } }), { bands }).score;
  assert.ok(worse > base && better < base);
  assert.equal(low, base);
  assert.equal(trendFactor({ status: "unverifiable" }).used, false);
});

test("QI評価：Cは余地が大きく、Aは小さい。未確認は効かせない", () => {
  assert.ok(qiFactor({ grade: "C" }).value > 1);
  assert.ok(qiFactor({ grade: "A" }).value < 1);
  assert.equal(qiFactor(null).used, false);
  assert.equal(qiFactor({ grade: "X" }).used, false);
});

test("検索意図とページ種別が合わないと点数が下がる（新規ページの前に意図を確認、という扱い）", () => {
  assert.equal(intentFit("vs", "compare"), true);
  assert.equal(intentFit("vs", "tools"), false);
  assert.equal(intentFit("other", "tools"), null);
  const ok = scoreRow(pair({ query: "notion 代替" }), { bands });
  const ng = scoreRow(pair({ query: "notion 代替", page: "https://ossalt.jp/licenses/permissive/" }), { bands });
  assert.ok(ng.factors.some((f) => f.name === "検索意図とページ種別" && f.value < 1));
  assert.ok(!ok.factors.some((f) => f.name === "検索意図とページ種別" && f.value < 1));
});

test("転送ページ・noindexは点数0（従来どおり）", () => {
  const s = scoreRow(pair(), { bands, pageState: { noindex: true } });
  assert.equal(s.score, 0);
});
