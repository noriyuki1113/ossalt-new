import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const front = (slug: string) => fs.readFileSync(`content/alternatives/${slug}.md`, "utf8").split("---")[1];

test("検索語に合わせたtitleを持つ代替ガイドは、「オープンソース」と{n}・{year}を含む", () => {
  for (const slug of ["notion", "github", "zendesk", "salesforce"]) {
    const m = front(slug).match(/^title:\s*"(.+)"$/m);
    assert.ok(m, `${slug} にtitleがある`);
    assert.match(m[1], /オープンソース/);
    assert.match(m[1], /\{n\}/);
    assert.match(m[1], /\{year\}/);
  }
});

test("titleの無いガイドは、自動生成のtitleを使う", () => {
  assert.doesNotMatch(front("jira"), /^title:/m);
});
