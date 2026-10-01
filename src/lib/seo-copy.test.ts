import { test } from "node:test";
import assert from "node:assert/strict";
import {
  alternativeDescription,
  alternativeTitle,
  categoryDescription,
  categoryTitle,
  clampText,
  toolDescription,
  toolTitle,
  topCompetitors,
} from "./seo-copy.ts";

const base = {
  description_ja: null,
  license: null,
  ja_ui: null,
  ja_docs: null,
  docker_available: null,
  primary_competitor: "Notion",
  primary_competitor_ja: "Notion",
} as const;

const tools = [
  { ...base, name: "AppFlowy", ja_ui: true, docker_available: true, license: "AGPL-3.0" },
  { ...base, name: "AFFiNE", docker_available: true },
  { ...base, name: "Outline", primary_competitor: "Confluence", primary_competitor_ja: "Confluence" },
];

test("clampText: 句点で切れるところで切る", () => {
  assert.equal(clampText("短い文。", 10), "短い文。");
  assert.equal(clampText("一つ目の文です。二つ目の文はとても長いのでここで切れる", 14), "一つ目の文です。");
  assert.equal(clampText("句点のないとても長い文章です", 8), "句点のないとて…");
});

test("alternativeTitle: 件数と年を入れる", () => {
  assert.equal(
    alternativeTitle("Notion", tools, 2026),
    "Notionの代替OSS 3選｜自前で動かせるオープンソースを比較【2026年】",
  );
  assert.match(alternativeTitle("Notion", [tools[0]], 2026), /「AppFlowy」/);
});

test("alternativeDescription: データの件数だけを書く", () => {
  const d = alternativeDescription("Notion", tools);
  assert.match(d, /3件（日本語対応1件・Docker対応2件）/);
  assert.match(d, /AppFlowy・AFFiNE・Outline/);
  assert.doesNotMatch(d, /無料/);
});

test("alternativeDescription: 該当0件の項目は書かない", () => {
  const d = alternativeDescription("Notion", [tools[2]]);
  assert.doesNotMatch(d, /日本語対応\d|Docker対応/);
});

test("topCompetitors: 件数の多い順", () => {
  assert.deepEqual(topCompetitors(tools), ["Notion", "Confluence"]);
});

test("category: タイトルと説明文", () => {
  assert.equal(categoryTitle("ノート・ドキュメント", tools), "ノート・ドキュメントのオープンソース3選｜Notion・Confluenceの代替を比較");
  const d = categoryDescription("ノート・ドキュメント", "社内Wikiを自前で。", tools);
  assert.match(d, /^社内Wikiを自前で。Notion・Confluenceの代わりになる/);
  assert.ok(d.length <= 160);
});

test("toolTitle / toolDescription", () => {
  assert.equal(toolTitle(tools[0]), "AppFlowyとは？Notionの代替オープンソース｜特徴・ライセンス・日本語対応");
  const d = toolDescription({ ...tools[0], description_ja: "AIを備えたワークスペース。" });
  assert.equal(
    d,
    "AIを備えたワークスペース。ライセンスはAGPL-3.0、画面の日本語翻訳あり、Dockerで導入可。Notionの他の代替候補とも比較できます。",
  );
  // 未確認の項目は「なし」と書かない
  assert.doesNotMatch(toolDescription(tools[2]), /なし|非対応/);
});
