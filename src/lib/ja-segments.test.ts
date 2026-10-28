import { test } from "node:test";
import assert from "node:assert/strict";
import { jaSegments } from "./ja-segments.ts";

test("語に分けても、つなげると元の文に戻る", () => {
  const t = "どちらもNotionの代わりになるオープンソースです。当サイトが公開データから取得したライセンス・更新状況を比べます。";
  assert.equal(jaSegments(t).join(""), t);
});

test("句読点・閉じ括弧は、直前の語に付く（行頭に来ない）", () => {
  const segs = jaSegments("自前で動かせる（Dockerあり）。次の文、です。");
  for (const s of segs) assert.doesNotMatch(s, /^[、。）」]/);
});

test("カタカナ・漢字の語は、途中で分けない", () => {
  const segs = jaSegments("セキュリティ評価とオープンソースの比較");
  assert.ok(segs.some((s) => s.includes("セキュリティ")));
  assert.ok(segs.some((s) => s.includes("オープン")));
});
