import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validateRelations, type RelationData } from "./alternative-relations.ts";

type T = { id: string; primary_competitor: string; also_competitors?: string[] };
const parsed = JSON.parse(fs.readFileSync("public/data/tools.json", "utf8"));
const list: T[] = Array.isArray(parsed) ? parsed : parsed.tools;
const tools = new Set(list.map((t) => t.id));
const raw = JSON.parse(fs.readFileSync("data-source/alternative-relations.json", "utf8")).relations as RelationData;
const saas = new Set(["chatgpt", "netflix", "youtube"]);

test("同梱の分類データは、検証を通る（ツールid・種類・根拠・確認日）", () => {
  assert.deepEqual(validateRelations(raw, tools, saas), []);
});

test("検証：根拠が無い・存在しないツール・comboの相手が無い、を検出する", () => {
  const bad: RelationData = {
    chatgpt: {
      nonexistent: { relation: "direct", note: "x", source: "x", checked_at: "2026-10-28" },
      ollama: { relation: "combo", note: "x", source: "", checked_at: "bad" },
    },
  };
  const p = validateRelations(bad, tools, saas).join("|");
  assert.match(p, /存在しないツールid/);
  assert.match(p, /根拠（source）が空/);
  assert.match(p, /checked_at/);
  assert.match(p, /combo には組み合わせ相手/);
});

test("分類したツールは、そのSaaSの代替候補として掲載されている", () => {
  const by = new Map(list.map((t) => [t.id, t]));
  const names: Record<string, string> = { chatgpt: "ChatGPT", netflix: "Netflix", youtube: "YouTube" };
  for (const [s, entries] of Object.entries(raw)) {
    for (const id of Object.keys(entries)) {
      const t = by.get(id)!;
      assert.ok(t.primary_competitor === names[s] || (t.also_competitors ?? []).includes(names[s]), `${s}/${id} は ${names[s]} の候補ではない`);
    }
  }
});
