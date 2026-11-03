import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { convert, generate, FONTS, OUT } from "./gen-fonts-css.mjs";

const SAMPLE = `/* x */
@font-face {
  font-family: 'Noto Sans JP';
  font-display: swap;
  font-weight: 400;
  src: url(./files/noto-sans-jp-0-400-normal.woff2) format('woff2'), url(./files/noto-sans-jp-0-400-normal.woff) format('woff');
  unicode-range: U+3000;
}`;

test("convert: optional・woff2のみ・相対パスに書き換え、unicode-range は保つ", () => {
  const { css, count } = convert(SAMPLE, "@fontsource/noto-sans-jp");
  assert.equal(count, 1);
  assert.match(css, /font-display: optional;/);
  assert.match(css, /url\(\.\.\/\.\.\/node_modules\/@fontsource\/noto-sans-jp\/files\/noto-sans-jp-0-400-normal\.woff2\) format\("woff2"\)/);
  assert.doesNotMatch(css, /\.woff\)|swap|\.\/files\//);
  assert.match(css, /unicode-range: U\+3000;/);
});

test("convert: 想定外の形式（fontsourceの形式変更）は、黙って通さず中止する", () => {
  assert.throws(() => convert("@font-face { font-family: 'X'; src: url(https://example.com/x.woff2); font-display: swap; }", "@fontsource/x"), /想定外/);
});

test("同梱フォントの生成物が最新で、外部への参照がない（fontsource が入っているとき）", async () => {
  const has = await stat("node_modules/@fontsource-variable/noto-sans-jp/wght.css").then(() => true, () => false);
  if (!has) return;
  const { text, stats } = await generate();
  assert.equal(stats.length, FONTS.reduce((n, f) => n + f.files.length, 0));
  assert.ok(/font-family: 'Noto Sans JP';/.test(text) && !/Variable/.test(text));
  assert.equal(await readFile(OUT, "utf8"), text, `${OUT} が最新ではありません（node scripts/gen-fonts-css.mjs）`);
  assert.doesNotMatch(text, /https?:\/\//);
});

test("layout.tsx は next/font/google を使わない（ビルド時の外部取得に戻さない）", async () => {
  assert.doesNotMatch(await readFile("src/app/layout.tsx", "utf8"), /next\/font\/google/);
});

test("可変フォントの変換：family名を元に戻し、format を保つ", () => {
  const v = "@font-face {\n  font-family: 'Noto Sans JP Variable';\n  font-display: swap;\n  font-weight: 100 900;\n  src: url(./files/a-wght-normal.woff2) format('woff2-variations');\n  unicode-range: U+3000;\n}";
  const { css } = convert(v, "@fontsource-variable/noto-sans-jp", ["Noto Sans JP Variable", "Noto Sans JP"]);
  assert.match(css, /font-family: 'Noto Sans JP';/);
  assert.match(css, /format\("woff2-variations"\)/);
  assert.match(css, /font-weight: 100 900;/);
});
