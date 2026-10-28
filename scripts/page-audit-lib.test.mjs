import { test } from "node:test";
import assert from "node:assert/strict";
import { extractFacts, validateJsonLd, pageIssues, duplicateIssues, titleWidth } from "./page-audit-lib.mjs";

const page = (head, body = "<h1>見出し</h1>") => `<html><head>${head}</head><body>${body}</body></html>`;
const good = '<title>OSSの比較 | ossalt.jp</title><meta name="description" content="自前で動かせるオープンソースを、ライセンスや更新状況から日本語で比較します。"/><link rel="canonical" href="https://ossalt.jp/tools/"/><meta property="og:title" content="t"/><meta property="og:image" content="https://ossalt.jp/og.png"/>';

test("extractFacts: title・description・canonical・robots・h1・画像・JSON-LD", () => {
  const f = extractFacts(page(good + '<meta name="robots" content="noindex, follow"/><script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite"}</script>', '<h1>A</h1><img src="a.png" alt="" width="1" height="1"/><img src="b.png"/>'));
  assert.equal(f.title, "OSSの比較 | ossalt.jp");
  assert.equal(f.canonical, "https://ossalt.jp/tools/");
  assert.equal(f.robots, "noindex, follow");
  assert.equal(f.h1, 1);
  assert.deepEqual(f.images, { total: 2, noAlt: 1, noSize: 1 });
  assert.equal(f.jsonLd.length, 1);
  assert.equal(f.og.image, "https://ossalt.jp/og.png");
});

test("pageIssues: 問題のないページは指摘なし", () => {
  const f = extractFacts(page(good));
  assert.deepEqual(pageIssues({ url: "/tools/", expectedCanonical: "https://ossalt.jp/tools/", facts: f }).issues, []);
});

test("pageIssues: 欠落・不一致・noindex・h1を検出する（重要度つき）", () => {
  const f = extractFacts(page('<meta name="robots" content="noindex"/><link rel="canonical" href="https://ossalt.jp/other/"/>', "<p>h1なし</p>"));
  const ids = Object.fromEntries(pageIssues({ url: "/tools/", expectedCanonical: "https://ossalt.jp/tools/", facts: f }).issues.map((i) => [i.id, i.severity]));
  assert.equal(ids["title-missing"], "high");
  assert.equal(ids["description-missing"], "medium");
  assert.equal(ids["canonical-mismatch"], "high");
  assert.equal(ids["noindex"], "high");
  assert.equal(ids["h1-count"], "high");
});

test("pageIssues: 末尾スラッシュの有無だけの違いは、canonical不一致にしない", () => {
  const f = extractFacts(page(good.replace("https://ossalt.jp/tools/", "https://ossalt.jp/tools")));
  assert.equal(pageIssues({ url: "/tools/", expectedCanonical: "https://ossalt.jp/tools/", facts: f }).issues.some((i) => i.id === "canonical-mismatch"), false);
});

test("titleWidth: 全角は2、半角は1", () => {
  assert.equal(titleWidth("abcあい"), 7);
});

test("validateJsonLd: 構文エラーを検出する", () => {
  assert.equal(validateJsonLd(["{not json"]).problems[0].id, "jsonld-syntax");
});

test("validateJsonLd: BreadcrumbList の position・name・item", () => {
  const ok = JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "ホーム", item: "https://ossalt.jp/" }, { "@type": "ListItem", position: 2, name: "ツール" }] });
  assert.deepEqual(validateJsonLd([ok]).problems, []);
  const bad = JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ position: 2 }, { position: 3, name: "x" }] });
  const ids = validateJsonLd([bad]).problems.map((p) => p.id);
  assert.ok(ids.includes("breadcrumb-position") && ids.includes("breadcrumb-name") && ids.includes("breadcrumb-item"));
});

test("validateJsonLd: ItemList の件数・WebSite の SearchAction", () => {
  const il = JSON.stringify({ "@context": "https://schema.org", "@type": "ItemList", numberOfItems: 3, itemListElement: [{ "@type": "ListItem", position: 1 }] });
  assert.equal(validateJsonLd([il]).problems[0].id, "itemlist-count");
  const ws = JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", potentialAction: { "@type": "SearchAction", target: "https://ossalt.jp/tools/" } });
  assert.equal(validateJsonLd([ws]).problems[0].id, "searchaction-target");
});

test("validateJsonLd: FAQPage の質問が本文に無ければ検出（実際のコンテンツと一致させる）", () => {
  const faq = JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: "日本語に対応していますか？", acceptedAnswer: { "@type": "Answer", text: "はい" } }] });
  assert.equal(validateJsonLd([faq], { pageText: "本文に質問がない" }).problems[0].id, "faq-not-visible");
  assert.deepEqual(validateJsonLd([faq], { pageText: "…日本語に対応していますか？…" }).problems, []);
});

test("validateJsonLd: 評価・レビューのマークアップは、実データか確認するよう指摘する", () => {
  const r = JSON.stringify({ "@context": "https://schema.org", "@type": "SoftwareApplication", name: "x", aggregateRating: { ratingValue: 5 } });
  assert.ok(validateJsonLd([r]).problems.some((p) => p.id === "jsonld-rating"));
});

test("duplicateIssues: 同じtitleを複数ページで使っていれば検出する", () => {
  const mk = (url, title) => ({ url, facts: { title, description: url } });
  const d = duplicateIssues([mk("/a/", "同じ"), mk("/b/", "同じ"), mk("/c/", "別")]);
  assert.equal(d.length, 1);
  assert.equal(d[0].id, "title-duplicate");
});
