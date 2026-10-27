import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { recommend } from "./recommend/pipeline.ts";
import { generateCandidates } from "./recommend/candidate-generator.ts";
import { similarity, diversify } from "./recommend/diversity-ranker.ts";
import { decodeQuery, encodeQuery, queryFromDiagnosis, DEFAULT_QUERY } from "./recommend/query.ts";
import { resolveWeights, PROFILE_WEIGHTS, NEUTRAL } from "./recommend/ranking-config.ts";
import { toRecTools } from "./recommend/catalog.ts";
import { buildPopularity, buildGrowth } from "./rankings.ts";
import { TOOL_DIAGNOSIS } from "./diagnosis-data.ts";
import type { RecQuery, RecTool, ScoredCandidate } from "./recommend/types.ts";

const base: RecTool = {
  id: "x", name: "X", desc: null, category: "docs", competitors: ["notion"], owner: null, topics: [],
  stars: 1000, license: "MIT", licenseClass: "permissive", licenseGroup: "osi", docker: true, jaUi: null, jaDocs: null,
  freshnessDays: 5, releases12mo: 8, scorecard: 6, securityMd: true, dependabot: true, maintenanceNotice: false,
  popularity: 60, growth: 50, gain30: 10,
};
const tool = (id: string, extra: Partial<RecTool> = {}): RecTool => ({ ...base, id, name: id.toUpperCase(), owner: id, ...extra });
const q = (extra: Partial<RecQuery> = {}): RecQuery => ({ ...DEFAULT_QUERY, purpose: { kind: "saas", slug: "notion" }, ...extra });
const cat = (tools: RecTool[]) => ({ tools, saas: { notion: "Notion" } });

test("1. 用途に合う（直接の代替）OSSが、同じカテゴリの類似OSSより上に来る", () => {
  const tools = [tool("direct"), tool("similar", { competitors: ["confluence"] })];
  const r = recommend(q(), cat(tools));
  assert.deepEqual(r.items.map((i) => i.tool.id), ["direct", "similar"]);
  assert.ok(r.items[0].signals.find((s) => s.key === "fit")!.value! > r.items[1].signals.find((s) => s.key === "fit")!.value!);
});

test("2. 条件に明らかに合わない候補は、理由つきで除外される（未確認は除外しない）", () => {
  const tools = [tool("nodocker", { docker: false }), tool("unknown", { docker: null }), tool("ok"), tool("stopped", { maintenanceNotice: true })];
  const r = recommend(q({ needDocker: true }), cat(tools));
  assert.deepEqual(r.items.map((i) => i.tool.id).sort(), ["ok", "unknown"]);
  assert.deepEqual(r.excluded.map((e) => e.rule).sort(), ["docker", "maintenance"]);
  assert.ok(r.items.find((i) => i.tool.id === "unknown")!.cautions.includes("Dockerで動かせるかは未確認"));
});

test("3. ライセンスの条件が守られる", () => {
  const tools = [
    tool("mit"), tool("agpl", { license: "AGPL-3.0", licenseClass: "network-copyleft" }),
    tool("gpl", { license: "GPL-3.0", licenseClass: "copyleft" }),
    tool("busl", { license: "BUSL-1.1", licenseClass: "source-available", licenseGroup: "source-available" }),
    tool("nolic", { license: null, licenseClass: "unknown", licenseGroup: "unknown" }),
  ];
  const ids = (license: RecQuery["license"]) => recommend(q({ license }), cat(tools)).items.map((i) => i.tool.id).sort();
  assert.deepEqual(ids("permissive"), ["mit", "nolic"]);
  assert.deepEqual(ids("no-network-copyleft"), ["gpl", "mit", "nolic"]);
  assert.deepEqual(ids("osi"), ["agpl", "gpl", "mit", "nolic"]);
  assert.equal(ids("any").length, 5);
  // 未確認のライセンスは除外せず、注意を出す
  const r = recommend(q({ license: "permissive" }), cat(tools));
  assert.ok(r.items.find((i) => i.tool.id === "nolic")!.cautions.some((c) => c.includes("ライセンスが未確認")));
});

test("4. 欠損データでも動き、未確認は中立値で計算して確認率に出る", () => {
  const empty = tool("empty", {
    docker: null, freshnessDays: null, releases12mo: null, scorecard: null, securityMd: null, dependabot: null,
    popularity: null, growth: null, gain30: null, stars: null, license: null, licenseClass: "unknown", licenseGroup: "unknown",
  });
  const r = recommend(q(), cat([empty]));
  const it = r.items[0];
  for (const k of ["maintenance", "security", "ease"]) {
    const s = it.signals.find((x) => x.key === k)!;
    assert.equal(s.known, false);
    assert.equal(s.used, NEUTRAL);
  }
  assert.ok(it.evidence < 100);
  assert.ok(it.cautions.some((c) => c.includes("セキュリティ評価に十分なデータが無い")));
  assert.ok(!it.reasons.some((c) => c.includes("Docker")));
});

test("5. 複数の取り方で見つかっても同じOSSは1件にまとまる", () => {
  const tools = [tool("a", { diag: { saas: "notion", selfHost: true, technicalLevel: 1, maintenanceLevel: 1, strengths: [], features: {} } })];
  const cands = generateCandidates(q(), tools);
  assert.equal(cands.length, 1);
  assert.deepEqual(cands[0].sources.sort(), ["diagnosis", "popular", "saas", "trending"].sort());
});

test("6. 多様性：同じ組織の似た候補が続くと、別の候補が間に入る。不適合な候補は上げない", () => {
  const tools = [
    tool("org-a1", { owner: "acme", topics: ["wiki"] }),
    tool("org-a2", { owner: "acme", topics: ["wiki"], scorecard: 5.8 }),
    tool("other", { owner: "else", topics: ["notes"], category: "notes", scorecard: 5.5 }),
    tool("weak", { owner: "w", competitors: ["confluence"], freshnessDays: 900, releases12mo: 0, scorecard: 1, securityMd: false, dependabot: false, docker: false }),
  ];
  const r = recommend(q(), cat(tools));
  const order = r.items.map((i) => i.tool.id);
  assert.deepEqual(order.slice(0, 3), ["org-a1", "other", "org-a2"]);
  assert.equal(order[3], "weak");
  assert.ok(r.items[2].diversityNote);
  assert.ok(similarity(tools[0], tools[1]) > similarity(tools[0], tools[2]));
});

test("6b. 上位に小規模な候補が無ければ、近い点の小規模な候補に1枠を確保する（点は変えない）", () => {
  const big = Array.from({ length: 6 }, (_, i) => tool(`big${i}`, { popularity: 90, category: `c${i}` }));
  const small = tool("small", { popularity: 20, category: "cs", scorecard: 5.5 });
  const r = recommend(q(), cat([...big, small]));
  const pos = r.items.findIndex((i) => i.tool.id === "small");
  assert.equal(pos, 5);
  assert.ok(r.items[pos].diversityNote?.includes("小規模"));
});

test("7. 推薦理由は評価と一致する（保守の理由は保守の点が高いときだけ、注意は低いときだけ）", () => {
  const tools = [tool("fresh"), tool("stale", { freshnessDays: 800, releases12mo: 0 })];
  const r = recommend(q(), cat(tools));
  for (const it of r.items) {
    const m = it.signals.find((s) => s.key === "maintenance")!;
    const hasGood = it.reasons.some((x) => x.startsWith("最近の開発を確認できる"));
    const hasWeak = it.cautions.some((x) => x.startsWith("更新が少ない"));
    assert.equal(hasGood, m.value! >= 70);
    assert.equal(hasWeak, m.value! <= 30);
    // 合計点は signals の加重和と一致する
    const sum = it.signals.reduce((s, x) => s + x.used * x.weight, 0);
    assert.ok(Math.abs(sum - it.score) < 0.06);
  }
});

test("8. 同じ入力からは同じ結果（順序も）が返る", () => {
  const tools = Array.from({ length: 20 }, (_, i) => tool(`t${i}`, { owner: `o${i % 3}`, scorecard: (i % 5) + 3 }));
  const a = JSON.stringify(recommend(q(), cat(tools)));
  const b = JSON.stringify(recommend(q(), cat([...tools].reverse())));
  assert.equal(a, b);
});

test("9. データの取得に失敗して空のときも安全に動く", () => {
  const r = recommend(q(), cat([]));
  assert.equal(r.items.length, 0);
  assert.equal(r.excluded.length, 0);
  assert.deepEqual(diversify([] as ScoredCandidate[]), []);
});

test("重み：利用者のタイプの初期値は合計100%、重視すると増え、合計は1のまま", () => {
  for (const w of Object.values(PROFILE_WEIGHTS)) assert.ok(Math.abs(Object.values(w).reduce((s, v) => s + v, 0) - 1) < 1e-9);
  const w = resolveWeights("personal", ["ease"]);
  assert.ok(w.ease > PROFILE_WEIGHTS.personal.ease);
  assert.ok(Math.abs(Object.values(w).reduce((s, v) => s + v, 0) - 1) < 0.005);
});

test("条件の変更で結果が変わる（初心者は導入のしやすさを重く見る）", () => {
  const tools = [
    tool("easy", { docker: true, scorecard: 3, securityMd: false, dependabot: false }),
    tool("hard", { docker: false, scorecard: 9, securityMd: true, dependabot: true }),
  ];
  assert.equal(recommend(q({ profile: "team" }), cat(tools)).items[0].tool.id, "hard");
  assert.equal(recommend(q({ profile: "beginner", emphasis: ["ease"] }), cat(tools)).items[0].tool.id, "easy");
});

test("URLのクエリ：往復で同じ条件に戻り、不正な値は既定値になる", () => {
  const valid = { saas: new Set(["notion"]), categories: new Set(["docs"]) };
  const query = q({ profile: "team", skill: 2, license: "osi", needDocker: true, emphasis: ["security"], features: ["wiki"] });
  assert.deepEqual(decodeQuery(encodeQuery(query), valid), query);
  const bad = decodeQuery(new URLSearchParams("saas=notion&profile=evil&skill=9&license=<x>&focus=a,ease&features=<script>"), valid)!;
  assert.equal(bad.profile, "personal");
  assert.equal(bad.skill, 1);
  assert.equal(bad.license, "any");
  assert.deepEqual(bad.emphasis, ["ease"]);
  assert.deepEqual(bad.features, []);
  assert.equal(decodeQuery(new URLSearchParams("saas=unknown"), valid), null);
});

test("OSS診断の回答から条件を作る（選んだことだけを引き継ぐ）", () => {
  const query = queryFromDiagnosis({
    saas: "notion", teamSize: "solo", technicalLevel: 1, hosting: "selfhost",
    strengths: ["active", "privacy"], requiredFeatures: ["wiki"], conditions: ["commercial"],
  });
  assert.equal(query.profile, "personal");
  assert.equal(query.selfHost, true);
  assert.equal(query.commercial, true);
  assert.equal(query.needJa, false);
  assert.deepEqual(query.emphasis, ["maintenance"]);
  assert.deepEqual(query.features, ["wiki"]);
  assert.equal(queryFromDiagnosis({ saas: "slack", teamSize: "small", technicalLevel: 0, hosting: "either", strengths: [], requiredFeatures: [] }).profile, "beginner");
});

test("10. 実データ：既存の人気・急成長ランキングは変わらず、推薦は重複なしで同じ結果を返す", () => {
  const tools = JSON.parse(fs.readFileSync(new URL("../../public/data/tools.json", import.meta.url), "utf8"));
  const before = JSON.stringify([buildPopularity(tools).rows.map((r) => [r.tool.id, r.score]), buildGrowth(tools).rows.map((r) => [r.tool.id, r.score])]);
  const rec = toRecTools(tools, TOOL_DIAGNOSIS);
  const after = JSON.stringify([buildPopularity(tools).rows.map((r) => [r.tool.id, r.score]), buildGrowth(tools).rows.map((r) => [r.tool.id, r.score])]);
  assert.equal(before, after);
  assert.equal(rec.length, tools.filter((t: { github_archived: boolean }) => !t.github_archived).length);
  for (const slug of ["notion", "slack", "google-analytics"]) {
    const r1 = recommend(q({ purpose: { kind: "saas", slug } }), { tools: rec, saas: { [slug]: slug } });
    const r2 = recommend(q({ purpose: { kind: "saas", slug } }), { tools: rec, saas: { [slug]: slug } });
    assert.ok(r1.items.length > 0, slug);
    assert.equal(new Set(r1.items.map((i) => i.tool.id)).size, r1.items.length);
    assert.equal(JSON.stringify(r1), JSON.stringify(r2));
    for (const it of r1.items) assert.ok(it.reasons.length + it.cautions.length > 0);
  }
});

test("6c. 多様性の調整で、用途の適合度が低い候補を高い候補より上げない", () => {
  // 直接の代替3件が同じ組織、類似のOSSが1件（点は直接の代替の3件目より少し低い）
  const tools = [
    tool("d1", { owner: "acme", topics: ["wiki"] }),
    tool("d2", { owner: "acme", topics: ["wiki"] }),
    tool("d3", { owner: "acme", topics: ["wiki"], scorecard: 5 }),
    tool("sim", { owner: "z", competitors: ["confluence"], category: "notes", scorecard: 10 }),
  ];
  const r = recommend(q(), cat(tools));
  const fit = (id: string) => r.items.find((i) => i.tool.id === id)!.signals.find((s) => s.key === "fit")!.used;
  const order = r.items.map((i) => i.tool.id);
  for (let i = 0; i < order.length; i++)
    for (let j = i + 1; j < order.length; j++) {
      const a = r.items[i], b = r.items[j];
      // 下にある候補のほうが fit も点も高い、という逆転は起こさない
      assert.ok(!(fit(b.tool.id) > fit(a.tool.id) && b.score > a.score), `${order[i]} > ${order[j]}`);
    }
});
