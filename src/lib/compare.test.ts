/**
 * 比較ページのロジック（純粋関数）のテスト。
 * 実行: npm test
 */
import test from "node:test";
import assert from "node:assert/strict";
import { buildComparePairs, buildDifferences, classifyLicense, compareSlug } from "./compare.ts";

test("ライセンス分類: 代表的な表記", () => {
  assert.equal(classifyLicense("MIT"), "permissive");
  assert.equal(classifyLicense("Apache-2.0"), "permissive");
  assert.equal(classifyLicense("MPL-2.0"), "weak-copyleft");
  assert.equal(classifyLicense("GPL-3.0"), "copyleft");
  assert.equal(classifyLicense("AGPL-3.0"), "network-copyleft");
  assert.equal(classifyLicense("BUSL 1.1"), "source-available");
  assert.equal(classifyLicense("Sustainable Use License"), "source-available");
  assert.equal(classifyLicense("Open WebUI License"), "source-available");
  assert.equal(classifyLicense("Apache-2.0（改変条項あり）"), "source-available");
  assert.equal(classifyLicense("Apache-2.0（一部は別ライセンス）"), "partial");
  assert.equal(classifyLicense("MSCL 1.0"), "source-available");
  assert.equal(classifyLicense("Apache-2.0（/proprietary 部分は別ライセンス）"), "partial");
  assert.equal(classifyLicense("GPL-2.0 / GPL-3.0"), "copyleft");
  assert.equal(classifyLicense("Apache-2.0 / GPL-2.0"), "dual");
  assert.equal(classifyLicense(null), "unknown");
});

test("slugはidの昇順で、a-vs-bとb-vs-aが同じになる", () => {
  assert.equal(compareSlug("zulip", "mattermost"), "mattermost-vs-zulip");
  assert.equal(compareSlug("mattermost", "zulip"), "mattermost-vs-zulip");
});

test("組み合わせ: 同じ代替対象の上位N件どうしだけを組む", () => {
  const tools = [
    { id: "a", primary_competitor: "X", health_score: 100, github_archived: false },
    { id: "b", primary_competitor: "X", health_score: 90, github_archived: false },
    { id: "c", primary_competitor: "X", health_score: 80, github_archived: false },
    { id: "d", primary_competitor: "X", health_score: 70, github_archived: false },
    { id: "e", primary_competitor: "Y", health_score: 50, github_archived: false },
  ];
  const pairs = buildComparePairs(tools, 3);
  assert.deepEqual(
    pairs.map((p) => p.slug),
    ["a-vs-b", "a-vs-c", "b-vs-c"]
  );
});

test("組み合わせ: アーカイブ済みは含めない", () => {
  const tools = [
    { id: "a", primary_competitor: "X", health_score: 100, github_archived: false },
    { id: "b", primary_competitor: "X", health_score: 90, github_archived: true },
  ];
  assert.equal(buildComparePairs(tools).length, 0);
});

const base = {
  license: "MIT",
  stars_num: 1000,
  releases_12mo: 10,
  freshness_days: 5,
  docker_available: null,
  ja_ui: null,
  ja_docs: null,
  scorecard_score: null,
  security_md: null,
} as const;

test("違い: 未確認（null）を「非対応」と書かない", () => {
  const diffs = buildDifferences(
    { ...base, name: "A", docker_available: true },
    { ...base, name: "B", docker_available: null }
  ).join("\n");
  assert.match(diffs, /Bは未確認/);
  assert.doesNotMatch(diffs, /非対応/);
});

test("違い: ソース公開型ライセンスには注意を添える", () => {
  const diffs = buildDifferences(
    { ...base, name: "A", license: "BUSL 1.1" },
    { ...base, name: "B", license: "MIT" }
  ).join("\n");
  assert.match(diffs, /Aは一般的なオープンソースライセンスではありません/);
});

test("違い: 更新が止まっているツールを指摘する", () => {
  const diffs = buildDifferences(
    { ...base, name: "A", freshness_days: 400 },
    { ...base, name: "B" }
  ).join("\n");
  assert.match(diffs, /Aは最終コミットから400日/);
});
