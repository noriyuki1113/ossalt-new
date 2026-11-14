import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { growthViews, popularViews, recommendedViews, RANK_TOP_N } from "./ranking-views.ts";
import { parseBrowserTools } from "./tool-browser-data.ts";
import type { Tool } from "./tools.ts";

const raw = JSON.parse(fs.readFileSync("public/data/tools.json", "utf8"));
const active: Tool[] = (Array.isArray(raw) ? raw : raw.tools).filter((t: Tool) => !t.github_archived);

test("ブラウザで /data/tools.json から計算し直しても、サーバーで計算した急成長・おすすめと同じになる", () => {
  const fromFile = parseBrowserTools(raw)!;
  assert.deepEqual(growthViews(fromFile), growthViews(active));
  assert.deepEqual(recommendedViews(fromFile, "2026/11/14"), recommendedViews(active, "2026/11/14"));
});

test("人気・急成長は上位 RANK_TOP_N 件まで", () => {
  assert.ok(popularViews(active, "x").rows.length <= RANK_TOP_N);
  assert.ok(growthViews(active).rows.length <= RANK_TOP_N);
});
