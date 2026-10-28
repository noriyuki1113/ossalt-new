import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import matter from "gray-matter";
import { parseVerification, validateVerification } from "./verification.ts";

test("記録が無い・不正なものは「未検証」になる（確認済みと扱わない）", () => {
  assert.equal(parseVerification(undefined).status, "unverified");
  assert.equal(parseVerification({ status: "official" }).status, "unverified"); // 日付・出典なし
  assert.equal(parseVerification({ status: "official", checked_at: "2026-10-28", sources: ["http://example.com"] }).status, "unverified"); // httpsでない
  assert.equal(parseVerification({ status: "hands-on", checked_at: "2026-10-28", sources: ["https://example.com"] }).status, "unverified"); // noteなし
  assert.equal(parseVerification({ status: "bogus" }).status, "unverified");
});

test("日付・出典・（実機検証なら）noteがそろえば、その状態になる", () => {
  const o = parseVerification({ status: "official", checked_at: "2026-10-28", sources: ["https://docs.example.com/install"] });
  assert.equal(o.status, "official");
  assert.deepEqual(o.sources, ["https://docs.example.com/install"]);
  const h = parseVerification({ status: "hands-on", checked_at: "2026-10-28", sources: ["https://example.com"], note: "Ubuntu 24.04 で docker compose up を実行し、ログインまで確認" });
  assert.equal(h.status, "hands-on");
});

test("validate：不足を説明する", () => {
  assert.deepEqual(validateVerification(undefined), []);
  assert.match(validateVerification({ status: "official" }).join("|"), /checked_at/);
  assert.match(validateVerification({ status: "hands-on", checked_at: "2026-10-28", sources: ["https://e.com"] }).join("|"), /note/);
  assert.match(validateVerification({ status: "x" }).join("|"), /status が不正/);
});

test("content/ の全解説の verification は、書き方が正しい", () => {
  for (const dir of ["tools", "alternatives", "compare"]) {
    for (const f of fs.readdirSync(`content/${dir}`).filter((x) => x.endsWith(".md"))) {
      const { data } = matter(fs.readFileSync(`content/${dir}/${f}`, "utf8"));
      assert.deepEqual(validateVerification(data.verification), [], `${dir}/${f}`);
    }
  }
});
