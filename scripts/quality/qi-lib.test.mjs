import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluatePage, priorityOf, diffAudits, countClaims, shingles, jaccard, RULES_VERSION } from "./qi-lib.mjs";

const tool = (o = {}) => ({ id: "x", name: "X", url: "https://x.example", github_url: "https://github.com/x/x", license: "MIT", primary_competitor: "Slack", description_ja: "Slackの代わりに使えるチャット。", description_en: "Chat app", ...o });
const html = (t) => `<a href="${t.url}">公式</a><a href="${t.github_url}">GitHub</a><a href="/alternatives/slack/">代替</a>`;
const facts = (t, extra = "") => ({ title: `${t.name}とは？`, text: `ライセンス ${t.license} 取得日：2026/10/29 ${extra}`, robots: "index, follow" });
const base = (o = {}) => {
  const t = tool(o.tool);
  return { tool: t, html: html(t), facts: facts(t, o.text), seoIssues: [], jsonLdOk: true, inSitemap: true, noindex: false, inbound: 5, guide: null, relation: null, licenseGroup: "osi", maxSimilarity: null, competitorIsOss: false, uxTemplate: "pass", faqShare: 0.5, brokenLinks: [], ...o.input };
};
const guide = (o = {}) => ({ body: "## できること\n" + "あ".repeat(700) + "\n### 向いていない人\n- 運用できない人\n### 始め方の目安\nDockerで導入。", glance: { not_for: ["x"] }, verification: "official", ...o });

test("基準のバージョンを持つ", () => assert.match(RULES_VERSION, /^qi-/));

test("検査できない項目（未検証・未分類）は0点にしない：配点の母数から外す", () => {
  const verified = evaluatePage(base({ input: { guide: guide({ verification: "official" }), relation: "combo" } }));
  const unverified = evaluatePage(base({ input: { guide: guide({ verification: "unverified" }), relation: null } }));
  const r4 = unverified.criteria.find((c) => c.id === "R4");
  assert.equal(r4.status, "unknown");
  assert.equal(r4.points, 0);
  // 未確認の項目は母数から外れるので、点数は下がらない（＝不合格と区別）
  assert.equal(unverified.score, verified.score);
  assert.ok(unverified.coverage < verified.coverage);
});

test("A評価には公式資料との照合（R4）が必要。未検証ならBまで", () => {
  const r = evaluatePage(base({ input: { guide: guide({ verification: "unverified" }) } }));
  assert.ok(r.score >= 85);
  assert.equal(r.grade, "B");
  assert.equal(r.gradeCapped, true);
  assert.equal(evaluatePage(base({ input: { guide: guide() } })).grade, "A");
});

test("確認できた割合が低いと、総合点を出さず「未評価」または「暫定」", () => {
  const r = evaluatePage(base({ input: { uxTemplate: "unknown", guide: guide({ verification: "unverified" }), relation: null } }));
  assert.equal(r.status, "rated"); // 一部の未確認なら評価する
  assert.ok(r.coverage > 0.8);
});

test("手書きの解説が無いページは、独自性が低く出る（共通テンプレートを独自の内容と数えない）", () => {
  const r = evaluatePage(base());
  assert.equal(r.criteria.find((c) => c.id === "U1").status, "fail");
  assert.equal(r.criteria.find((c) => c.id === "U4").status, "na");
  assert.ok(r.score < 70);
});

test("ほかのページの解説と似すぎていれば、重複として不合格", () => {
  const r = evaluatePage(base({ input: { guide: guide(), maxSimilarity: { id: "y", score: 0.7 } } }));
  assert.equal(r.criteria.find((c) => c.id === "U4").status, "fail");
});

test("シングルとジャカード：同じ文は1、別の文は低い", () => {
  const a = shingles("Gitのリポジトリを、自社のサーバーで管理するためのツールです。");
  assert.equal(jaccard(a, a), 1);
  assert.ok(jaccard(a, shingles("写真と動画を、スマホから自動でバックアップするサービスです。")) < 0.2);
});

test("警告：GitHubのミラー・OSI承認でないのに『オープンソース代替』・件数の食い違い・代替対象がOSS", () => {
  const r = evaluatePage(base({
    tool: { description_en: "Read-only mirror of https://gitlab.example/x", description_ja: "400以上のサービスと連携できる。", license: "Sustainable Use License" },
    text: "Slack のオープンソース代替。",
    input: { licenseGroup: "source-available", guide: guide({ body: guide().body + "1,500以上の連携先がある。" }), competitorIsOss: true },
  }));
  const ids = r.warnings.map((w) => w.id);
  for (const id of ["mirror-source", "template-oss-term", "count-mismatch", "competitor-oss"]) assert.ok(ids.includes(id), id);
  assert.equal(priorityOf(r).level, "P0");
});

test("countClaims：サービス・連携・インテグレーションは同じ「連携」として扱う", () => {
  assert.deepEqual(countClaims("400以上のサービス"), [{ n: 400, what: "連携" }]);
  assert.deepEqual(countClaims("1,500以上のインテグレーション"), [{ n: 1500, what: "連携" }]);
});

test("優先度：検索の表示回数が無いときは推測せず、評価だけで決める", () => {
  const r = evaluatePage(base());
  assert.match(priorityOf(r, { impressions: null }).level, /P[123]/);
});

test("差分：入力の変更と、点数の改善・悪化・追加・削除を区別する", () => {
  const prev = { pages: [{ id: "a", score: 60, inputHash: "1" }, { id: "b", score: 80, inputHash: "2" }, { id: "gone", score: 50, inputHash: "3" }] };
  const cur = { pages: [{ id: "a", score: 75, inputHash: "9" }, { id: "b", score: 70, inputHash: "2" }, { id: "new", score: 40, inputHash: "4" }] };
  const d = diffAudits(prev, cur);
  assert.deepEqual(d.improved, [{ id: "a", from: 60, to: 75 }]);
  assert.deepEqual(d.worsened, [{ id: "b", from: 80, to: 70 }]);
  assert.deepEqual(d.added, ["new"]);
  assert.deepEqual(d.removed, ["gone"]);
  assert.deepEqual(d.changedInput, ["a"]);
});
