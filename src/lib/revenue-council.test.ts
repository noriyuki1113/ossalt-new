import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  aggregateRc,
  validateMonthlyReview,
  validateRcRecord,
  type MonthlyReview,
  type RcEvaluation,
  type RcRecord,
} from "./revenue-council.ts";

const ev = (agent: RcEvaluation["agent"], action: RcEvaluation["action"], conf = 70): RcEvaluation => ({
  agent,
  action,
  pros: "p",
  cons: "c",
  scores: {
    revenue_potential: 50,
    user_value: 50,
    seo_impact: 50,
    brand_trust: 50,
    implementation_cost: 50,
    maintenance_cost: 50,
    time_to_revenue: 50,
    evidence_confidence: conf,
  },
});

test("多数決は同数なら慎重な側（HOLD）、批判役の強い保留は人の判断が必要", () => {
  assert.equal(aggregateRc([ev("chief_editor", "BUILD"), ev("seo_strategist", "HOLD")]).plurality, "HOLD");
  const a = aggregateRc([
    ev("chief_editor", "BUILD"),
    ev("seo_strategist", "BUILD"),
    ev("revenue_officer", "BUILD"),
    ev("ux_designer", "BUILD"),
    ev("automation_architect", "IMPROVE"),
    ev("critical_investor", "HOLD", 75),
  ]);
  assert.equal(a.plurality, "BUILD");
  assert.equal(a.dissent.length, 1);
});

test("月次レビューの収益の指標は、数値を持てない（公開リポジトリのため）", () => {
  const base = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "docs", "revenue", "monthly", "TEMPLATE.json"), "utf8"),
  ) as MonthlyReview;
  assert.deepEqual(validateMonthlyReview(base), []);
  const leaked: MonthlyReview = {
    ...base,
    metrics: [{ key: "asp_approved_revenue", status: "measured", value: 1, source: "A8" }],
  };
  assert.ok(validateMonthlyReview(leaked).some((e) => /公開リポジトリ/.test(e)));
  const fake: MonthlyReview = { ...base, metrics: [{ key: "affiliate_click", status: "not_measured", value: 5, source: "x" }] };
  assert.ok(validateMonthlyReview(fake).some((e) => /計測していない/.test(e)));
});

test("docs/revenue/ の会議の記録と月次レビューは、すべて形式どおり（6役割の評価がそろう）", () => {
  const cdir = path.join(process.cwd(), "docs", "revenue", "council");
  const files = fs.readdirSync(cdir).filter((f) => f.endsWith(".json"));
  assert.ok(files.length > 0);
  for (const f of files) {
    const rec = JSON.parse(fs.readFileSync(path.join(cdir, f), "utf8")) as RcRecord;
    assert.deepEqual(validateRcRecord(rec), [], f);
    for (const p of rec.proposals) assert.equal(p.evaluations.length, 6, `${f} ${p.id}`);
  }
  const mdir = path.join(process.cwd(), "docs", "revenue", "monthly");
  for (const f of fs.readdirSync(mdir).filter((x) => x.endsWith(".json"))) {
    const r = JSON.parse(fs.readFileSync(path.join(mdir, f), "utf8")) as MonthlyReview;
    assert.deepEqual(validateMonthlyReview(r), [], f);
  }
});
