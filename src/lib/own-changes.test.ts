import { test } from "node:test";
import assert from "node:assert/strict";
import { buildOwnReport, checkedDay, normalizeRepo, releasesUrl, signed, validInstant, validWindow, type OwnTool } from "./own-changes.ts";

const asOf = new Date("2026-10-30T03:00:00Z"); // 2026-10-30 12:00 JST
const starsAsOf = "2026-10-29T22:13:57Z";

function tool(id: string, extra: Partial<OwnTool> = {}): OwnTool {
  return {
    id, name: id.toUpperCase(), github_url: `https://github.com/org/${id}`,
    stars_num: 10000, last_commit: "2026-10-28T00:00:00Z", github_archived: false,
    latest_release_at: null, releases_12mo: 0,
    star_gain: { gain: 300, days: 30, from: "2026-09-29", to: "2026-10-29" },
    star_gain_7d: { gain: 100, days: 7, from: "2026-10-22", to: "2026-10-29" },
    primary_competitor: "SaaS", primary_competitor_ja: null,
    github_checked_at: "2026-10-29T01:00:00Z",
    ...extra,
  };
}

test("外部Watchに依存せず、自前のデータだけで通常のレポートになる", () => {
  const r = buildOwnReport([tool("a"), tool("b", { star_gain_7d: { gain: 50, days: 8, from: "2026-10-21", to: "2026-10-29" } })], { asOf, starsAsOf });
  assert.equal(r.status, "fresh");
  assert.equal(r.total, 2);
  assert.equal(r.verified, 2);
  assert.equal(r.star.comparable, 2);
  assert.deepEqual(r.star.up.map((x) => x.tool.id), ["a", "b"]);
  assert.equal(r.notable.byGain.length, 2);
  // 比較の日付と日数をそのまま持つ
  assert.deepEqual(r.star.up[1].w7, { gain: 50, days: 8, from: "2026-10-21", to: "2026-10-29" });
});

test("自前のデータが古い場合は stale になり、注目の変化・直近のリリースを出さない", () => {
  const old = new Date("2026-11-07T03:00:00Z");
  const r = buildOwnReport([tool("a", { latest_release_at: "2026-10-29T00:00:00Z" })], { asOf: old, starsAsOf });
  assert.equal(r.status, "stale");
  assert.ok((r.ageHours as number) > 48);
  assert.deepEqual(r.notable, { byGain: [], byRate: [], biggestDrop: null });
  assert.equal(r.maintenance.recentReleases.length, 0);
  // 取得から7日を超えた値は、7日間の比較にも使わない
  assert.equal(r.star.comparable, 0);
  assert.equal(r.star.notComparable, 1);
  assert.equal(r.verified, 0);
});

test("観測データが無い場合は数値を作らない（none・比較不可）", () => {
  const r = buildOwnReport([tool("a", { github_checked_at: null, star_gain: null, star_gain_7d: null, stars_num: null, last_commit: null })], { asOf, starsAsOf: null });
  assert.equal(r.status, "none");
  assert.equal(r.dataAsOf, null);
  assert.equal(r.star.comparable, 0);
  assert.equal(r.star.flat, 0); // 未観測を「変化0」と数えない
  assert.equal(r.star.notComparable, 1);
  assert.equal(r.maintenance.buckets.unknown, 1);
  assert.equal(buildOwnReport([], { asOf }).status, "none");
});

test("同じOSS（同じid・同じリポジトリ）は1件にまとめる", () => {
  const r = buildOwnReport([
    tool("a"), tool("a"),
    tool("a2", { github_url: "https://github.com/ORG/A.git" }),
    tool("a3", { github_url: "https://github.com/org/a/" }),
    tool("c"),
  ], { asOf, starsAsOf });
  assert.equal(r.total, 2);
  assert.equal(r.duplicatesRemoved, 3);
  assert.equal(new Set(r.star.up.map((x) => x.tool.id)).size, r.star.up.length);
});

test("Starの増加と減少の両方を扱い、変化なしは別に数える", () => {
  const r = buildOwnReport([
    tool("up"),
    tool("down", { star_gain_7d: { gain: -40, days: 7, from: "2026-10-22", to: "2026-10-29" } }),
    tool("down2", { star_gain_7d: { gain: -5, days: 7, from: "2026-10-22", to: "2026-10-29" } }),
    tool("flat", { star_gain_7d: { gain: 0, days: 7, from: "2026-10-22", to: "2026-10-29" } }),
  ], { asOf, starsAsOf });
  assert.deepEqual(r.star.up.map((x) => x.tool.id), ["up"]);
  assert.deepEqual(r.star.down.map((x) => x.tool.id), ["down", "down2"]);
  assert.equal(r.star.flat, 1);
  assert.equal(r.notable.biggestDrop?.tool.id, "down");
  assert.equal(signed(-40), "−40");
  assert.equal(signed(1234), "+1,234");
  assert.equal(signed(0), "±0");
});

test("比較期間：日付と日数が食い違うもの・短すぎ・長すぎるものは比較不可", () => {
  const today = "2026-10-30";
  const o = { minDays: 7, maxDays: 10 };
  assert.ok(validWindow({ gain: 1, days: 7, from: "2026-10-22", to: "2026-10-29" }, today, o));
  assert.equal(validWindow({ gain: 1, days: 9, from: "2026-10-22", to: "2026-10-29" }, today, o), null);
  assert.equal(validWindow({ gain: 1, days: 3, from: "2026-10-26", to: "2026-10-29" }, today, o), null);
  assert.equal(validWindow({ gain: 1, days: 14, from: "2026-10-15", to: "2026-10-29" }, today, o), null);
  assert.equal(validWindow({ gain: 1, days: 7, from: "2026-10-29", to: "2026-10-22" }, today, o), null);
  assert.equal(validWindow({ gain: 1.5, days: 7, from: "2026-10-22", to: "2026-10-29" }, today, o), null);
  assert.equal(validWindow({ gain: 1, days: 7, from: "2026-10-22" }, today, o), null);
});

test("将来の日時・不正な値は捨てる", () => {
  const now = asOf.getTime();
  assert.equal(validInstant("2027-01-01T00:00:00Z", now), null);
  assert.equal(validInstant("not-a-date", now), null);
  assert.equal(validInstant("", now), null);
  assert.ok(validInstant("2026-10-30T03:03:00Z", now)); // 5分以内の時計のずれは許す
  const r = buildOwnReport([
    tool("future", { star_gain_7d: { gain: 99, days: 7, from: "2026-10-24", to: "2026-10-31" }, github_checked_at: "2026-12-01T00:00:00Z" }),
    tool("neg", { stars_num: -5 }),
    tool("nan", { stars_num: Number.NaN }),
  ], { asOf, starsAsOf: "2099-01-01T00:00:00Z" });
  assert.equal(r.star.comparable, 0);
  assert.equal(r.status, "fresh"); // 未来の stars_as_of は捨て、ツールの取得日時（未来は除く）からも作れない → 他の正しい値から
  assert.equal(r.dataAsOf, "2026-10-29T01:00:00.000Z");
  assert.throws(() => buildOwnReport([], { asOf: new Date("bad") }));
});

test("取得日時の無い古いデータでは、実測の期間の終了日を取得日とみなす", () => {
  const now = asOf.getTime();
  assert.equal(checkedDay(tool("a"), now), "2026-10-29");
  assert.equal(checkedDay(tool("a", { github_checked_at: undefined }), now), "2026-10-29");
  assert.equal(checkedDay(tool("a", { github_checked_at: undefined, star_gain_7d: null, star_gain: null }), now), null);
});

test("伸び率は起点が小さいものを除き、アーカイブは掲載中の集計に入れず別に出す", () => {
  const r = buildOwnReport([
    tool("small", { stars_num: 600, star_gain_7d: { gain: 300, days: 7, from: "2026-10-22", to: "2026-10-29" } }),
    tool("big", { stars_num: 21000, star_gain_7d: { gain: 1000, days: 7, from: "2026-10-22", to: "2026-10-29" } }),
    tool("gone", { github_archived: true }),
  ], { asOf, starsAsOf });
  assert.equal(r.star.up.find((x) => x.tool.id === "small")?.ratePct, null);
  assert.equal(r.star.up.find((x) => x.tool.id === "big")?.ratePct, 5);
  assert.deepEqual(r.notable.byRate.map((x) => x.tool.id), ["big"]);
  assert.equal(r.total, 2);
  assert.deepEqual(r.maintenance.archived.map((t) => t.id), ["gone"]);
});

test("保守の状況は取得日を基準に数え、直近のリリースはGitHubの公開日だけで判定する", () => {
  const r = buildOwnReport([
    tool("fresh"),
    tool("quiet", { last_commit: "2025-01-01T00:00:00Z" }),
    tool("mid", { last_commit: "2026-06-01T00:00:00Z" }),
    tool("nopush", { last_commit: null }),
    tool("rel", { latest_release_at: "2026-10-27T10:00:00Z" }),
    tool("oldrel", { latest_release_at: "2026-09-01T10:00:00Z" }),
    tool("futurerel", { latest_release_at: "2027-09-01T10:00:00Z" }),
  ], { asOf, starsAsOf });
  const b = r.maintenance.buckets;
  assert.equal(b.within30, 4);
  assert.equal(b.within365, 1);
  assert.equal(b.over365, 1);
  assert.equal(b.unknown, 1);
  assert.deepEqual(r.maintenance.longQuiet.map((x) => x.tool.id), ["quiet"]);
  assert.deepEqual(r.maintenance.recentReleases.map((x) => x.tool.id), ["rel"]);
  assert.equal(r.maintenance.noReleaseInfo, 5);
});

test("リポジトリの正規化とリリースのページ", () => {
  assert.equal(normalizeRepo("https://github.com/n8n-io/n8n"), "n8n-io/n8n");
  assert.equal(normalizeRepo("https://evil.example/n8n-io/n8n"), null);
  assert.equal(releasesUrl("https://github.com/n8n-io/n8n/"), "https://github.com/n8n-io/n8n/releases");
  assert.equal(releasesUrl("https://gitlab.com/x/y"), null);
});
