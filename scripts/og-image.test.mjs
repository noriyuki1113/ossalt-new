import { test } from "node:test";
import assert from "node:assert/strict";
import { acceptDimensions, extractOgImage, isCustomGithubPreview, isGithubAutoCard } from "./og-image.mjs";

test("og:image を取り出し、相対URLを解決する", () => {
  const html = `<head><meta property="og:title" content="x"><meta content="/img/og.png" property="og:image"></head>`;
  assert.equal(extractOgImage(html, "https://example.com/ja/"), "https://example.com/img/og.png");
});

test("og:image が無ければ twitter:image を使う", () => {
  const html = `<meta name='twitter:image' content='https://cdn.example.com/a.jpg?x=1&amp;y=2'>`;
  assert.equal(extractOgImage(html, "https://example.com"), "https://cdn.example.com/a.jpg?x=1&y=2");
});

test("og:image を twitter:image より優先する", () => {
  const html = `<meta name="twitter:image" content="https://a/t.png"><meta property="og:image" content="https://a/o.png">`;
  assert.equal(extractOgImage(html, "https://a"), "https://a/o.png");
});

test("無ければ null。javascript: などは採用しない", () => {
  assert.equal(extractOgImage("<meta name='description' content='x'>", "https://a"), null);
  assert.equal(extractOgImage(`<meta property="og:image" content="javascript:alert(1)">`, "https://a"), null);
});

test("GitHubの自動生成カードは使わない", () => {
  assert.equal(isCustomGithubPreview("https://repository-images.githubusercontent.com/1/abc"), true);
  assert.equal(isCustomGithubPreview("https://opengraph.githubassets.com/abc/n8n-io/n8n"), false);
});

test("横長で十分な大きさの画像だけを採用する", () => {
  assert.equal(acceptDimensions(1200, 630), true);
  assert.equal(acceptDimensions(512, 512), false);
  assert.equal(acceptDimensions(400, 210), false);
  assert.equal(acceptDimensions(3000, 600), false);
  assert.equal(acceptDimensions(null, 600), false);
});

test("GitHubの自動生成カードを見分ける", () => {
  assert.equal(isGithubAutoCard("https://opengraph.githubassets.com/abc/FreshRSS/FreshRSS"), true);
  assert.equal(isGithubAutoCard("https://freshrss.org/og.png"), false);
});
