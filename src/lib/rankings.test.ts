import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GROWTH_WEIGHTS, POPULARITY_WEIGHTS, RATE_SHRINK, RECOMMEND_WEIGHTS,
  buildGrowth, buildPopularity, buildRecommended, docsPoints, freshnessPoints,
  licensePoints, percentileRanks, releasePoints,
} from "./rankings.ts";
import { TOOL_DIAGNOSIS } from "./diagnosis-data.ts";
import type { Tool } from "./tools.ts";
import tools from "../../public/data/tools.json" with { type: "json" };

function tool(id: string, o: Partial<Tool> = {}): Tool {
  return { id, name: id, stars_num: 1000, forks_num: 100, contributors_num: 10, github_archived: false,
    license: "MIT", freshness_days: 5, releases_12mo: 12, ja_ui: null, ja_docs: null,
    star_gain: { gain: 10, days: 29, from: "2026-09-25", to: "2026-10-24" },
    star_gain_7d: { gain: 3, days: 8, from: "2026-10-16", to: "2026-10-24" }, ...o } as unknown as Tool;
}

test("重みの合計は、どのランキングも100%", () => {
  const sum = (w: Record<string, number>) => Math.round(Object.values(w).reduce((a, b) => a + b, 0) * 1000) / 1000;
  assert.equal(sum(POPULARITY_WEIGHTS), 1);
  assert.equal(sum(GROWTH_WEIGHTS), 1);
  assert.equal(sum(RECOMMEND_WEIGHTS), 1);
});

test("percentileRanks: 同じ値は中間の順位、順序を保つ、負の値も扱える", () => {
  assert.deepEqual(percentileRanks([]), []);
  assert.deepEqual(percentileRanks([5]), [50]);
  assert.deepEqual(percentileRanks([10, 20, 30, 40]), [12.5, 37.5, 62.5, 87.5]);
  assert.deepEqual(percentileRanks([1, 1, 3]), [(1 / 3) * 100, (1 / 3) * 100, (2.5 / 3) * 100]);
  const r = percentileRanks([-5, 0, 100]);
  assert.ok(r[0] < r[1] && r[1] < r[2]);
});

test("人気：Stars50%・Forks25%・Contributors25%。取得できていないものは未観測", () => {
  const list = [
    tool("a", { stars_num: 100000, forks_num: 100, contributors_num: 10 }),
    tool("b", { stars_num: 1000, forks_num: 5000, contributors_num: 900 }),
    tool("c", { stars_num: 10, forks_num: 1, contributors_num: 1 }),
    tool("d", { contributors_num: null }),
    tool("e", { github_archived: true }),
  ];
  const { rows, unobserved } = buildPopularity(list);
  assert.deepEqual(unobserved.map((t) => t.id), ["d"]); // アーカイブ済みは対象外（未観測でもない）
  assert.equal(rows.length, 3);
  // a: Stars最大(83.3)×0.5 + Forks中(50)×0.25 + Contributors中(50)×0.25
  const a = rows.find((r) => r.tool.id === "a")!;
  assert.equal(a.score, Math.round((83.3 * 0.5 + 50 * 0.25 + 50 * 0.25) * 10) / 10);
  assert.equal(a.parts.length, 3);
  assert.deepEqual(a.parts.map((p) => p.weight), [0.5, 0.25, 0.25]);
  assert.equal(rows[rows.length - 1].tool.id, "c");
});

test("急成長：7日50%・30日30%・補正した成長率20%。記録が足りないものは未観測で、0にしない", () => {
  const list = [
    tool("big", { stars_num: 200000, star_gain: { gain: 3000, days: 29, from: "x", to: "y" }, star_gain_7d: { gain: 800, days: 8, from: "x", to: "y" } }),
    tool("small", { stars_num: 1100, star_gain: { gain: 100, days: 29, from: "x", to: "y" }, star_gain_7d: { gain: 40, days: 8, from: "x", to: "y" } }),
    tool("tiny", { stars_num: 60, star_gain: { gain: 50, days: 29, from: "x", to: "y" }, star_gain_7d: { gain: 20, days: 8, from: "x", to: "y" } }),
    tool("no7", { star_gain_7d: null }),
    tool("short30", { star_gain: { gain: 5, days: 4, from: "x", to: "y" } }),
    tool("nostars", { stars_num: null }),
  ];
  const { rows, unobserved } = buildGrowth(list);
  assert.deepEqual(rows.map((r) => r.tool.id).sort(), ["big", "small", "tiny"]);
  assert.equal(unobserved.length, 3);
  assert.match(unobserved.find((u) => u.tool.id === "no7")!.reason, /7日以上前/);
  assert.match(unobserved.find((u) => u.tool.id === "short30")!.reason, /30日の実測/);
  assert.match(unobserved.find((u) => u.tool.id === "nostars")!.reason, /Star数/);
  // 規模補正：Star60で+50（+83%に見える）より、Star1,100で+100のほうが成長率の順位が高い
  const rate = (id: string) => rows.find((r) => r.tool.id === id)!.parts.find((p) => p.key === "rate")!.pct;
  assert.ok(rate("small") > rate("tiny"));
  // 補正した成長率 = 30日純増 ÷ (30日前のStar数 + 1,000)
  assert.equal(rows.find((r) => r.tool.id === "tiny")!.adjustedRatePct, Math.round((50 / (10 + RATE_SHRINK)) * 1000) / 10);
  // 合計は各項目の（順位 × 重み）の和
  for (const r of rows) assert.equal(r.score, Math.round(r.parts.reduce((s, p) => s + p.points, 0) * 10) / 10);
});

test("おすすめの部品：更新・リリース・ライセンス・日本語の点", () => {
  assert.deepEqual([0, 30, 31, 90, 91, 180, 181, 365, 366].map(freshnessPoints), [100, 100, 80, 80, 50, 50, 20, 20, 0]);
  assert.equal(freshnessPoints(null), null);
  assert.deepEqual([0, 1, 2, 3, 5, 6, 20].map(releasePoints), [0, 40, 40, 70, 70, 100, 100]);
  assert.equal(licensePoints("MIT").points, 100);
  assert.equal(licensePoints("AGPL-3.0").points, 70);
  assert.equal(licensePoints("GPL-2.0 / GPL-3.0").points, 80);
  assert.equal(licensePoints("Apache-2.0 / GPL-2.0").points, 90);
  assert.equal(licensePoints("Sustainable Use License").points, 30);
  assert.equal(licensePoints("AGPL-3.0 / Metabase Commercial").points, 40);
  assert.deepEqual([licensePoints(null).points, licensePoints(null).known], [0, false]);
  assert.equal(docsPoints({ ja_ui: true, ja_docs: null }).points, 100);
  assert.equal(docsPoints({ ja_ui: null, ja_docs: "official" }).points, 100);
  const unknown = docsPoints({ ja_ui: null, ja_docs: null });
  assert.deepEqual([unknown.points, unknown.known], [0, false]);
  assert.match(unknown.note, /「無い」という意味ではない/);
});

test("おすすめ：実データ。診断データのある5つのSaaSの30ツールだけ。合計は重みつきの和で、0〜100", () => {
  const all = tools as unknown as Tool[];
  const { bySaas, applicable } = buildRecommended(all, Object.values(TOOL_DIAGNOSIS));
  assert.equal(applicable, 30);
  assert.deepEqual(Object.keys(bySaas).sort(), ["google-analytics", "notion", "slack", "trello", "zapier"]);
  for (const rows of Object.values(bySaas)) {
    for (let i = 1; i < rows!.length; i++) assert.ok(rows![i - 1].score >= rows![i].score);
    for (const r of rows!) {
      assert.ok(r.score >= 0 && r.score <= 100);
      assert.equal(r.parts.length, 5);
      assert.equal(r.score, Math.round(r.parts.reduce((s, p) => s + p.weighted, 0) * 10) / 10);
      assert.ok(r.evidencePct > 0 && r.evidencePct <= 100);
    }
  }
});

test("実データ：人気は全ツール、急成長は記録のそろったツールだけ", () => {
  const all = (tools as unknown as Tool[]).filter((t) => !t.github_archived);
  const pop = buildPopularity(all);
  assert.equal(pop.rows.length + pop.unobserved.length, all.length);
  const g = buildGrowth(all);
  assert.equal(g.rows.length + g.unobserved.length, all.length);
  assert.ok(g.rows.length > 300);
});
