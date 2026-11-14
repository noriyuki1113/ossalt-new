import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { browserFacets, initialBrowserTools, parseBrowserData, parseBrowserTools } from "./tool-browser-data.ts";
import { buildOwnReport } from "./own-changes.ts";
import { filterAndSort, licenseFacets, type Tool } from "./tools.ts";

const raw = JSON.parse(fs.readFileSync("public/data/tools.json", "utf8"));
const all: Tool[] = Array.isArray(raw) ? raw : raw.tools;
const active = all.filter((t) => !t.github_archived);

test("全件のデータファイルから、一覧と同じツール（アーカイブ以外）を取り出せる", () => {
  const parsed = parseBrowserTools(raw);
  assert.ok(parsed);
  assert.deepEqual(parsed!.map((t) => t.id), active.map((t) => t.id));
});

test("想定外の形のデータは null（読み込めなかった扱い）", () => {
  assert.equal(parseBrowserTools(null), null);
  assert.equal(parseBrowserTools({ foo: 1 }), null);
  assert.equal(parseBrowserTools("x"), null);
  assert.deepEqual(parseBrowserTools({ tools: [{ id: "a" }, null, { id: "b", name: "B" }] })!.map((t) => t.id), ["b"]);
});

test("初期HTMLの分は、全件を初期の並び替えにした先頭と一致する（読み込み後に並びが変わらない）", () => {
  const first = initialBrowserTools(active, 50);
  const full = filterAndSort(active, { sort: "health" });
  assert.equal(first.length, Math.min(50, active.length));
  assert.deepEqual(first.map((t) => t.id), full.slice(0, 50).map((t) => t.id));
});

test("件数とライセンスの選択肢は、全件から数える", () => {
  const f = browserFacets(active);
  assert.equal(f.total, active.length);
  assert.deepEqual(f.licenses, licenseFacets(active));
  assert.equal(f.groups.reduce((s, g) => s + g.count, 0), active.length);
});

test("変化レポートは、全件のデータファイルから計算し直しても、サーバーで作った結果と同じになる", () => {
  const asOf = new Date("2026-11-14T00:00:00Z");
  const fromFile = parseBrowserData(raw);
  assert.ok(fromFile);
  assert.equal(fromFile!.length, all.length);
  const a = buildOwnReport(all, { asOf, starsAsOf: null });
  const b = buildOwnReport(fromFile!, { asOf, starsAsOf: null });
  assert.deepEqual(b.star.up.map((r) => r.tool.id), a.star.up.map((r) => r.tool.id));
  assert.deepEqual(b.star.down.map((r) => r.tool.id), a.star.down.map((r) => r.tool.id));
  assert.deepEqual(b.maintenance.longQuiet.map((r) => r.tool.id), a.maintenance.longQuiet.map((r) => r.tool.id));
  assert.deepEqual(b.maintenance.recentReleases.map((r) => r.tool.id), a.maintenance.recentReleases.map((r) => r.tool.id));
});
