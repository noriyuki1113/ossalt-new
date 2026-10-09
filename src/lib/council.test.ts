import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { aggregate, containsSensitiveNumbers, validateRecord, type CouncilRecord, type Evaluation } from "./council.ts";

const ev = (agent: Evaluation["agent"], action: Evaluation["action"], score = 60, confidence = 70): Evaluation => ({
  agent,
  action,
  rationale: "r",
  objection: "o",
  scores: {
    user_value: score,
    revenue_potential: score,
    seo_opportunity: score,
    differentiation: score,
    implementation_cost: score,
    maintenance_cost: score,
    confidence,
  },
});

test("総合点は確からしさで重みづけ、行動は多数決（同数は慎重な側）", () => {
  const a = aggregate([ev("chief_editor", "BUILD", 90, 100), ev("seo_strategist", "RESEARCH", 10, 1)]);
  assert.ok(a.score > 85); // 確からしさの低い評価の影響は小さい
  assert.equal(a.plurality, "RESEARCH"); // 1対1の同数は RESEARCH を優先
});

test("批判役の強い反対と、評価の不足は、人の判断が必要", () => {
  const evals = [
    ev("chief_editor", "BUILD"),
    ev("seo_strategist", "BUILD"),
    ev("revenue_officer", "BUILD"),
    ev("ux_designer", "BUILD"),
    ev("automation_architect", "BUILD"),
    ev("critical_investor", "REJECT", 20, 80),
  ];
  const a = aggregate(evals);
  assert.equal(a.plurality, "BUILD");
  assert.equal(a.dissent.length, 1);
  assert.equal(aggregate(evals.slice(0, 3)).dissent.some((d) => /3\/6/.test(d)), true);
});

test("公開してはいけない内容（収益の金額・メールアドレス）を見つける", () => {
  assert.deepEqual(containsSensitiveNumbers("先月の収益は12,000円だった"), ["収益の金額"]);
  assert.deepEqual(containsSensitiveNumbers("連絡は a@example.com へ"), ["メールアドレス"]);
  assert.deepEqual(containsSensitiveNumbers("VPSは月1,000円から"), []);
});

test("docs/council/ の記録はすべて形式どおりで、公開してはいけない内容を含まない", () => {
  const dir = path.join(process.cwd(), "docs", "council");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  assert.ok(files.length > 0);
  for (const f of files) {
    const rec = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as CouncilRecord;
    assert.deepEqual(validateRecord(rec), [], f);
    for (const c of rec.candidates) assert.equal(c.evaluations.length, 6, `${f} ${c.id}: 6役割の評価がそろっている`);
  }
});
