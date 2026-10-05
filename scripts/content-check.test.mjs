import { test } from "node:test";
import assert from "node:assert/strict";
import { checkContent, extractLicenseClaims, licenseMatches, ownSentences, renderReport } from "./content-check-lib.mjs";

const tool = (id, extra = {}) => [id, { id, name: id.toUpperCase(), license: "MIT", ja_ui: true, docker_available: true, freshness_days: 3, github_archived: false, ...extra }];
const base = (docs, toolsExtra = {}) => ({
  docs,
  tools: new Map([tool("a", toolsExtra.a), tool("b", toolsExtra.b), tool("old", { github_archived: true })]),
  pairs: new Set(["a-vs-b"]),
  alternatives: new Set(["notion"]),
  categories: new Set(["ai"]),
  blogDates: new Map([["past", "2026-09-01"], ["future", "2026-12-01"]]),
  today: "2026-10-06",
});
const msgs = (issues) => issues.map((i) => `${i.level}:${i.message}`);

test("ライセンスの記述を取り出し、データと比べる", () => {
  assert.deepEqual(extractLicenseClaims("- ライセンスはApache-2.0です。\nライセンスは、当サイトのデータではMITです。"), ["Apache-2.0", "MIT"]);
  assert.equal(licenseMatches("GPL-2.0", "GPL-2.0 / GPL-3.0"), true);
  assert.equal(licenseMatches("MIT", "GPL-3.0"), false);
  assert.equal(licenseMatches("MIT", null), true); // データが未取得なら判定しない
});

test("ほかのツールについて書いた文は、判定から外す", () => {
  const own = ownSentences("[B](/tools/b/)は、ライセンスはGPL-3.0です。Aのライセンスは問題ない。", "a");
  assert.equal(extractLicenseClaims(own).length, 0);
});

test("食い違いを見つける：ライセンス・日本語・アーカイブ・更新の間隔", () => {
  const issues = checkContent(base([{ kind: "tool", slug: "a", text: "- ライセンスはMITです。画面の日本語翻訳も確認できています。" }], { a: { license: "GPL-3.0", ja_ui: null, freshness_days: 400 } }));
  const m = msgs(issues).join("\n");
  assert.match(m, /要対応:解説では「ライセンスはMIT」ですが、データは「GPL-3.0」です/);
  assert.match(m, /要確認:解説では画面の日本語翻訳/);
  assert.match(m, /要確認:最後の更新から400日/);
});

test("解説の中で触れていれば、アーカイブと更新の間隔は対応済みとみなす", () => {
  const issues = checkContent(base([{ kind: "tool", slug: "a", text: "更新の間隔があいています。" }], { a: { freshness_days: 400 } }));
  assert.equal(issues.length, 0);
});

test("比較の組み合わせから外れた解説と、リンクの問題", () => {
  const issues = checkContent(
    base([
      { kind: "compare", slug: "a-vs-x", text: "" },
      { kind: "tool", slug: "a", text: "[X](/tools/nope/) [Y](/compare/a-vs-b/) [Z](/blog/future/) [O](/tools/old/) [N](/alternatives/notion/)" },
    ]),
  );
  const m = msgs(issues).join("\n");
  assert.match(m, /組み合わせから外れた/);
  assert.match(m, /リンク切れ：\/tools\/nope\//);
  assert.match(m, /まだ公開されていない記事（future/);
  assert.match(m, /アーカイブされたツールへのリンク/);
  assert.doesNotMatch(m, /a-vs-b|notion/);
});

test("公開日の前後で、ブログからブログへのリンクを判定する", () => {
  const issues = checkContent(base([{ kind: "blog", slug: "later", date: "2026-12-08", text: "[F](/blog/future/) [P](/blog/past/)" }]));
  assert.equal(issues.length, 0);
});

test("見直しの時期と、レポートの形", () => {
  const issues = checkContent(base([{ kind: "category", slug: "ai", updated: "2026-01-01", text: "" }]));
  assert.match(msgs(issues)[0], /見直し:最終更新から278日/);
  const md = renderReport(issues, { today: "2026-10-06", counts: { tool: 0, compare: 0, alternative: 0, category: 1, blog: 0 } });
  assert.match(md, /## 見直し（1件）/);
  assert.match(md, /content\/categories\/ai\.md/);
});
