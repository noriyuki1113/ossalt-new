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
  expect(rules).toHaveLength(146);
});
