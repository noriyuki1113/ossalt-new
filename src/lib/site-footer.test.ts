import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SITE } from "./site.ts";

test("フッターの文言は、title・OGP・フィードに使う tagline とは別に持つ（検索結果の表示を変えない）", () => {
  assert.equal(SITE.tagline, "国産SaaSの代わりに、自前で動かす");
  assert.equal(SITE.footerTagline, "SaaSの代わりになるOSSを、比較して選ぶ。");
  assert.equal(SITE.footerDescription, "オープンソースのソフトウェアを、機能・ライセンス・更新状況などから比較できる情報サイト。");
});

test("フッターは footerTagline と footerDescription を出し、title と description には footer の文言を使わない", () => {
  const root = process.cwd();
  const chrome = fs.readFileSync(path.join(root, "src", "components", "site-chrome.tsx"), "utf8");
  assert.match(chrome, /\{SITE\.name\} — \{SITE\.footerTagline\}/);
  assert.match(chrome, /\{SITE\.footerDescription\}/);
  assert.ok(!/SITE\.tagline/.test(chrome), "フッターが tagline（titleと共通）を使っている");
  const layout = fs.readFileSync(path.join(root, "src", "app", "layout.tsx"), "utf8");
  assert.ok(!/footerTagline|footerDescription/.test(layout), "layout（title・meta）にフッターの文言を使っている");
  assert.match(layout, /\$\{SITE\.name\} — \$\{SITE\.tagline\}/);
});
