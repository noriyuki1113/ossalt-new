#!/usr/bin/env node
/**
 * data-source/redirects.json から、public/<パス>/index.html に転送用のページを作る。
 * 作ったページは git で管理する（既存のものは作り直す）。
 *
 *   node scripts/make-redirects.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { redirectHtml, validateRedirects } from "./redirects-lib.mjs";

const ROOT = process.cwd();
const { redirects } = JSON.parse(fs.readFileSync(path.join(ROOT, "data-source", "redirects.json"), "utf8"));
const errors = validateRedirects(redirects);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
for (const [from, to] of Object.entries(redirects)) {
  const file = path.join(ROOT, "public", from, "index.html");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, redirectHtml(to));
  console.log(`${from} → ${to}`);
}
