import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  STAGE_LABELS,
  ISSUE_KINDS,
  validateIssue,
  validatePick,
  validateVerification,
  publishBlockers,
  stageSummary,
  type IssueFile,
  type Pick,
} from "./editors-picks.ts";

const ROOT = process.cwd();
const vol1 = JSON.parse(fs.readFileSync(path.join(ROOT, "data-source", "editors-picks", "vol1.json"), "utf8")) as IssueFile;
const toolsRaw = JSON.parse(fs.readFileSync(path.join(ROOT, "data-source", "tools.json"), "utf8"));
const toolIds = new Set<string>((Array.isArray(toolsRaw) ? toolsRaw : toolsRaw.tools).map((t: { id: string }) => t.id));

function pick(over: Partial<Pick> = {}): Pick {
  return {
    id: "demo",
    name: "Demo",
    maintainer: "Demo Inc.",
    github_url: "https://github.com/demo/demo",
    license: "MIT",
    oss_status: "oss",
    included: true,
    category: "検索",
    summary: "概要",
    what_is_great: "独創的な点",
    use_cases: ["用途"],
    caveats: ["気になる点"],
    difficulty: "低",
    ossalt: { listed: false },
    facts: [{ label: "最新リリース", value: "v1", as_of: "2026-11-11" }],
    verification: { stage: "official", checked_at: "2026-11-11", sources: ["https://github.com/demo/demo"], note: "READMEとLICENSEを読んだ。動かしていない" },
    ...over,
  };
}

test("調査段階は3種類。名前は仕様どおり", () => {
  assert.deepEqual(STAGE_LABELS, { official: "公式情報確認済み", code: "コード・実装確認済み", "hands-on": "実機検証済み" });
  assert.ok(ISSUE_KINDS.includes("roundup") && ISSUE_KINDS.includes("weekly-pick") && ISSUE_KINDS.includes("hands-on-report"));
});

test("検証：日付・出典・note が無ければ不合格。code と hands-on は具体的な note が必要", () => {
  assert.deepEqual(validateVerification(pick().verification), []);
  assert.ok(validateVerification({ stage: "official", checked_at: "2026-13-40", sources: [], note: "" }).length >= 3);
  assert.ok(validateVerification({ stage: "official", checked_at: "2026-11-11", sources: ["http://example.com"], note: "x" }).some((m) => m.includes("https")));
  assert.ok(validateVerification({ stage: "hands-on", checked_at: "2026-11-11", sources: ["https://example.com"], note: "試した" }).some((m) => m.includes("具体的")));
  assert.deepEqual(
    validateVerification({ stage: "hands-on", checked_at: "2026-11-11", sources: ["https://example.com"], note: "Ubuntu 24.04 で docker compose up を実行し、初期設定まで確認した" }),
    [],
  );
});

test("OSSでないもの・弱みを書かないもの・確認日の無い変動情報は不合格", () => {
  assert.deepEqual(validatePick(pick()), []);
  assert.ok(validatePick(pick({ oss_status: "not-oss" })).some((m) => m.includes("OSSでない")));
  assert.deepEqual(validatePick(pick({ oss_status: "not-oss", included: false, exclusion_reason: "ソース公開型でOSSの定義に合わない" })), []);
  assert.ok(validatePick(pick({ included: false })).some((m) => m.includes("exclusion_reason")));
  assert.ok(validatePick(pick({ caveats: [] })).some((m) => m.includes("caveats")));
  assert.ok(validatePick(pick({ facts: [{ label: "最新リリース", value: "v1", as_of: "" }] })).some((m) => m.includes("確認日")));
  assert.ok(validatePick(pick({ oss_status: "partial" })).some((m) => m.includes("partial")));
});

test("内部リンクは、OSSALTに実在するページだけ。未掲載のものにリンクを付けない", () => {
  const ok = pick({ ossalt: { listed: true, tool_id: "meilisearch", path: "/tools/meilisearch/" } });
  assert.deepEqual(validatePick(ok, toolIds), []);
  assert.ok(validatePick(pick({ ossalt: { listed: true, tool_id: "no-such-tool", path: "/tools/no-such-tool/" } }), toolIds).some((m) => m.includes("OSSALTに無い")));
  assert.ok(validatePick(pick({ ossalt: { listed: false, tool_id: "pagefind", path: "/tools/pagefind/" } }), toolIds).some((m) => m.includes("未掲載")));
  assert.ok(validatePick(pick({ ossalt: { listed: true, tool_id: "meilisearch", path: "/tools/other/" } }), toolIds).some((m) => m.includes("path")));
});

test("第1弾：10件が、すべて検証に合格する（内部リンクの実在も確認）", () => {
  assert.deepEqual(validateIssue(vol1, toolIds), []);
  assert.equal(vol1.picks.length, 10);
  assert.deepEqual(
    vol1.picks.map((p) => p.id),
    ["pagefind", "mujoco", "nerfstudio", "openmct", "nanochat", "ladybird", "agent-desktop", "agent-browser", "orama", "meilisearch"],
  );
});

test("第1弾：実機検証・コード確認は名乗っていない（動かしていないため）", () => {
  const s = stageSummary(vol1.picks);
  assert.equal(s.included, 10);
  assert.equal(s.official, 10);
  assert.equal(s["hands-on"], 0);
  assert.equal(s.code, 0);
});

test("第1弾：一部だけOSSのMeilisearchは partial。OSSでないものは含まれない", () => {
  const m = vol1.picks.find((p) => p.id === "meilisearch")!;
  assert.equal(m.oss_status, "partial");
  assert.ok(m.license.includes("BSL") || m.license.includes("BUSL"));
  assert.ok(vol1.picks.every((p) => !p.included || p.oss_status !== "not-oss"));
});

test("第1弾：OSSALTに掲載済みなのは Meilisearch だけ。ほかは内部リンクなし", () => {
  const listed = vol1.picks.filter((p) => p.ossalt.listed).map((p) => p.id);
  assert.deepEqual(listed, ["meilisearch"]);
});

test("第1弾は、運営者の承認前。承認されるまで公開不可（公開ゲート）", () => {
  assert.equal(vol1.issue.editorial_status, "pending_approval");
  assert.ok(publishBlockers(vol1).some((m) => m.includes("承認")));
  const approved: IssueFile = { ...vol1, issue: { ...vol1.issue, editorial_status: "approved" } };
  assert.deepEqual(publishBlockers(approved), []);
});

test("記事の下書きは content/drafts/ にあり、content/blog/ には無い（ビルドに入らない）", () => {
  assert.ok(fs.existsSync(path.join(ROOT, "content", "drafts", "editors-picks-vol1.md")));
  assert.ok(!fs.existsSync(path.join(ROOT, "content", "blog", "editors-picks-vol1.md")));
  const raw = fs.readFileSync(path.join(ROOT, "content", "drafts", "editors-picks-vol1.md"), "utf8");
  assert.match(raw, /draft_status:/);
  assert.match(raw, /^date: ""$/m);
});

test("記事の下書き：実機検証済み・コード確認済みの件数は0件と書く。内部リンクは実在するページだけ", () => {
  const raw = fs.readFileSync(path.join(ROOT, "content", "drafts", "editors-picks-vol1.md"), "utf8");
  assert.match(raw, /\| 実機検証済み \|[^|]*\| 0件 \|/);
  assert.match(raw, /\| コード・実装確認済み \|[^|]*\| 0件 \|/);
  for (const m of raw.matchAll(/\]\((\/tools\/([a-z0-9-]+)\/)\)/g)) assert.ok(toolIds.has(m[2]), `記事が存在しないツールにリンクしている: ${m[1]}`);
  const alt = [...raw.matchAll(/\]\(\/alternatives\/([a-z0-9-]+)\/\)/g)].map((m) => m[1]);
  for (const a of alt) assert.ok(fs.existsSync(path.join(ROOT, "content", "alternatives", `${a}.md`)), `存在しない代替ページ: ${a}`);
  for (const m of raw.matchAll(/\]\(\/blog\/([a-z0-9-]+)\/\)/g)) assert.ok(fs.existsSync(path.join(ROOT, "content", "blog", `${m[1]}.md`)), `存在しない記事: ${m[1]}`);
});

test("記事の下書き：10件すべてに、6つの見出し要素がそろう", () => {
  const raw = fs.readFileSync(path.join(ROOT, "content", "drafts", "editors-picks-vol1.md"), "utf8");
  for (const mark of ["① これは何？", "② 何がすごい？", "③ どんなことに使える？", "④ 注目した理由（編集案）", "⑤ 気になる点", "⑥ 基本情報"]) {
    assert.equal(raw.split(mark).length - 1, 10, `${mark} が10件ぶん無い`);
  }
  for (const p of vol1.picks) assert.ok(raw.includes(p.github_url.replace("https://github.com/", "")), `${p.id} のGitHubが記事に無い`);
});

// ---- SNS投稿文（docs/sns/editors-picks/vol1.md）----
function xWeight(s: string): number {
  // 全角（日本語など）は2、半角は1。Xの重みづけの近似
  let w = 0;
  for (const ch of s) w += /[\u0000-ჿ -‍‐-‟′-‷]/.test(ch) ? 1 : 2;
  return w;
}

test("SNS投稿文：告知1・注目3・問いかけ1の5種類。X・Blueskyとも文字数に収まり、公開前のURLを入れていない", () => {
  const raw = fs.readFileSync(path.join(ROOT, "docs", "sns", "editors-picks", "vol1.md"), "utf8");
  const sections = raw.split(/^## \d+\. /m).slice(1);
  assert.equal(sections.length, 5);
  for (const sec of sections) {
    const blocks = [...sec.matchAll(/```\n([\s\S]*?)```/g)].map((m) => m[1].trim());
    assert.equal(blocks.length, 2, "X と Bluesky の2つ");
    const [x, bsky] = blocks;
    assert.ok(xWeight(x) <= 280, `Xが280を超える: ${xWeight(x)}`);
    assert.ok([...bsky.replace("{公開URL}", "x".repeat(23))].length <= 300, "Blueskyが300を超える");
    assert.ok(!x.includes("{公開URL}"), "Xの本文にリンクを入れない（返信欄に置く）");
    assert.ok(!/https?:\/\//.test(x + bsky), "公開前のURLを書かない（{公開URL} のまま）");
    assert.ok(!/(試した|使ってみた|動かしてみた)/.test(x + bsky), "動かしていないものを試したと書かない");
  }
});

test("SNS投稿文：注目3件は、運営者の「特に注目した3件」（MuJoCo・Nerfstudio・Pagefind）の順。告知も同じ3件を挙げる", () => {
  const raw = fs.readFileSync(path.join(ROOT, "docs", "sns", "editors-picks", "vol1.md"), "utf8");
  const heads = [...raw.matchAll(/^## \d+\. (.+)$/gm)].map((m) => m[1]);
  assert.match(heads[1], /第1位[^\n]*MuJoCo/);
  assert.match(heads[2], /第2位[^\n]*Nerfstudio/);
  assert.match(heads[3], /第3位[^\n]*Pagefind/);
  const announce = raw.slice(raw.indexOf("## 1. "), raw.indexOf("## 2. "));
  assert.match(announce, /MuJoCo・Nerfstudio・Pagefindなど/);
  const rest = raw.slice(raw.indexOf("## 2. "));
  assert.ok(!/nanochat|Ladybird|Agent Desktop/.test(rest.slice(0, rest.indexOf("## 5. "))), "差し替え前の3件が残っている");
});
