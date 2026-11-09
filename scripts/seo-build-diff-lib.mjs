/**
 * 2つのビルド（out/）の「検索エンジンに見える事実」を比べる、読み取り専用の純粋関数。
 * 検索流入が急に減ったとき、直前と直後の公開物を並べて「robots・canonical・転送・サイトマップが変わったか」を確かめるために使う。
 * ネットワークには接続しない。
 */
import fs from "node:fs";
import path from "node:path";
import { parseSitemap, pageFacts } from "./sitemap-check.mjs";

/** 保証したい重要ページ。ここが index 不可・転送・別canonical・サイトマップ外になったら、リリース前に止める */
export const CRITICAL_PATHS = [
  "/", "/tools/", "/alternatives/", "/categories/", "/compare/", "/licenses/", "/rankings/", "/blog/",
  "/alternatives/notion/", "/alternatives/google-analytics/",
];

const titleOf = (html) => ((html.match(/<title>([^<]*)<\/title>/) ?? [])[1] ?? "").trim();

/** pages: Map<"/path/", html>、sitemapXml: string → スナップショット */
export function snapshot({ pages, sitemapXml, site = "https://ossalt.jp" }) {
  const rows = new Map();
  for (const [p, html] of pages) {
    const f = pageFacts(html);
    rows.set(p, { noindex: f.noindex, refresh: f.refresh, canonical: f.canonical, title: titleOf(html) });
  }
  const sitemap = new Set(parseSitemap(sitemapXml ?? "").map((u) => u.loc.replace(site, "")));
  return { rows, sitemap, site };
}

export const isIndexable = (r) => !!r && !r.noindex && !r.refresh;

export function diffSnapshots(a, b) {
  const sel = (m, fn) => [...m].filter(([p, r]) => fn(p, r)).map(([p]) => p);
  const removed = sel(a.rows, (p) => !b.rows.has(p));
  const added = sel(b.rows, (p) => !a.rows.has(p));
  const becameNoindex = sel(a.rows, (p, r) => b.rows.has(p) && isIndexable(r) && !isIndexable(b.rows.get(p)));
  const becameIndexable = sel(a.rows, (p, r) => b.rows.has(p) && !isIndexable(r) && isIndexable(b.rows.get(p)));
  const canonicalChanged = sel(a.rows, (p, r) => b.rows.has(p) && r.canonical !== b.rows.get(p).canonical);
  const titleChanged = sel(a.rows, (p, r) => b.rows.has(p) && r.title !== b.rows.get(p).title);
  const sitemapRemoved = [...a.sitemap].filter((p) => !b.sitemap.has(p));
  const sitemapAdded = [...b.sitemap].filter((p) => !a.sitemap.has(p));
  const count = (s) => [...s.rows.values()].filter(isIndexable).length;
  return { removed, added, becameNoindex, becameIndexable, canonicalChanged, titleChanged, sitemapRemoved, sitemapAdded, indexable: { before: count(a), after: count(b) } };
}

/** 重要ページが index 可能・自己canonical・サイトマップ掲載であること */
export function checkCritical(snap, paths = CRITICAL_PATHS) {
  const problems = [];
  for (const p of paths) {
    const r = snap.rows.get(p);
    if (!r) { problems.push(`重要ページが出力されていない: ${p}`); continue; }
    if (r.noindex) problems.push(`重要ページが noindex: ${p}`);
    if (r.refresh) problems.push(`重要ページが転送ページ（meta refresh）: ${p}`);
    if (!r.canonical) problems.push(`重要ページの canonical が無い: ${p}`);
    else if (r.canonical !== `${snap.site}${p}`) problems.push(`重要ページの canonical が自分自身ではない: ${p} → ${r.canonical}`);
    if (!snap.sitemap.has(p)) problems.push(`重要ページがサイトマップに無い: ${p}`);
  }
  return problems;
}

export function loadSnapshot(dir, site = "https://ossalt.jp") {
  const pages = new Map();
  (function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const full = path.join(d, f);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (f === "index.html") pages.set("/" + path.relative(dir, full).replace(/index\.html$/, ""), fs.readFileSync(full, "utf8"));
    }
  })(dir);
  const sm = path.join(dir, "sitemap.xml");
  return snapshot({ pages, sitemapXml: fs.existsSync(sm) ? fs.readFileSync(sm, "utf8") : "", site });
}
