import { test } from "node:test";
import assert from "node:assert/strict";
import { buildToolBrief, type Standing } from "./tool-brief.ts";
import { TOOL_DIAGNOSIS } from "./diagnosis-data.ts";
import type { Tool } from "./tools.ts";
import tools from "../../public/data/tools.json" with { type: "json" };

const none: Standing = { popular: null, growth: null, growthReason: "7日以上前の実測の記録がまだ無い" };
function tool(o: Partial<Tool> = {}): Tool {
  return { id: "x", name: "X", url: "https://x.example", github_url: "https://github.com/o/x", license: "MIT",
    last_commit: "2026-10-20T00:00:00Z", freshness_days: 5, releases_12mo: 12, docker_available: true,
    ja_ui: null, ja_docs: null, scorecard_score: 8, advisories_count: 0, github_archived: false, ...o } as unknown as Tool;
}
const texts = (xs: Array<{ text: string }>) => xs.map((x) => x.text).join("｜");

test("根拠のある強みだけが出る。すべての文に根拠が付く", () => {
  const b = buildToolBrief(tool({ ja_ui: true }), undefined, { popular: { rank: 3, total: 382 }, growth: { rank: 10, total: 361 }, growthReason: null });
  const s = texts(b.strengths);
  assert.match(s, /直近30日以内に更新/);
  assert.match(s, /リリースしている/);
  assert.match(s, /商用でも条件が少ない/);
  assert.match(s, /Scorecardが8/);
  assert.match(s, /Docker/);
  assert.match(s, /日本語の画面/);
  assert.match(s, /人気ランキングで上位1%/);
  assert.match(s, /急成長ランキングで上位3%/);
  for (const it of [...b.strengths, ...b.cautions]) assert.ok(it.basis.length > 0, it.text);
});

test("未確認は、強みにも「非対応」にもしない", () => {
  const b = buildToolBrief(tool({ scorecard_score: null, docker_available: null, ja_ui: null, ja_docs: null, license: null }), undefined, none);
  const c = texts(b.cautions);
  assert.match(c, /ライセンスが未確認/);
  assert.match(c, /未評価/);
  assert.match(c, /日本語の画面・ドキュメントは未確認/);
  assert.ok(!c.includes("非対応"));
  assert.ok(!texts(b.strengths).includes("Docker"));
  assert.doesNotMatch(texts(b.strengths), /Scorecard|日本語/);
  assert.match(b.standing.growth, /未観測（7日以上前の実測の記録がまだ無い）/);
  assert.equal(b.standing.popular, "人気：未観測");
});

test("ライセンス：ソース公開型・混在・コピーレフトの注意", () => {
  assert.match(texts(buildToolBrief(tool({ license: "Sustainable Use License" }), undefined, none).cautions), /ソース公開型/);
  assert.match(texts(buildToolBrief(tool({ license: "AGPL-3.0 / Metabase Commercial" }), undefined, none).cautions), /複数・混在/);
  const agpl = buildToolBrief(tool({ license: "AGPL-3.0" }), undefined, none);
  assert.match(texts(agpl.cautions), /ネットワーク越し.*ソースの公開/);
  assert.match(texts(agpl.strengths), /OSI承認のオープンソース/);
});

test("保守：更新が古い・アーカイブ・公式の保守警告", () => {
  assert.match(texts(buildToolBrief(tool({ freshness_days: 200 }), undefined, none).cautions), /更新は少なめ/);
  assert.match(texts(buildToolBrief(tool({ freshness_days: 400 }), undefined, none).cautions), /止まっている可能性/);
  const arch = buildToolBrief(tool({ github_archived: true, freshness_days: 3 }), undefined, none);
  assert.match(texts(arch.cautions), /アーカイブ済み/);
  assert.doesNotMatch(texts(arch.strengths), /更新がある|リリースしている/);
  const warn = buildToolBrief(tool({ maintenance_notice: { text: "保守されていない", source_url: "https://x", checked_at: "2026-10-24" } } as Partial<Tool>), undefined, none);
  assert.match(texts(warn.cautions), /公式の保守に関する警告がある：保守されていない/);
});

test("導入難易度は診断データのあるツールだけ。それ以外は未評価と明示", () => {
  const withDiag = buildToolBrief(tool(), TOOL_DIAGNOSIS["n8n"], none);
  assert.match(withDiag.setup.label, /導入・運用の難易度：(簡単|普通|やや高い)/);
  assert.match(withDiag.setup.basis, /診断データ/);
  // 診断の質問文（「〜がいい」）ではなく、説明として読める言い方にする。全規模は、人数の羅列にしない
  const text = withDiag.strengths.map((x) => x.text).join("｜");
  assert.doesNotMatch(text, /がいい|したい/);
  assert.match(text, /規模を問わず使える/);
  assert.doesNotMatch(text, /自分だけ・2〜10人/);
  const without = buildToolBrief(tool(), undefined, none);
  assert.equal(without.setup.level, null);
  assert.match(without.setup.label, /難易度は未評価/);
  const hard = buildToolBrief(tool(), TOOL_DIAGNOSIS["synapse"], none);
  assert.match(texts(hard.cautions), /専門的な知識/);
});

test("公式の情報へのリンクは、実在するURLだけ（公式サイト・GitHub）", () => {
  const b = buildToolBrief(tool(), undefined, none);
  assert.deepEqual(b.links.map((l) => l.href), ["https://x.example", "https://github.com/o/x#readme", "https://github.com/o/x/releases"]);
});

test("公式サイトのURLが空のツールには、公式サイトのリンクを出さない", () => {
  const b = buildToolBrief(tool({ url: "" }), undefined, none);
  assert.deepEqual(b.links.map((l) => l.label), ["GitHubのREADME", "リリース一覧"]);
});

test("実データ：全ツールで要約が作れ、根拠のない項目が混ざらない", () => {
  for (const t of (tools as unknown as Tool[]).filter((x) => !x.github_archived)) {
    const b = buildToolBrief(t, TOOL_DIAGNOSIS[t.id], none);
    for (const it of [...b.strengths, ...b.cautions]) assert.ok(it.basis && it.text, `${t.id}: ${it.text}`);
    assert.ok(b.cautions.length + b.strengths.length > 0, t.id);
    assert.ok(b.links.every((l) => /^https?:\/\//.test(l.href)), t.id);
    assert.ok(b.links.some((l) => l.label === "GitHubのREADME"), t.id);
  }
});
