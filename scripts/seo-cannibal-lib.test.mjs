import { test } from "node:test";
import assert from "node:assert/strict";
import { detectCannibalization, staticOverlapCandidates } from "./seo-cannibal-lib.mjs";

const r = (query, page, impressions, position = 10) => ({ query, page: `https://ossalt.jp${page}`, clicks: 1, impressions, position });

test("同じクエリに複数ページが出ているものを検出し、少数・2位が小さいものは除く", () => {
  const out = detectCannibalization([
    r("Notion 代替", "/alternatives/notion/", 100), r("notion  代替", "/tools/affine/", 60),
    r("小さい", "/tools/a/", 10), r("小さい", "/tools/b/", 10),
    r("偏り", "/tools/a/", 500), r("偏り", "/tools/b/", 20),
  ]);
  assert.equal(out.groups.length, 1);
  assert.equal(out.groups[0].query, "notion 代替");
  assert.match(out.groups[0].assessment, /種類の異なる/);
});

test("同じ種類の競合は内容の重複を確認、前期間と先頭ページが変わったら leaderChanged", () => {
  const cur = [r("vs", "/compare/a-vs-b/", 100), r("vs", "/compare/b-vs-a/", 90)];
  const prev = [r("vs", "/compare/b-vs-a/", 100), r("vs", "/compare/a-vs-b/", 50)];
  const g = detectCannibalization(cur, { prevPairRows: prev }).groups[0];
  assert.match(g.assessment, /同じ種類/);
  assert.equal(g.leaderChanged, true);
});

test("表が上限に達しているときは、見落としの注意を付ける", () => {
  assert.ok(detectCannibalization([], { capped: true }).note);
});

test("静的候補：同一h1・同一descriptionのindexページ。noindex・転送は除く", () => {
  const p = (o) => ({ refresh: null, noindex: false, h1: ["H"], description: "D", ...o });
  const pages = new Map([["/a/", p({})], ["/b/", p({})], ["/c/", p({ noindex: true })], ["/d/", p({ h1: ["X"], description: "Y" })]]);
  const o = staticOverlapCandidates(pages);
  assert.deepEqual(o.duplicateH1[0].paths, ["/a/", "/b/"]);
  assert.deepEqual(o.duplicateDescription[0].paths, ["/a/", "/b/"]);
});
