import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { decideToolNoindex, isToolNoindex, noindexCandidateIds } from "./search-index.ts";

const tools: { id: string; github_archived?: boolean }[] = (() => {
  const d = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "data", "tools.json"), "utf8"));
  return Array.isArray(d) ? d : d.tools;
})();
const guideIds = new Set(fs.readdirSync(path.join(process.cwd(), "content", "tools")).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, "")));

test("判定：リストにあり解説が無いページだけ noindex。解説が付くと index に戻る", () => {
  const list = new Set(["a", "b"]);
  assert.equal(decideToolNoindex("a", list, false), true);
  assert.equal(decideToolNoindex("a", list, true), false, "解説が追加されたら index に戻る");
  assert.equal(decideToolNoindex("c", list, false), false, "リストに無いページは、解説が無くても index のまま");
  assert.equal(decideToolNoindex("c", new Set(), false), false, "リストが空なら、どのページも noindex にしない");
});

test("リストのIDは、すべて掲載中のデータに実在する", () => {
  const ids = new Set(tools.map((t) => t.id));
  const unknown = [...noindexCandidateIds()].filter((id) => !ids.has(id));
  assert.deepEqual(unknown, []);
  assert.ok(noindexCandidateIds().size > 0);
});

test("解説のあるページは、すべて index のまま", () => {
  const wrong = [...guideIds].filter((id) => isToolNoindex(id));
  assert.deepEqual(wrong, []);
});

test("「先に解説を書く」ページ（解説なし・リスト外）は index のまま。リスト内で解説なしは noindex", () => {
  const list = noindexCandidateIds();
  for (const t of tools) {
    if (guideIds.has(t.id)) continue;
    assert.equal(isToolNoindex(t.id), list.has(t.id), t.id);
  }
  // 代表例：検索の需要があるので残すページ／需要がないので外すページ
  for (const id of ["mediawiki", "peertube", "zitadel"]) assert.equal(isToolNoindex(id), false, id);
  for (const id of ["gimp", "redmine", "zabbix"]) assert.equal(isToolNoindex(id), guideIds.has(id) ? false : true, id);
});
