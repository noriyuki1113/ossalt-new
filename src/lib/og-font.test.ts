import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFontsourceCss, parseUnicodeRange, subsetsFor, ogFonts } from "./og-font.ts";
import { alternativeOgPath, alternativeOgText } from "./alternative-og.ts";

test("unicode-range を範囲の配列にする", () => {
  assert.deepEqual(parseUnicodeRange("U+0000-00ff,U+3000, U+4e??"), [[0, 255], [0x3000, 0x3000], [0x4e00, 0x4eff]]);
});

test("fontsource のCSSから woff と範囲を取り出し、必要な分だけ選ぶ", () => {
  const css = `@font-face { src: url(./files/a-1-700-normal.woff2) format('woff2'), url(./files/a-1-700-normal.woff) format('woff'); unicode-range: U+0041-005a; }
@font-face { src: url(./files/a-2-700-normal.woff2) format('woff2'), url(./files/a-2-700-normal.woff) format('woff'); unicode-range: U+3042; }`;
  const subsets = parseFontsourceCss(css);
  assert.deepEqual(subsets.map((s) => s.file), ["a-1-700-normal.woff", "a-2-700-normal.woff"]);
  assert.deepEqual(subsetsFor("AB", subsets).map((s) => s.file), ["a-1-700-normal.woff"]);
  assert.deepEqual(subsetsFor("Aあ", subsets).map((s) => s.file), ["a-1-700-normal.woff", "a-2-700-normal.woff"]);
});

test("画像の文字に必要なフォントを、依存のパッケージから読み込める（日本語を含む）", () => {
  const { fonts, family } = ogFonts("Notionの代わりになるOSS 候補12件", 700);
  assert.ok(fonts.length >= 2);
  assert.ok(fonts.every((f) => f.data.length > 1000 && f.weight === 700));
  assert.equal(family, fonts.map((f) => f.name).join(", "));
  assert.equal(new Set(fonts.map((f) => f.name)).size, fonts.length);
});

test("代替ページの画像の文言は、件数と健全度の上位3件から作る", () => {
  const o = alternativeOgText("Notion", ["AFFiNE", "AppFlowy", "Outline", "Docmost"]);
  assert.equal(o.count, "4");
  assert.equal(o.top, "健全度の上位：AFFiNE・AppFlowy・Outline ほか");
  assert.equal(alternativeOgText("X", ["A"]).top, "健全度の上位：A");
  assert.equal(alternativeOgPath("notion"), "/og/alternatives/notion/image.png");
});
