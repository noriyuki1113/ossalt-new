import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import matter from "gray-matter";
import { parseGlance, validateGlance } from "./glance.ts";

test("向いていない人が無い要約は、表示しない（長所だけにしない）", () => {
  assert.equal(parseGlance({ what: "x", good_for: ["a"], not_for: [], check: [] }), null);
  assert.equal(parseGlance({ what: "x", good_for: ["a"], not_for: ["b"], check: [] })?.not_for[0], "b");
  assert.equal(parseGlance(undefined), null);
});

test("validate：不足・多すぎを検出する", () => {
  assert.deepEqual(validateGlance(undefined), []);
  assert.match(validateGlance({ what: "x", good_for: ["a"] }).join("|"), /not_for/);
  assert.match(validateGlance({ what: "x", good_for: ["1", "2", "3", "4", "5"], not_for: ["b"] }).join("|"), /4件まで/);
});

test("content/tools の at_a_glance は、書き方が正しい", () => {
  for (const f of fs.readdirSync("content/tools").filter((x) => x.endsWith(".md"))) {
    const { data } = matter(fs.readFileSync(`content/tools/${f}`, "utf8"));
    assert.deepEqual(validateGlance(data.at_a_glance), [], f);
  }
});
