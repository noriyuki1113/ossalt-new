import { test } from "node:test";
import assert from "node:assert/strict";
import { applyFilters, createServer, matchSaas, NotFoundError } from "../src/core.mjs";

const tools = [
  { id: "appflowy", name: "AppFlowy", category: "note-docs", alternative_to: ["Notion"], license_class: "network-copyleft", ja_ui: true, docker: true, stars: 77000 },
  { id: "outline", name: "Outline", category: "note-docs", alternative_to: ["Confluence"], license_class: "source-available", ja_ui: true, docker: true, stars: 30000 },
  { id: "anytype", name: "Anytype", category: "note-docs", alternative_to: ["Notion"], license_class: "source-available", ja_ui: null, docker: null, stars: 8000 },
];
const DATA = {
  "/alternatives.json": { alternatives: [{ slug: "notion", name: "Notion", count: 2 }, { slug: "google-photos", name: "Google Photos", count: 1 }, { slug: "google-drive", name: "Google Drive", count: 1 }] },
  "/alternatives/notion.json": { name: "Notion", page_url: "https://ossalt.jp/alternatives/notion/", tools: [tools[0], tools[2]], picks: [], updated_at: "2026-10-02" },
  "/tools.json": { tools },
  "/tools/appflowy.json": { ...tools[0], page_url: "https://ossalt.jp/tools/appflowy/" },
  "/tools/outline.json": { ...tools[1], page_url: "https://ossalt.jp/tools/outline/" },
  "/categories.json": { categories: [{ slug: "note-docs", name_ja: "ノート・ドキュメント", count: 3 }] },
};
const fetchJson = async (url) => {
  const p = url.replace("https://x/api/v1", "");
  if (!(p in DATA)) throw new NotFoundError(url);
  return DATA[p];
};
const server = createServer({ apiBase: "https://x/api/v1", fetchJson });
const call = async (name, args) => {
  const r = await server.handle({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } });
  return { ...r.result, data: r.result.structuredContent };
};

test("SaaS名の照合：表記ゆれと候補", () => {
  const list = DATA["/alternatives.json"].alternatives;
  assert.equal(matchSaas(list, "notion").match.slug, "notion");
  assert.equal(matchSaas(list, "googlephotos").match.slug, "google-photos");
  assert.equal(matchSaas(list, "ノーション").match.slug, "notion");
  assert.equal(matchSaas(list, "Google").match, null);
  assert.equal(matchSaas(list, "Google").candidates.length, 2);
});

test("絞り込み：日本語・Docker・一般的なOSSのみ、スター順", () => {
  assert.deepEqual(applyFilters(tools, { japanese: true }).map((t) => t.id), ["appflowy", "outline"]);
  assert.deepEqual(applyFilters(tools, { open_source_only: true }).map((t) => t.id), ["appflowy"]);
  assert.equal(applyFilters(tools, { limit: 1 }).length, 1);
});

test("initialize と tools/list", async () => {
  const init = await server.handle({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-03-26" } });
  assert.equal(init.result.protocolVersion, "2025-03-26");
  assert.ok(init.result.capabilities.tools);
  const list = await server.handle({ jsonrpc: "2.0", id: 1, method: "tools/list" });
  assert.deepEqual(list.result.tools.map((t) => t.name), ["search_alternatives", "search_tools", "get_tool", "compare_tools", "list_categories"]);
  assert.equal(await server.handle({ jsonrpc: "2.0", method: "notifications/initialized" }), null);
  const bad = await server.handle({ jsonrpc: "2.0", id: 2, method: "nope" });
  assert.equal(bad.error.code, -32601);
});

test("search_alternatives", async () => {
  const r = await call("search_alternatives", { saas: "Notion", japanese: true });
  assert.equal(r.data.saas, "Notion");
  assert.deepEqual(r.data.tools.map((t) => t.id), ["appflowy"]);
  const amb = await call("search_alternatives", { saas: "Google" });
  assert.equal(amb.data.found, false);
  assert.equal(amb.data.candidates.length, 2);
});

test("search_tools・get_tool・compare_tools・list_categories", async () => {
  assert.deepEqual((await call("search_tools", { query: "confluence" })).data.tools.map((t) => t.id), ["outline"]);
  assert.equal((await call("get_tool", { id: "AppFlowy" })).data.id, "appflowy");
  const missing = await call("get_tool", { id: "appflow" });
  assert.equal(missing.data.found, false);
  assert.equal(missing.data.similar[0].id, "appflowy");
  const cmp = await call("compare_tools", { ids: ["outline", "appflowy"] });
  assert.equal(cmp.data.compare_page_hint, "https://ossalt.jp/compare/appflowy-vs-outline/");
  assert.equal((await call("list_categories", {})).data.categories.length, 1);
  assert.equal((await call("compare_tools", { ids: ["x"] })).isError, true);
});
