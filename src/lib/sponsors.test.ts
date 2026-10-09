import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isRunning, sponsorFor, todayJst, validateSponsor, type Sponsor } from "./sponsors.ts";

const base: Sponsor = {
  id: "example-trial",
  advertiser: "テスト株式会社",
  title: "テストの見出し",
  description: "テストの説明",
  destination_url: "https://example.com/",
  placement: "alternative",
  targets: [],
  start_date: "2026-11-01",
  end_date: "2026-11-30",
  status: "active",
  contract_confirmed_on: "2026-10-20",
};

test("契約を確認した日がない active の掲載は検査に通らず、表示もされない（架空の広告を出さない）", () => {
  const s = { ...base, contract_confirmed_on: null };
  assert.ok(validateSponsor(s).some((e) => /contract_confirmed_on/.test(e)));
  assert.equal(isRunning(s, "2026-11-10"), false);
});

test("https 以外の遷移先、長すぎる見出し、逆転した期間は不合格", () => {
  assert.ok(validateSponsor({ ...base, destination_url: "http://example.com/" }).length > 0);
  assert.ok(validateSponsor({ ...base, title: "あ".repeat(41) }).length > 0);
  assert.ok(validateSponsor({ ...base, start_date: "2026-12-01" }).length > 0);
  assert.deepEqual(validateSponsor(base), []);
});

test("期間・状態・掲載先で絞り込み、ページを指定した掲載を優先する", () => {
  assert.equal(sponsorFor([base], "alternative", "slack", "2026-10-31"), null); // 開始前
  assert.equal(sponsorFor([base], "alternative", "slack", "2026-11-30")?.id, "example-trial"); // 最終日を含む
  assert.equal(sponsorFor([base], "alternative", "slack", "2026-12-01"), null); // 終了後
  assert.equal(sponsorFor([{ ...base, status: "paused" }], "alternative", "slack", "2026-11-10"), null);
  assert.equal(sponsorFor([base], "blog", "x", "2026-11-10"), null); // 別の場所
  const targeted = { ...base, id: "chat-only", targets: ["slack"], start_date: "2026-11-05" };
  assert.equal(sponsorFor([base, targeted], "alternative", "slack", "2026-11-10")?.id, "chat-only");
  assert.equal(sponsorFor([base, targeted], "alternative", "notion", "2026-11-10")?.id, "example-trial");
});

test("日本時間の日付で判定する", () => {
  assert.equal(todayJst(new Date("2026-10-31T15:00:00Z")), "2026-11-01");
  assert.equal(todayJst(new Date("2026-10-31T14:59:59Z")), "2026-10-31");
});

test("data-source/sponsors.json の掲載はすべて検査に合格する", () => {
  const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data-source", "sponsors.json"), "utf8"));
  assert.ok(Array.isArray(raw.sponsors));
  for (const s of raw.sponsors as Sponsor[]) assert.deepEqual(validateSponsor(s), [], s.id);
});
