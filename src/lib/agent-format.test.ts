import { test } from "node:test";
import assert from "node:assert/strict";
import { alternativeMarkdown, toolMarkdown, toolRecord, toolSummary } from "./agent-format.ts";
import type { Tool } from "./tools.ts";

const tool = {
  id: "x", name: "X", url: "https://x.dev", github_url: "https://github.com/a/x",
  description_ja: "説明。", category: "note-docs", primary_competitor: "Notion", primary_competitor_ja: null,
  also_competitors: ["Evernote"], license: "BUSL 1.1", ja_ui: false, ja_docs: "none", docker_available: false,
  stars_num: 1200, star_gain: { gain: 30, days: 7, from: "2026-09-25" }, last_commit: "2026-09-30T00:00:00Z",
  freshness_days: 2, github_archived: false, scorecard_score: null, scorecard_date: null, security_md: null,
  releases_12mo: 4, health_score: 123.4,
} as unknown as Tool;

const r = toolRecord(tool, { base: "https://ossalt.jp", categoryName: "ノート・ドキュメント" });

test("確認できていない項目は null（false や none を出さない）", () => {
  assert.equal(r.ja_ui, null);
  assert.equal(r.ja_docs, null);
  assert.equal(r.docker, null);
  assert.equal(r.scorecard, null);
});

test("URL・代替対象・ライセンスの種類", () => {
  assert.equal(r.page_url, "https://ossalt.jp/tools/x/");
  assert.equal(r.markdown_url, "https://ossalt.jp/md/tools/x.md");
  assert.deepEqual(r.alternative_to, ["Notion", "Evernote"]);
  assert.equal(r.license_class, "source-available");
  assert.equal(toolSummary(r).api_url, "https://ossalt.jp/api/v1/tools/x.json");
});

test("Markdown版：未確認と書き、出典を付ける", () => {
  const md = toolMarkdown(r, { builtAt: "2026-10-02T00:00:00Z" });
  assert.match(md, /画面の日本語翻訳: 未確認/);
  assert.match(md, /^# X\n\n/);
  assert.match(md, /一般的なオープンソースライセンスではない/);
  assert.match(md, /直近7日間で\+30/);
  assert.match(md, /ossalt\.jp（2026-10-02時点/);
  assert.doesNotMatch(md, /非対応です|なし\b/);
  const alt = alternativeMarkdown("Notion", "https://ossalt.jp/alternatives/notion/", [r], { builtAt: "2026-10-02" });
  assert.match(alt, /\| \[X\]\(https:\/\/ossalt\.jp\/md\/tools\/x\.md\) \| BUSL 1\.1 \|/);
});
