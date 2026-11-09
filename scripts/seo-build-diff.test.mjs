import { test } from "node:test";
import assert from "node:assert/strict";
import { snapshot, diffSnapshots, checkCritical, isIndexable } from "./seo-build-diff-lib.mjs";

const SITE = "https://ossalt.jp";
const html = (path, { robots = "index, follow", refresh = false, canonical = `${SITE}${path}`, title = "T" } = {}) =>
  `<html><head><title>${title}</title><meta name="robots" content="${robots}"/>` +
  (canonical ? `<link rel="canonical" href="${canonical}"/>` : "") + (refresh ? '<meta http-equiv="refresh" content="0;url=/x/"/>' : "") + "</head></html>";
const sm = (...paths) => `<urlset>${paths.map((p) => `<url><loc>${SITE}${p}</loc></url>`).join("")}</urlset>`;
const snap = (pages, sitemap) => snapshot({ pages: new Map(Object.entries(pages)), sitemapXml: sm(...sitemap) });

test("diffSnapshots: 消えた・増えた・index可否・canonical・サイトマップの差を事実として数える", () => {
  const a = snap({ "/": html("/"), "/a/": html("/a/"), "/b/": html("/b/", { robots: "noindex, follow" }), "/gone/": html("/gone/") }, ["/", "/a/", "/gone/"]);
  const b = snap({ "/": html("/"), "/a/": html("/a/", { robots: "noindex, follow", title: "U" }), "/b/": html("/b/"), "/new/": html("/new/") }, ["/", "/b/"]);
  const d = diffSnapshots(a, b);
  assert.deepEqual(d.removed, ["/gone/"]);
  assert.deepEqual(d.added, ["/new/"]);
  assert.deepEqual(d.becameNoindex, ["/a/"]);
  assert.deepEqual(d.becameIndexable, ["/b/"]);
  assert.deepEqual(d.titleChanged, ["/a/"]);
  assert.deepEqual(d.sitemapRemoved.sort(), ["/a/", "/gone/"]);
  assert.deepEqual(d.sitemapAdded, ["/b/"]);
  assert.equal(d.indexable.before, 3);
  assert.equal(d.indexable.after, 3);
});

test("checkCritical: 問題のない重要ページ", () => {
  const s = snap({ "/": html("/"), "/tools/": html("/tools/") }, ["/", "/tools/"]);
  assert.deepEqual(checkCritical(s, ["/", "/tools/"]), []);
});

test("checkCritical: 出力なし・noindex・転送・別canonical・サイトマップ外をそれぞれ検出", () => {
  const s = snap({
    "/a/": html("/a/", { robots: "noindex, follow" }),
    "/b/": html("/b/", { refresh: true }),
    "/c/": html("/c/", { canonical: `${SITE}/other/` }),
    "/d/": html("/d/"),
  }, ["/a/", "/b/", "/c/"]);
  const p = checkCritical(s, ["/a/", "/b/", "/c/", "/d/", "/missing/"]).join("\n");
  assert.match(p, /noindex: \/a\//);
  assert.match(p, /転送ページ.*\/b\//);
  assert.match(p, /canonical.*\/c\/ → https:\/\/ossalt\.jp\/other\//);
  assert.match(p, /サイトマップに無い: \/d\//);
  assert.match(p, /出力されていない: \/missing\//);
});

test("checkCritical: canonical が欠落している重要ページは失敗にする（空・タグなしの両方）", () => {
  const s = snap({
    "/a/": html("/a/", { canonical: "" }),
    "/b/": `<html><head><title>T</title><meta name="robots" content="index, follow"/></head></html>`,
    "/ok/": html("/ok/"),
  }, ["/a/", "/b/", "/ok/"]);
  const p = checkCritical(s, ["/a/", "/b/", "/ok/"]);
  assert.equal(p.length, 2);
  assert.match(p[0], /canonical が無い: \/a\//);
  assert.match(p[1], /canonical が無い: \/b\//);
});

test("checkCritical: 末尾スラッシュ違い・http・別ホストのcanonicalは自己参照とみなさない", () => {
  const s = snap({
    "/a/": html("/a/", { canonical: `${SITE}/a` }),
    "/b/": html("/b/", { canonical: `http://ossalt.jp/b/` }),
    "/c/": html("/c/", { canonical: `https://www.ossalt.jp/c/` }),
  }, ["/a/", "/b/", "/c/"]);
  assert.equal(checkCritical(s, ["/a/", "/b/", "/c/"]).filter((x) => /自分自身ではない/.test(x)).length, 3);
});

test("isIndexable: noindex と meta refresh は index 可能ではない", () => {
  assert.equal(isIndexable({ noindex: false, refresh: false }), true);
  assert.equal(isIndexable({ noindex: true, refresh: false }), false);
  assert.equal(isIndexable({ noindex: false, refresh: true }), false);
  assert.equal(isIndexable(undefined), false);
});
