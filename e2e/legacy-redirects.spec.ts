import { test, expect } from "./fixtures";
import fs from "node:fs";
import path from "node:path";

test("Cloudflare Pages向け301ルールが静的ビルド成果物に含まれる", () => {
  const output = path.join(process.cwd(), "out", "_redirects");
  expect(fs.existsSync(output), "Next.jsの静的出力out/_redirectsがありません").toBe(true);
  const text = fs.readFileSync(output, "utf8");
  expect(text).toContain("/tools/194/ /tools/zammad/ 301");
  expect(text).toContain("/tools/254/ /tools/plane/ 301");
  const rules = text.split("\n").filter((s) => s && !s.startsWith("#"));
  // 転送の定義（data-source/redirects.json）と同じ件数だけ、ルールがあること
  const { redirects } = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data-source", "redirects.json"), "utf8"));
  expect(rules).toHaveLength(Object.keys(redirects).length);
  expect(text).toContain("/alternatives/sansan/ /categories/crm/ 301");
});
