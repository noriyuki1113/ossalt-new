import { test } from "node:test";
import assert from "node:assert/strict";
import { errorAnnotation, emitErrors } from "./gh-annotation.mjs";

test("errorAnnotation: メッセージとタイトルをエスケープする", () => {
  assert.equal(errorAnnotation("a%b\nc", "t:1,2"), "::error title=t%3A1%2C2::a%25b%0Ac");
  assert.equal(errorAnnotation("x"), "::error::x");
});

test("emitErrors: GITHUB_ACTIONS=true のときだけ出す", () => {
  const out = [];
  assert.equal(emitErrors(["a", "b"], "T", { GITHUB_ACTIONS: "true" }, (l) => out.push(l)), 2);
  assert.deepEqual(out, ["::error title=T::a", "::error title=T::b"]);
  const none = [];
  assert.equal(emitErrors(["a"], "T", {}, (l) => none.push(l)), 0);
  assert.deepEqual(none, []);
});
