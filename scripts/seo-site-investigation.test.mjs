import { test } from "node:test";
import assert from "node:assert/strict";
import { sitemapGap, titleReview, titleSegments, visiblePart, widthOf } from "./seo-site-investigation-lib.mjs";

const page = (o = {}) => ({ refresh: null, noindex: false, title: "T", h1: ["T"], canonical: null, ...o });

test("sitemapGap: 差分を分類し、サイトマップ側の不整合も拾う", () => {
  const pages = new Map([
    ["/tools/a/", page()], ["/tools/old/", page()], ["/tools/moved/", page()], ["/feed/", page()],
    ["/x/", page({ noindex: true })], ["/r/", page({ refresh: "/a/" })],
  ]);
  const sitemap = ["https://ossalt.jp/tools/a/", "https://ossalt.jp/x/", "https://ossalt.jp/r/", "https://ossalt.jp/gone/"];
  const g = sitemapGap({ pages, sitemap }, { archived: new Set(["/tools/old/", "/tools/moved/"]), pendingRefresh: new Set(["/tools/moved/"]) });
  const by = Object.fromEntries(g.notInSitemap.map((x) => [x.path, x.cls]));
  assert.deepEqual(by, { "/tools/old/": "intentional", "/tools/moved/": "pending", "/feed/": "review" });
  assert.deepEqual(g.inSitemapNotIndexable.map((x) => x.path).sort(), ["/gone/", "/r/", "/x/"]);
  assert.equal(g.indexableCount, 4);
});

test("titleReview: 重複・定型・切れる部分で優先度を分ける", () => {
  const boiler = "特徴・ライセンス・日本語対応";
  const pages = new Map();
  for (let i = 0; i < 12; i++) pages.set(`/tools/t${i}/`, page({ title: `ツール${i}とは？Zapierの代替オープンソース｜${boiler} | ossalt.jp`, h1: [`ツール${i}`] }));
  pages.set("/a/", page({ title: "同じタイトルの長いページです。同じタイトルの長いページです。同じタイトルの長いページです。" }));
  pages.set("/b/", page({ title: "同じタイトルの長いページです。同じタイトルの長いページです。同じタイトルの長いページです。" }));
  pages.set("/short/", page({ title: "短い" }));
  const r = titleReview(pages);
  assert.equal(r.over, 14);
  assert.equal(r.byPriority["A:重複"].length, 2);
  assert.ok(r.boilerplates.some(([s]) => s === boiler));
  // 先頭の主題は幅60以内に収まり、切れるのは定型と屋号だけ → C
  assert.ok(r.rows.find((x) => x.path === "/tools/t0/").priority.startsWith("C"));
  // 先頭の主題そのものが切れる → B
  const long = new Map([["/p/", page({ title: "非常に長い主題の語句が続く説明のページ、検索意図を表す語が後ろの方に出てくる文章です｜定型 | ossalt.jp" })]]);
  assert.ok(titleReview(long).rows[0].priority.startsWith("B"));
});

test("titleSegments/visiblePart/widthOf", () => {
  assert.deepEqual(titleSegments("A｜B | ossalt.jp"), ["A", "B"]);
  assert.equal(widthOf("ab日"), 4);
  assert.equal(visiblePart("日本語abc", 5), "日本");
});
