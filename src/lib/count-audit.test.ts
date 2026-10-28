import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("記事の件数は、集計の時点を明記している（現在の掲載総数と区別する）", () => {
  for (const f of fs.readdirSync("content/blog").filter((x) => x.endsWith(".md"))) {
    const text = fs.readFileSync(`content/blog/${f}`, "utf8");
    for (const m of text.matchAll(/(掲載ツール|開発中の|ツール)(3[5-9]\d|40\d)件/g)) {
      const around = text.slice(Math.max(0, m.index! - 40), m.index! + m[0].length + 40);
      assert.match(around, /時点/, `${f}：「${m[0]}」に集計の時点が無い`);
    }
  }
});

test("ソースに、掲載総数の数字（3桁＋件）を固定で書いていない（掲載データと連動させる）", () => {
  const files = ["src/app/page.tsx", "src/app/about/page.tsx", "src/app/editorial/page.tsx", "src/app/tools/page.tsx", "src/app/categories/page.tsx", "src/app/alternatives/page.tsx", "src/lib/site.ts"];
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    const s = fs.readFileSync(f, "utf8");
    assert.doesNotMatch(s, /(?<![\d.])(3[5-9]\d|40\d)\s?件(を収録|を掲載|のオープンソース|のツール)/, `${f} に固定の件数がある`);
  }
});
