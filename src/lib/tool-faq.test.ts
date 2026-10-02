import { test } from "node:test";
import assert from "node:assert/strict";
import { buildToolFaq } from "./tool-faq.ts";

const base = {
  id: "x",
  name: "X",
  license: "MIT",
  ja_ui: null,
  ja_docs: null,
  docker_available: null,
  freshness_days: 10,
  health_score: 1,
  github_archived: false,
  releases_12mo: 5,
  scorecard_score: null,
  security_md: null,
  star_gain: null,
} as const;

const find = (faq: ReturnType<typeof buildToolFaq>, q: string) => faq.find((f) => f.q.includes(q))!.a;
const opts = { competitor: "Notion", others: [{ id: "x", name: "X" }, { id: "y", name: "Y" }] };

test("未確認の項目は断定しない", () => {
  const faq = buildToolFaq(base, opts);
  assert.match(find(faq, "日本語"), /確認できていません/);
  assert.match(find(faq, "Docker"), /確認できていません/);
  for (const f of faq) assert.doesNotMatch(f.a, /非対応です|使えません/);
  assert.match(find(faq, "セキュリティ"), /評価はまだありません/);
});

test("確認できた項目と、ライセンスの種類ごとの説明", () => {
  const faq = buildToolFaq({ ...base, ja_ui: true, ja_docs: "official", docker_available: true, license: "BUSL 1.1" }, opts);
  assert.match(find(faq, "日本語"), /翻訳のファイルがあることを確認/);
  assert.match(find(faq, "日本語"), /ドキュメントも確認/);
  assert.match(find(faq, "Docker"), /確認できています/);
  assert.match(find(faq, "無料"), /一般的なオープンソースライセンスではありません/);
});

test("開発の状況：アーカイブ・1年以上・スターの伸び", () => {
  assert.match(find(buildToolFaq({ ...base, github_archived: true }, opts), "開発"), /開発は終了/);
  assert.match(find(buildToolFaq({ ...base, freshness_days: 500 }, opts), "開発"), /1年以上更新がない/);
  const g = find(buildToolFaq({ ...base, star_gain: { gain: 1200, days: 7, from: "2026-09-25" } }, opts), "開発");
  assert.match(g, /直近7日間で1,200増えて/);
});

test("ほかの候補：自分を除く。1件だけのときの言い回し", () => {
  assert.match(find(buildToolFaq(base, opts), "以外"), /Yも掲載/);
  assert.match(find(buildToolFaq(base, { competitor: "Notion", others: [{ id: "x", name: "X" }] }), "以外"), /Xだけ/);
  assert.equal(buildToolFaq(base, { competitor: null, others: [] }).some((f) => f.q.includes("以外")), false);
});
