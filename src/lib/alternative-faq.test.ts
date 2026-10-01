import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAlternativeFaq } from "./alternative-faq.ts";

const base = {
  license: "MIT",
  ja_ui: null,
  ja_docs: null,
  docker_available: null,
  freshness_days: 10,
  health_score: 100,
} as const;

const tools = [
  { ...base, id: "a", name: "Alpha", ja_ui: true, docker_available: true, health_score: 300 },
  { ...base, id: "b", name: "Beta", license: "BUSL 1.1", ja_docs: "official" as const, health_score: 200 },
  { ...base, id: "c", name: "Gamma", license: "AGPL-3.0", freshness_days: 500 },
];

const find = (faq: ReturnType<typeof buildAlternativeFaq>, q: string) => faq.find((f) => f.q.includes(q))!.a;

test("件数と健全度順", () => {
  const faq = buildAlternativeFaq("Notion", tools);
  assert.match(find(faq, "いくつ"), /3件.*Alpha、Beta、Gamma/);
});

test("日本語：確認できたものだけ挙げ、残りは未確認とする", () => {
  const a = find(buildAlternativeFaq("Notion", tools), "日本語");
  assert.match(a, /画面の日本語翻訳を確認できたのはAlpha（1件）/);
  assert.match(a, /日本語のドキュメントを確認できたのはBeta/);
  assert.match(a, /残りの1件は確認できていません/);
  assert.doesNotMatch(a, /非対応/);
});

test("日本語：1件も確認できないときも断定しない", () => {
  const a = find(buildAlternativeFaq("X", [tools[2]]), "日本語");
  assert.match(a, /確認できていません/);
  assert.doesNotMatch(a, /非対応|使えません/);
});

test("ライセンス：ソース公開型を名指しする", () => {
  const a = find(buildAlternativeFaq("Notion", tools), "ライセンス");
  assert.match(a, /Betaは、ソースコードは公開されていますが/);
});

test("更新：1年以上止まっているものを挙げる", () => {
  const a = find(buildAlternativeFaq("Notion", tools), "開発");
  assert.match(a, /3件中2件/);
  assert.match(a, /Gammaは、最後の更新から1年以上/);
});

test("ツールが無ければ空", () => {
  assert.deepEqual(buildAlternativeFaq("X", []), []);
});

test("1件だけのときは、件数の言い回しを使わない", () => {
  const faq = buildAlternativeFaq("Ahrefs", [{ ...tools[0], freshness_days: 140 }]);
  assert.equal(find(faq, "ライセンス"), "AlphaのライセンスはMIT（許容型）です。社内で使うだけなら多くの場合は問題になりませんが、改変して外部に提供する場合などは、各ライセンスの条件を確認してください。");
  assert.match(find(faq, "開発"), /^Alphaの最後の更新は140日前です。/);
  assert.doesNotMatch(find(faq, "Docker"), /（1件）/);
});
