import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { redirectHtml, validateRedirects, cloudflarePagesRedirects } from "./redirects-lib.mjs";

const { redirects } = JSON.parse(fs.readFileSync(new URL("../data-source/redirects.json", import.meta.url), "utf8"));

test("転送ページ：転送先を即時に開き、正規のURLとして示す", () => {
  const html = redirectHtml("/alternatives/terraform/");
  assert.match(html, /http-equiv="refresh" content="0; url=\/alternatives\/terraform\/"/);
  assert.match(html, /rel="canonical" href="https:\/\/ossalt\.jp\/alternatives\/terraform\/"/);
});

test("形式の検査：不正なパスと二重の転送を見つける", () => {
  assert.equal(validateRedirects(redirects).length, 0);
  assert.ok(validateRedirects({ "/a/": "/b/", "/b/": "/c/" }).some((e) => e.includes("二重")));
  assert.ok(validateRedirects({ "a": "/b/" }).length > 0);
});

test("転送元が、今ある別のページになっていない（上書きしてしまわない）", () => {
  const raw = JSON.parse(fs.readFileSync(new URL("../public/data/tools.json", import.meta.url), "utf8"));
  const tools = Array.isArray(raw) ? raw : raw.tools;
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const toolIds = new Set(tools.map((t) => t.id));
  const competitors = new Set(tools.flatMap((t) => [t.primary_competitor, ...(t.also_competitors ?? [])]).filter(Boolean).map(slug));
  for (const from of Object.keys(redirects)) {
    const [, kind, id] = from.split("/");
    if (kind === "tools") assert.ok(!toolIds.has(id), `${from} は今あるツールのページです`);
    if (kind === "alternatives") assert.ok(!competitors.has(id), `${from} は今ある代替のページです`);
  }
});

test("Cloudflare Pages: 旧URLがHTTP 301になり、対応表と一致する", () => {
  const rules = cloudflarePagesRedirects(redirects);
  const committed = fs.readFileSync(new URL("../public/_redirects", import.meta.url), "utf8");
  assert.equal(committed, rules, "生成した_redirectsとコミット済みファイルが異なります");
  assert.match(rules, /^\/tools\/194\/ \/tools\/zammad\/ 301$/m);
  assert.match(rules, /^\/tools\/254\/ \/tools\/plane\/ 301$/m);
  assert.equal(rules.split("\n").filter((line) => line && !line.startsWith("#")).length, Object.keys(redirects).length);
  assert.equal(rules.split("\n").filter((line) => /^\/tools\/\d+\/ /.test(line)).length, 125);
});

test("Cloudflare Pages: 二重転送や上限超過は出力させない", () => {
  assert.throws(() => cloudflarePagesRedirects({ "/a/": "/b/", "/b/": "/c/" }), /二重の転送/);
  const tooMany = Object.fromEntries(Array.from({ length: 2001 }, (_, i) => ["/old-" + i + "/", "/tools/"]));
  assert.throws(() => cloudflarePagesRedirects(tooMany), /上限/);
});
