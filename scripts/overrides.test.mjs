import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeDevelopmentMove } from "./overrides.mjs";

const ok = {
  from_url: "https://github.com/pocketbase/pocketbase", to_url: "https://ganigeorgiev.com/pocketbase/pocketbase",
  source_url: "https://github.com/pocketbase/pocketbase/discussions/7873", announced_on: "2026-10-26", checked_at: "2026-10-31", note: "  メモ  ",
};

test("開発場所の移転：公式の発表・移転先・日付がそろっていれば採用する", () => {
  const m = sanitizeDevelopmentMove(ok, "2026-10-31");
  assert.equal(m.to_url, "https://ganigeorgiev.com/pocketbase/pocketbase");
  assert.equal(m.note, "メモ");
  assert.equal(sanitizeDevelopmentMove({ ...ok, note: undefined }, "2026-10-31").note, undefined);
});

test("欠けているもの・不正なものは、推測で補わず null", () => {
  for (const k of ["from_url", "to_url", "source_url", "announced_on", "checked_at"]) assert.equal(sanitizeDevelopmentMove({ ...ok, [k]: undefined }, "2026-10-31"), null, k);
  assert.equal(sanitizeDevelopmentMove({ ...ok, to_url: "http://example.com/x" }, "2026-10-31"), null); // https のみ
  assert.equal(sanitizeDevelopmentMove({ ...ok, to_url: "javascript:alert(1)" }, "2026-10-31"), null);
  assert.equal(sanitizeDevelopmentMove({ ...ok, announced_on: "2026-02-30" }, "2026-10-31"), null); // 実在しない日付
  assert.equal(sanitizeDevelopmentMove({ ...ok, announced_on: "2026-11-05" }, "2026-10-31"), null); // 未来
  assert.equal(sanitizeDevelopmentMove({ ...ok, to_url: ok.from_url }, "2026-10-31"), null); // 移転先が同じ
  assert.equal(sanitizeDevelopmentMove(null), null);
  assert.equal(sanitizeDevelopmentMove("x"), null);
});
