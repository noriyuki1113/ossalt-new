import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { formatCheckedOn, formatSpec, validateRequirement, type Requirement } from "./requirements.ts";
import { runtimeKind } from "./affiliate-context.ts";

test("表示の形", () => {
  assert.equal(formatSpec({ ram_gb: 4, cpu_cores: 2, disk_gb: 40 }), "メモリ4GB・CPU2コア・ディスク40GB");
  assert.equal(formatSpec({ ram_gb: 0.5 }), "メモリ512MB");
  assert.equal(formatCheckedOn("2026-10-09"), "2026年10月9日");
});

test("data-source/requirements.json：形式・出典・確認日がそろい、実在するサーバー用のツールだけ", () => {
  const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data-source", "requirements.json"), "utf8"));
  const tools = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data-source", "tools.json"), "utf8"));
  const ids = new Set((Array.isArray(tools) ? tools : tools.tools).map((t: { id: string }) => t.id));
  const entries = Object.entries(raw.requirements as Record<string, Requirement>);
  assert.ok(entries.length > 0);
  for (const [id, r] of entries) {
    assert.deepEqual(validateRequirement(id, r), [], id);
    assert.ok(ids.has(id), `${id} が掲載データにない`);
    assert.equal(runtimeKind(id), "server", `${id} はVPSの紹介枠が出るツールであること`);
  }
});

test("出典のない要件・空の要件は不合格", () => {
  const base: Requirement = { minimum: { ram_gb: 2 }, source_title: "t", source_url: "https://example.com/", checked_on: "2026-10-09" };
  assert.deepEqual(validateRequirement("x", base), []);
  assert.ok(validateRequirement("x", { ...base, source_url: "" }).length > 0);
  assert.ok(validateRequirement("x", { ...base, minimum: undefined }).length > 0);
  assert.ok(validateRequirement("x", { ...base, minimum: {} }).length > 0);
});
