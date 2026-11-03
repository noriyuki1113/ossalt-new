import { test } from "node:test";
import assert from "node:assert/strict";
import { releaseInfoLabel } from "./tools.ts";

test("リリースの表示：最新の日付が無くても、回数が0と取得できているときだけ「ありません」。どちらも未取得なら「未確認」", () => {
  assert.equal(releaseInfoLabel(null, 0), "リリースはありません");
  assert.equal(releaseInfoLabel(null, null), "未確認");
  assert.match(releaseInfoLabel("2026-08-12T00:00:00Z", 5), /直近12か月に5回/);
});
