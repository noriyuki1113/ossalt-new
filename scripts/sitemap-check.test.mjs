import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSitemap, pageFacts, checkSitemap, checkRobots } from "./sitemap-check.mjs";

const SITE = "https://ossalt.jp";
const page = (extra = "") => `<html><head><link rel="canonical" href="https://ossalt.jp/a/"/>${extra}</head></html>`;
const run = (urls, pages) =>
  checkSitemap({
    urls, site: SITE,
    hasFile: (p) => p in pages,
    readPage: (p) => pages[p],
  });

test("parseSitemap: loc と lastmod を読む", () => {
  const u = parseSitemap('<urlset><url><loc>https://ossalt.jp/a/</loc><lastmod>2026-10-01</lastmod></url><url><loc>https://ossalt.jp/b/?x=1&amp;y=2</loc></url></urlset>');
  assert.deepEqual(u, [{ loc: "https://ossalt.jp/a/", lastmod: "2026-10-01" }, { loc: "https://ossalt.jp/b/?x=1&y=2", lastmod: undefined }]);
});

test("pageFacts: noindex・canonical・meta refresh", () => {
  assert.deepEqual(pageFacts('<meta name="robots" content="noindex, follow"/><link rel="canonical" href="https://ossalt.jp/x/"/>'), { noindex: true, canonical: "https://ossalt.jp/x/", refresh: false });
  assert.equal(pageFacts('<meta http-equiv="refresh" content="0;url=/y/"/>').refresh, true);
  assert.equal(pageFacts('<meta name="robots" content="index, follow"/>').noindex, false);
});

test("checkSitemap: 問題のないサイトマップ", () => {
  const r = run([{ loc: "https://ossalt.jp/a/", lastmod: "2026-10-01" }], { "/a/": page() });
  assert.deepEqual(r.problems, []);
});

test("checkSitemap: 404・重複・別ホスト・スラッシュなし・クエリ・転送・noindex・別canonical・lastmod不正を検出する", () => {
  const pages = {
    "/ok/": page(),
    "/refresh/": page('<meta http-equiv="refresh" content="0;url=/ok/"/>'),
    "/noindex/": page('<meta name="robots" content="noindex"/>'),
    "/canon/": '<link rel="canonical" href="https://ossalt.jp/other/"/>',
    "/bad-date/": page(),
  };
  const r = run(
    [
      { loc: "https://ossalt.jp/ok/" }, { loc: "https://ossalt.jp/ok/" }, // 重複
      { loc: "https://ossalt.jp/missing/" }, // 404
      { loc: "https://example.com/ok/" }, // 別ホスト
      { loc: "https://ossalt.jp/noslash" },
      { loc: "https://ossalt.jp/ok/?q=1" },
      { loc: "https://ossalt.jp/refresh/" }, { loc: "https://ossalt.jp/noindex/" }, { loc: "https://ossalt.jp/canon/" },
      { loc: "https://ossalt.jp/bad-date/", lastmod: "yesterday" },
    ],
    pages,
  );
  const text = r.problems.join("\n");
  for (const needle of ["重複", "ページが無い", "別のホスト", "末尾スラッシュ", "クエリ", "meta refresh", "noindex", "canonicalが別", "lastmod"]) assert.match(text, new RegExp(needle), needle);
});

test("checkRobots: sitemap参照・全体拒否を確認する", () => {
  assert.deepEqual(checkRobots("User-Agent: *\nAllow: /\n\nSitemap: https://ossalt.jp/sitemap.xml\n", SITE), []);
  assert.match(checkRobots("User-Agent: *\nAllow: /\n", SITE).join(), /Sitemap/);
  assert.match(checkRobots("User-Agent: *\nDisallow: /\n\nSitemap: https://ossalt.jp/sitemap.xml\n", SITE).join(), /全体を拒否/);
  assert.match(checkRobots("User-Agent: Bingbot\nDisallow: /\n\nUser-Agent: *\nAllow: /\n\nSitemap: https://ossalt.jp/sitemap.xml\n", SITE).join(), /全体を拒否/);
});
