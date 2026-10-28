import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx?|html|mjs|js|json)$/.test(e.name)) out.push(p);
  }
  return out;
}

test("広告タグを許可なく設置していない（AdSenseの稼働前）", () => {
  const hits = [...walk("src"), ...walk("public")].filter((f) => /adsbygoogle|googlesyndication|pagead2|ca-pub-/.test(fs.readFileSync(f, "utf8")) && !f.endsWith("adsense-guard.test.ts"));
  assert.deepEqual(hits, [], "広告タグ・Publisher ID が見つかった。設置は運営者の承認後に、プライバシーポリシーとCMPを整えてから");
});

test("プライバシーポリシーは、AdSenseを『利用している』とは書かない（導入検討の段階）", () => {
  const s = fs.readFileSync("src/app/privacy/page.tsx", "utf8");
  assert.match(s, /導入を検討しています/);
  assert.doesNotMatch(s, /AdSense[^。]{0,20}(を利用しています|を使用しています|により広告を配信しています)/);
});

test("プライバシーポリシーに、広告Cookie・無効化・EEA同意管理・解析との区別の説明がある", () => {
  const s = fs.readFileSync("src/app/privacy/page.tsx", "utf8");
  for (const needle of ["過去にアクセスした際の情報", "adssettings.google.com", "aboutads.info", "PostHog の同意は", "同意管理プラットフォーム"]) assert.ok(s.includes(needle), needle);
});
