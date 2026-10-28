import test from 'node:test';
import assert from 'node:assert/strict';
import { extractPage, internalPath, parseSitemap, audit, inboundReport } from './seo-audit-lib.mjs';

const BASE = 'https://ossalt.jp';
const page = ({ title = 'タイトル | ossalt.jp', desc = 'これは検索結果に表示される説明文です。五十文字以上の長さにしておくため、十分に長い文章を入れています。', canonical, robots = 'index, follow', h1 = '見出し', links = [], jsonld = '{"@type":"WebPage"}' } = {}) =>
  `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title>` +
  (desc ? `<meta name="description" content="${desc}"/>` : '') + (canonical ? `<link rel="canonical" href="${canonical}"/>` : '') +
  `<meta name="robots" content="${robots}"/>` + (jsonld ? `<script type="application/ld+json">${jsonld}</script>` : '') +
  `</head><body><h1>${h1}</h1>${links.map((l) => `<a href="${l}">x</a>`).join('')}</body></html>`;
const site = (map, sitemap = [], robots = 'User-agent: *\nAllow: /\nSitemap: https://ossalt.jp/sitemap.xml') => ({
  pages: new Map(Object.entries(map).map(([k, v]) => [k, extractPage(v)])), sitemap, robots,
});

test('HTMLからtitle・description・canonical・robots・JSON-LD・リンクを取り出す', () => {
  const p = extractPage(page({ canonical: 'https://ossalt.jp/a/', robots: 'noindex, follow', links: ['/b/', 'https://x.com/'], jsonld: '{bad' }));
  assert.equal(p.title, 'タイトル | ossalt.jp');
  assert.equal(p.canonical, 'https://ossalt.jp/a/');
  assert.equal(p.noindex, true);
  assert.equal(p.jsonldErrors.length, 1);
  assert.deepEqual(p.links, ['/b/', 'https://x.com/']);
  assert.equal(p.h1.length, 1);
});

test('内部リンクのパスをそろえ、外部・メール・ハッシュは除く', () => {
  assert.equal(internalPath('/a/b?x=1#y', BASE), '/a/b/');
  assert.equal(internalPath('https://ossalt.jp/a/', BASE), '/a/');
  assert.equal(internalPath('https://other.com/a/', BASE), null);
  assert.equal(internalPath('mailto:a@b.c', BASE), null);
  assert.equal(internalPath('#top', BASE), null);
  assert.deepEqual(parseSitemap('<urlset><url><loc>https://ossalt.jp/a/</loc></url></urlset>'), ['https://ossalt.jp/a/']);
});

test('監査：正常なサイトは問題なし。壊れた箇所を事実として検出する', () => {
  const ok = site({
    '/': page({ canonical: 'https://ossalt.jp/', links: ['/alternatives/x/'] }),
    '/alternatives/x/': page({ title: 'X | ossalt.jp', canonical: 'https://ossalt.jp/alternatives/x/', links: ['/'] }),
  }, ['https://ossalt.jp/', 'https://ossalt.jp/alternatives/x/']);
  assert.deepEqual(audit(ok).issues, []);

  const bad = site({
    '/': page({ canonical: 'https://ossalt.jp/', links: ['/missing/'] }),
    '/alternatives/x/': page({ desc: '', canonical: 'https://ossalt.jp/alternatives/other/', h1: '', jsonld: '{bad' }),
    '/compare/a-vs-b/': page({ robots: 'noindex, follow', canonical: 'https://ossalt.jp/compare/a-vs-b/' }),
  }, ['https://ossalt.jp/', 'https://ossalt.jp/alternatives/x/', 'https://ossalt.jp/compare/a-vs-b/', 'https://ossalt.jp/ghost/']);
  const codes = audit(bad).issues.map((i) => i.code);
  for (const c of ['description-missing', 'canonical-mismatch', 'h1-count', 'jsonld-invalid', 'sitemap-noindex', 'sitemap-missing-page', 'broken-internal-link']) assert.ok(codes.includes(c), c);
});

test('転送ページは通常の検査から外し、転送先の存在だけを確かめる。比較ページのnoindexは問題にしない', () => {
  const redirect = (to) => `<!doctype html><html lang="ja"><head><meta name="viewport" content="x"><title>移動</title><link rel="canonical" href="https://ossalt.jp${to}"><meta http-equiv="refresh" content="0; url=${to}"></head><body></body></html>`;
  const s = site({
    '/': page({ canonical: 'https://ossalt.jp/' }),
    '/old/': redirect('/new/'),
    '/gone/': redirect('/nowhere/'),
    '/new/': page({ canonical: 'https://ossalt.jp/new/' }),
    '/compare/a-vs-b/': page({ robots: 'noindex, follow', canonical: 'https://ossalt.jp/compare/a-vs-b/' }),
  }, ['https://ossalt.jp/', 'https://ossalt.jp/new/']);
  const r = audit(s);
  const redirectIssue = r.issues.find((i) => i.code === 'redirect-target-missing');
  assert.equal(redirectIssue.count, 1);
  assert.match(redirectIssue.examples[0], /\/gone\//);
  assert.ok(!r.issues.some((i) => i.code === 'description-missing' && i.examples.includes('/old/')));
  assert.ok(!r.review.some((i) => i.code === 'noindex-non-compare' && i.examples.includes('/compare/a-vs-b/')));
  assert.equal(r.redirects, 2);
});

test('内部リンク：リンク元の数を数え、リンク元ゼロを検出する（自分自身・転送ページからのリンクは数えない）', () => {
  const s = site({
    '/': page({ canonical: 'https://ossalt.jp/', links: ['/tools/a/', '/tools/a/'] }),
    '/tools/a/': page({ canonical: 'https://ossalt.jp/tools/a/', links: ['/tools/a/'] }),
    '/tools/b/': page({ canonical: 'https://ossalt.jp/tools/b/' }),
  });
  const r = audit(s);
  const rep = inboundReport(s, r, { families: ['tools'] });
  assert.equal(rep.tools.total, 2);
  assert.equal(rep.tools.orphans, 1);
  assert.equal(rep.tools.lowest[0].path, '/tools/b/');
  assert.equal(r.inbound.get('/tools/a/').size, 1);
});

test('robots.txtが無い・全体をDisallowしている場合は問題として出す', () => {
  const s = site({ '/': page({ canonical: 'https://ossalt.jp/' }) }, ['https://ossalt.jp/'], 'User-agent: *\nDisallow: /');
  assert.ok(audit(s).issues.some((i) => i.code === 'robots-disallow-all'));
  assert.ok(audit({ ...s, robots: null }).issues.some((i) => i.code === 'robots-missing'));
});

test('アーカイブ済みツールは、サイトマップ外・リンク元ゼロを問題にせず、その旨を明記する', () => {
  const s = site({
    '/': page({ canonical: 'https://ossalt.jp/', links: ['/tools/live/'] }),
    '/tools/live/': page({ canonical: 'https://ossalt.jp/tools/live/' }),
    '/tools/old/': page({ canonical: 'https://ossalt.jp/tools/old/' }),
  }, ['https://ossalt.jp/', 'https://ossalt.jp/tools/live/']);
  const archived = new Set(['/tools/old/']);
  const r = audit(s, { archived });
  assert.ok(!r.review.some((i) => i.code === 'indexable-not-in-sitemap'));
  assert.ok(r.review.some((i) => i.code === 'archived-info'));
  assert.equal(inboundReport(s, r, { families: ['tools'] }).tools.orphans, 0);
  assert.ok(audit(s).review.some((i) => i.code === 'indexable-not-in-sitemap'));
});
