import { test } from "node:test";
import assert from "node:assert/strict";
import { calculate, EXAMPLE_INPUT, fromSearchParams, toSearchParams, validateInput, type CostInput } from "./cost-lab.ts";

const base: CostInput = { ...EXAMPLE_INPUT, years: 3 };

test("計算式：SaaSは月額×月数、OSSは初期費用＋（サーバー代＋運用の時間×時給）×月数", () => {
  const r = calculate(base);
  assert.equal(r.months, 36);
  assert.equal(r.saas.monthly, 20000); // 1000円×20人
  assert.equal(r.saas.total, 720000);
  assert.equal(r.oss.monthlyCash, 2500);
  assert.equal(r.oss.monthlyLabor, 12000); // 4時間×3000円
  assert.equal(r.oss.initial, 60000); // 20時間×3000円
  assert.equal(r.oss.total, 60000 + 14500 * 36);
  assert.equal(r.difference, 720000 - (60000 + 14500 * 36));
  assert.equal(r.monthlyDifference, 5500);
  assert.equal(r.breakEvenMonths, Math.ceil(60000 / 5500));
  assert.equal(r.breakEvenUsers, Math.ceil(14500 / 1000));
  assert.equal(r.verdict, "oss_cheaper");
});

test("OSSが必ず安くなる作りではない：少人数ならSaaSのほうが安い", () => {
  const r = calculate({ ...base, users: 5 });
  assert.equal(r.verdict, "saas_cheaper");
  assert.equal(r.breakEvenMonths, null);
  assert.ok(r.cautions.some((c) => /初期費用を取り戻せません/.test(c)));
});

test("ほぼ同じの判定と、運用時間0などへの注意", () => {
  // SaaS 14,500円/月 と OSS 14,500円/月、初期0 → 差0
  const same = calculate({ ...base, users: 1, saasPerUserMonthly: 14500, migrationHours: 0 });
  assert.equal(same.verdict, "about_same");
  const zero = calculate({ ...base, opsHoursMonthly: 0, hourlyRate: 0, migrationHours: 0 });
  assert.ok(zero.cautions.some((c) => /運用の時間が0/.test(c)));
  assert.ok(zero.cautions.some((c) => /時間あたりの費用が0/.test(c)));
  assert.ok(zero.cautions.some((c) => /移行・構築の費用が0/.test(c)));
});

test("回収が比較の期間を超えるときは注意を出す", () => {
  const r = calculate({ ...base, years: 1, migrationHours: 100 });
  assert.ok(r.breakEvenMonths !== null && r.breakEvenMonths > 12);
  assert.ok(r.cautions.some((c) => /比較の期間/.test(c)));
});

test("入力の検証：空・負・範囲外・小数の人数・期間", () => {
  const bad = validateInput({ ...base, users: 2.5, serverMonthly: -1, saasPerUserMonthly: "", years: 2 as never });
  assert.equal(bad.ok, false);
  if (!bad.ok) {
    assert.ok(bad.errors.users && bad.errors.serverMonthly && bad.errors.saasPerUserMonthly && bad.errors.years);
  }
  const good = validateInput({ ...Object.fromEntries(Object.entries(base).map(([k, v]) => [k, String(v)])) });
  assert.equal(good.ok, true);
});

test("URLへの保存と読み込み：入力値とslugだけ。不正な値は無視する", () => {
  const qs = toSearchParams(base, { saas: "slack", oss: "mattermost" });
  const back = fromSearchParams(qs);
  assert.equal(back.saas, "slack");
  assert.equal(back.oss, "mattermost");
  assert.equal(back.input.users, "20");
  const evil = fromSearchParams("saas=<script>&u=1e9&pu=abc&oss=Mattermost");
  assert.equal(evil.saas, undefined);
  assert.equal(evil.oss, undefined);
  assert.equal(evil.input.users, undefined);
  assert.equal(evil.input.saasPerUserMonthly, undefined);
});
