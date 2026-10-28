import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAlternativeDecision, GENERAL_NO_GO } from "./alternative-decision.ts";
import { TOOL_DIAGNOSIS } from "./diagnosis-data.ts";
import type { Tool } from "./tools.ts";
import tools from "../../public/data/tools.json" with { type: "json" };

const all = tools as unknown as Tool[];
const metas = Object.values(TOOL_DIAGNOSIS);
const standing = () => ({ popular: null, growth: null });
const group = (name: string) => all.filter((t) => !t.github_archived && t.primary_competitor === name);
function tool(id: string, o: Partial<Tool> = {}): Tool {
  return { id, name: id, license: "MIT", freshness_days: 5, docker_available: true, ja_ui: true, ja_docs: null,
    github_archived: false, ...o } as unknown as Tool;
}

test("機能データのある5つのSaaS：機能の比較表とおすすめの目安が出る。診断データの機能数と一致", () => {
  const d = buildAlternativeDecision("notion", "Notion", group("Notion"), metas, standing);
  assert.ok(d.matrix && d.recommended);
  assert.equal(d.matrix!.features.length, 8);
  assert.equal(d.matrix!.rows.length, d.recommended!.length);
  for (const r of d.matrix!.rows) assert.equal(r.states.length, 8);
  assert.ok(d.rows.every((r) => r.difficulty !== null || !metas.some((m) => m.toolId === r.tool.id)));
});

test("それ以外のSaaS：機能の比較表・おすすめの点数は作らず、導入・運用は未評価", () => {
  const d = buildAlternativeDecision("airtable", "Airtable", group("Airtable"), metas, standing);
  assert.equal(d.matrix, null);
  assert.equal(d.recommended, null);
  assert.ok(d.rows.length > 0);
  assert.ok(d.rows.every((r) => r.difficulty === null && r.difficultyLabel === "未評価"));
});

test("早見表：ライセンスの区分・日本語・Dockerを、未確認を「無い」と書かずに示す", () => {
  const d = buildAlternativeDecision("x", "X", [
    tool("a", { license: "Sustainable Use License", docker_available: null, ja_ui: null }),
    tool("b", { license: null, docker_available: false, ja_ui: null, ja_docs: "community" }),
  ], [], standing);
  const [a, b] = d.rows;
  assert.match(a.licenseLabel, /ソース公開型/);
  assert.equal(a.docker, "未確認");
  assert.equal(a.japanese, "未確認");
  assert.match(b.licenseLabel, /未確認/);
  assert.equal(b.docker, "確認できていない");
  assert.equal(b.japanese, "有志のドキュメントあり");
});

test("乗り換えない方がよいケース：データから言えることだけを出し、一般的な目安は分ける", () => {
  const few = buildAlternativeDecision("x", "X", [tool("a")], [], standing);
  assert.match(few.fromData.join("｜"), /候補が1件と少なく/);
  assert.deepEqual(few.general, GENERAL_NO_GO);

  const bad = buildAlternativeDecision("x", "X", [
    tool("a", { license: "BUSL 1.1", freshness_days: 400, docker_available: null, ja_ui: null }),
    tool("b", { license: "FSL 1.1", freshness_days: 300, docker_available: false, ja_ui: null }),
    tool("c", { license: null, freshness_days: 200, docker_available: null, ja_ui: null }),
  ], [], standing);
  const t = bad.fromData.join("｜");
  assert.match(t, /OSI承認ではない/);
  assert.match(t, /日本語の画面・ドキュメントを確認できた候補がありません/);
  assert.match(t, /更新がある候補がありません/);
  assert.match(t, /Docker/);

  // 条件がそろわなければ、理由を作らない
  const ok = buildAlternativeDecision("x", "X", [tool("a"), tool("b"), tool("c")], [], standing);
  assert.deepEqual(ok.fromData, []);
});

test("アーカイブ済みは候補に入れない。順位は渡された関数の値を使う", () => {
  const d = buildAlternativeDecision("x", "X", [tool("a"), tool("z", { github_archived: true })], [],
    (id) => ({ popular: id === "a" ? { rank: 7 } : null, growth: null }));
  assert.deepEqual(d.rows.map((r) => r.tool.id), ["a"]);
  assert.equal(d.rows[0].popularRank, 7);
  assert.equal(d.rows[0].growthRank, null);
});

test("実データ：全SaaSの代替ページで、要約が作れる", () => {
  const names = new Set(all.filter((t) => !t.github_archived).map((t) => t.primary_competitor).filter(Boolean));
  assert.ok(names.size > 100);
  for (const n of names) {
    const d = buildAlternativeDecision("x", n, group(n), metas, standing);
    assert.ok(d.rows.length > 0, n);
    for (const r of d.rows) assert.ok(r.licenseLabel && r.japanese && r.update, `${n}/${r.tool.id}`);
  }
});
