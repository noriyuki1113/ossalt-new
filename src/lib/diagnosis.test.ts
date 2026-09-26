/**
 * 診断ロジック（純粋関数）のテスト。
 * 実行: node --experimental-strip-types --test src/lib/diagnosis.test.ts
 * （npm test でまとめて実行できる）
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  computeCompleteness,
  decodeAnswersFromSearchParams,
  encodeAnswersToSearchParams,
  evaluateDiagnosis,
  getDifficulty,
  passesHardFilters,
  scoreCandidate,
  type DiagnosisAnswers,
  type DiagnosisToolInput,
} from "./diagnosis.ts";
import { TOOL_DIAGNOSIS } from "./diagnosis-data.ts";
import type { ToolDiagnosisMeta } from "./diagnosis-types.ts";
import tools from "../../public/data/tools.json" with { type: "json" };

function baseAnswers(overrides: Partial<DiagnosisAnswers> = {}): DiagnosisAnswers {
  return {
    saas: "notion",
    teamSize: "small",
    technicalLevel: 1,
    hosting: "either",
    strengths: [],
    requiredFeatures: [],
    ...overrides,
  };
}

function makeMeta(overrides: Partial<ToolDiagnosisMeta> = {}): ToolDiagnosisMeta {
  return {
    toolId: "sample",
    saas: "notion",
    selfHost: true,
    managedCloud: true,
    technicalLevel: 1,
    maintenanceLevel: 1,
    teamSize: ["solo", "small"],
    strengths: [],
    features: { docs: true },
    ...overrides,
  };
}

test("data-source: 診断対象toolIdはすべて実在のツールid", () => {
  const ids = new Set((tools as Array<{ id: string }>).map((t) => t.id));
  for (const toolId of Object.keys(TOOL_DIAGNOSIS)) {
    assert.ok(ids.has(toolId), `${toolId} が data-source/tools.json 由来のデータに存在しない`);
  }
});

test("selfhost必須で selfHost:false のツールは除外される", () => {
  const meta = makeMeta({ selfHost: false });
  const answers = baseAnswers({ hosting: "selfhost" });
  assert.equal(passesHardFilters(meta, answers), false);
});

test("selfhost必須でも selfHost:true なら除外されない", () => {
  const meta = makeMeta({ selfHost: true });
  const answers = baseAnswers({ hosting: "selfhost" });
  assert.equal(passesHardFilters(meta, answers), true);
});

test("必須機能がfalseの候補は除外される", () => {
  const meta = makeMeta({ features: { docs: false } });
  const answers = baseAnswers({ requiredFeatures: ["docs"] });
  assert.equal(passesHardFilters(meta, answers), false);
});

test("必須機能がunknownの候補は即除外されない", () => {
  const meta = makeMeta({ features: { docs: "unknown" } });
  const answers = baseAnswers({ requiredFeatures: ["docs"] });
  assert.equal(passesHardFilters(meta, answers), true);
});

test("technicalLevelがスコアへ反映される（要求水準が低いほど高得点）", () => {
  const answers = baseAnswers({ technicalLevel: 0 });
  const easy = scoreCandidate(makeMeta({ technicalLevel: 0 }), null, answers, null);
  const hard = scoreCandidate(makeMeta({ technicalLevel: 3 }), null, answers, null);
  assert.ok(easy.breakdown.technicalLevel > hard.breakdown.technicalLevel);
});

test("strengthsがスコアへ反映される", () => {
  const answers = baseAnswers({ strengths: ["privacy", "cost"] });
  const matchAll = scoreCandidate(makeMeta({ strengths: ["privacy", "cost"] }), null, answers, null);
  const matchNone = scoreCandidate(makeMeta({ strengths: ["features"] }), null, answers, null);
  assert.equal(matchAll.breakdown.strengths, 20);
  assert.equal(matchNone.breakdown.strengths, 0);
});

test("teamSizeがスコアへ反映される", () => {
  const answers = baseAnswers({ teamSize: "large" });
  const fit = scoreCandidate(makeMeta({ teamSize: ["large"] }), null, answers, null);
  const noFit = scoreCandidate(makeMeta({ teamSize: ["solo"] }), null, answers, null);
  assert.equal(fit.breakdown.teamSize, 10);
  assert.equal(noFit.breakdown.teamSize, 0);
});

test("データ充足率が正しく計算される", () => {
  const meta = makeMeta({
    managedCloud: "unknown",
    features: { docs: true, wiki: "unknown" },
  });
  const answers = baseAnswers({ hosting: "cloud", requiredFeatures: ["docs", "wiki"] });
  // チェック対象: managedCloud(未確認) + docs(確認済み) + wiki(未確認) = 3件中1件確認済み
  assert.equal(computeCompleteness(meta, answers), Math.round((1 / 3) * 100));
});

test("データ充足率: 確認対象が無ければ100%", () => {
  const meta = makeMeta();
  const answers = baseAnswers({ hosting: "selfhost", requiredFeatures: [] });
  assert.equal(computeCompleteness(meta, answers), 100);
});

test("結果は最大3件になる", () => {
  const inputs: DiagnosisToolInput[] = Array.from({ length: 5 }, (_, i) => ({
    meta: makeMeta({ toolId: `t${i}` }),
    name: `Tool ${i}`,
    healthScore: 100 * i,
  }));
  const result = evaluateDiagnosis(baseAnswers(), inputs);
  assert.equal(1 + result.others.length <= 3, true);
  assert.ok(result.others.length <= 2);
});

test("同点時の順序はtoolId昇順で安定する", () => {
  const inputs: DiagnosisToolInput[] = [
    { meta: makeMeta({ toolId: "zzz" }), name: "Z", healthScore: null },
    { meta: makeMeta({ toolId: "aaa" }), name: "A", healthScore: null },
  ];
  const result = evaluateDiagnosis(baseAnswers(), inputs);
  assert.equal(result.primary?.toolId, "aaa");
  assert.equal(result.others[0]?.toolId, "zzz");

  // 2回実行しても同じ順序（安定性）
  const result2 = evaluateDiagnosis(baseAnswers(), inputs);
  assert.deepEqual(
    [result.primary?.toolId, ...result.others.map((o) => o.toolId)],
    [result2.primary?.toolId, ...result2.others.map((o) => o.toolId)]
  );
});

test("候補0件時、必須機能の条件を緩めてフォールバックする", () => {
  const inputs: DiagnosisToolInput[] = [
    { meta: makeMeta({ toolId: "only-one", features: { docs: false } }), name: "Only", healthScore: null },
  ];
  const answers = baseAnswers({ requiredFeatures: ["docs"] });
  const result = evaluateDiagnosis(answers, inputs);
  assert.ok(result.primary != null);
  assert.equal(result.primary?.toolId, "only-one");
  assert.ok(result.relaxedNote && result.relaxedNote.length > 0);
});

test("候補0件時、それでも無ければ空の結果を返す（無理に埋めない）", () => {
  const result = evaluateDiagnosis(baseAnswers({ saas: "slack" }), []);
  assert.equal(result.primary, null);
  assert.equal(result.others.length, 0);
});

test("候補が1件だけのとき、無理に3件にしない", () => {
  const inputs: DiagnosisToolInput[] = [{ meta: makeMeta({ toolId: "solo-tool" }), name: "Solo", healthScore: null }];
  const result = evaluateDiagnosis(baseAnswers(), inputs);
  assert.ok(result.primary != null);
  assert.equal(result.others.length, 0);
});

test("導入難易度: 技術要件と運用の手間の合計で決まる", () => {
  assert.equal(getDifficulty(makeMeta({ technicalLevel: 0, maintenanceLevel: 0 })), "easy");
  assert.equal(getDifficulty(makeMeta({ technicalLevel: 1, maintenanceLevel: 1 })), "normal");
  assert.equal(getDifficulty(makeMeta({ technicalLevel: 3, maintenanceLevel: 3 })), "hard");
});

test("URLパラメータの往復（エンコード→デコードで復元できる）", () => {
  const answers = baseAnswers({
    saas: "slack",
    teamSize: "large",
    technicalLevel: 2,
    hosting: "selfhost",
    strengths: ["security", "privacy"],
    requiredFeatures: ["chat", "sso"],
  });
  const params = encodeAnswersToSearchParams(answers);
  const decoded = decodeAnswersFromSearchParams(params);
  assert.deepEqual(decoded, answers);
});

test("URLパラメータの往復（必須機能なし＝none）", () => {
  const answers = baseAnswers({ requiredFeatures: [] });
  const params = encodeAnswersToSearchParams(answers);
  assert.equal(params.get("features"), "__none__");
  const decoded = decodeAnswersFromSearchParams(params);
  assert.deepEqual(decoded?.requiredFeatures, []);
});

test("不正なURLパラメータはnullを返す（診断トップへ戻す判断に使う）", () => {
  const invalidCases = [
    new URLSearchParams("saas=unknown-saas&team=small&hosting=either&skill=1"),
    new URLSearchParams("saas=notion&team=huge&hosting=either&skill=1"),
    new URLSearchParams("saas=notion&team=small&hosting=either&skill=9"),
    new URLSearchParams("saas=notion&team=small&hosting=nowhere&skill=1"),
    new URLSearchParams(""),
  ];
  for (const params of invalidCases) {
    assert.equal(decodeAnswersFromSearchParams(params), null);
  }
});

test("不正な strengths（選択上限超え）はnullを返す", () => {
  const params = new URLSearchParams(
    "saas=notion&team=small&hosting=either&skill=1&strengths=privacy,cost,usability"
  );
  assert.equal(decodeAnswersFromSearchParams(params), null);
});
