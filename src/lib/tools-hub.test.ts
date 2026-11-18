import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCategoryDirectory } from "./tools-hub.ts";

type T = { id: string; name: string; category: string; health_score: number | null; github_archived?: boolean };
const t = (id: string, category: string, health: number | null, extra: Partial<T> = {}): T => ({ id, name: id.toUpperCase(), category, health_score: health, ...extra });
const cats = [
  { slug: "a", nameJa: "分野A" },
  { slug: "b", nameJa: "分野B" },
  { slug: "empty", nameJa: "空の分野" },
];

test("分野ごとに、掲載数と、健全度の高い順の代表ツールを返す", () => {
  const dir = buildCategoryDirectory(
    [t("a1", "a", 10), t("a2", "a", 90), t("a3", "a", 50), t("a4", "a", 70), t("b1", "b", 5)],
    cats,
    { perCategory: 3, excludeFromReps: () => false },
  );
  const a = dir.find((c) => c.slug === "a")!;
  assert.equal(a.count, 4);
  assert.deepEqual(a.reps.map((r) => r.id), ["a2", "a4", "a3"]);
});

test("アーカイブ済みは、件数にも代表にも入れない。掲載0件の分野は出さない", () => {
  const dir = buildCategoryDirectory([t("a1", "a", 10), t("a2", "a", 99, { github_archived: true })], cats, { perCategory: 3, excludeFromReps: () => false });
  assert.equal(dir.find((c) => c.slug === "a")!.count, 1);
  assert.deepEqual(dir.find((c) => c.slug === "a")!.reps.map((r) => r.id), ["a1"]);
  assert.equal(dir.some((c) => c.slug === "empty"), false);
});

test("検索の登録対象から外しているツール（noindex）は、代表に入れない。件数には数える", () => {
  const dir = buildCategoryDirectory([t("a1", "a", 90), t("a2", "a", 50)], cats, { perCategory: 3, excludeFromReps: (id) => id === "a1" });
  const a = dir.find((c) => c.slug === "a")!;
  assert.equal(a.count, 2);
  assert.deepEqual(a.reps.map((r) => r.id), ["a2"]);
});

test("健全度が無いものは最後。同点は名前順。分野は掲載数の多い順（同数は元の順）", () => {
  const dir = buildCategoryDirectory(
    [t("a2", "a", null), t("a1", "a", null), t("a0", "a", 1), t("b1", "b", 3), t("b2", "b", 4), t("b3", "b", 5), t("b4", "b", 6)],
    cats,
    { perCategory: 3, excludeFromReps: () => false },
  );
  assert.deepEqual(dir.map((c) => c.slug), ["b", "a"]);
  // 同数のときは、元の並び（a が先）
  const tie = buildCategoryDirectory([t("a1", "a", 1), t("b1", "b", 1)], cats, { perCategory: 3, excludeFromReps: () => false });
  assert.deepEqual(tie.map((c) => c.slug), ["a", "b"]);
  assert.deepEqual(dir.find((c) => c.slug === "a")!.reps.map((r) => r.id), ["a0", "a1", "a2"]);
});

test("実データ：すべての分野に、1件以上の代表がある", async () => {
  const fs = await import("node:fs");
  const raw = JSON.parse(fs.readFileSync("public/data/tools.json", "utf8"));
  const tools = (Array.isArray(raw) ? raw : raw.tools) as T[];
  const categories = JSON.parse(fs.readFileSync("public/data/categories.json", "utf8")) as Array<{ slug: string; nameJa: string; count: number }>;
  const dir = buildCategoryDirectory(tools, categories.filter((c) => c.count > 0), { perCategory: 3, excludeFromReps: () => false });
  assert.ok(dir.length >= 20);
  assert.ok(dir.every((c) => c.reps.length >= 1 && c.reps.length <= 3));
});
