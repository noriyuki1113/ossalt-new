import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  isDailyCsv, parseDailyCsv, summarizeDaily, compareWindows, readDailyFromDir, buildBaselineMeta, conditionProblems,
  compareIndex, readIndexExport, summarizeInspections, pageFacts, buildSiteSnapshot, diffSiteSnapshots, renderComparison, compareExportPair,
} from "./seo-baseline-lib.mjs";
import { readExportDir } from "./gsc-compare-lib.mjs";
import { guardOut, guardLabel } from "./seo-baseline.mjs";
import { inspectUrls } from "./gsc-api-fetch.mjs";

// 架空の値（実際の Search Console の数値は、テストにも書かない）
const UI = "日付,クリック数,表示回数,CTR,掲載順位\n2026-10-26,7,310,2.26%,9.1\n2026-10-27,9,330,2.73%,11.2\n2026-10-28,11,350,3.14%,12.4\n";
const API = "date,clicks,impressions,ctr,position\n2026-10-26,7,310,0.0226,9.1\n2026-10-27,9,330,0.0273,11.2\n";
const dayRows = (from, n, f) => Array.from({ length: n }, (_, i) => { const d = new Date(Date.parse(`${from}T00:00:00Z`) + i * 86400000).toISOString().slice(0, 10); return { date: d, ...f(i) }; });

test("日別の表：画面の形式（日本語の列名・%）と API の形式（割合）の両方を読む。表の種類はファイル名でなく中身で判断する", () => {
  assert.equal(isDailyCsv(UI), true);
  assert.equal(isDailyCsv(API), true);
  assert.equal(isDailyCsv("上位のクエリ,クリック数,表示回数,CTR,掲載順位\na,1,2,3%,4\n"), false);
  const u = parseDailyCsv(UI), a = parseDailyCsv(API);
  assert.equal(u.rows.length, 3);
  assert.equal(u.rows[0].ctr, 0.0226);
  assert.equal(a.rows[0].ctr, 0.0226);
  assert.equal(u.rows[2].position, 12.4);
});

test("日別の表：日付や数値が読めない行・重複した日は、補わずに数えて外す", () => {
  const r = parseDailyCsv("日付,クリック数,表示回数,CTR,掲載順位\n2026-10-26,1,10,10%,5\n2026-10-26,9,90,10%,5\nへん,1,1,1%,1\n2026-10-27,x,10,1%,1\n2026/10/28,2,20,10%,6\n");
  assert.deepEqual(r.rows.map((x) => x.date), ["2026-10-26", "2026-10-28"]);
  assert.equal(r.rows[0].clicks, 1);
  assert.equal(r.skipped, 3);
});

test("期間の合計：欠けた日を列挙し、順位は表示回数で重みづけする。CTR は合計から計算する", () => {
  const rows = parseDailyCsv("日付,クリック数,表示回数,CTR,掲載順位\n2026-10-26,10,100,10%,10\n2026-10-28,0,300,0%,20\n").rows;
  const s = summarizeDaily(rows, "2026-10-26", "2026-10-28");
  assert.deepEqual(s.missing, ["2026-10-27"]);
  assert.equal(s.days, 3); assert.equal(s.daysWithData, 2);
  assert.equal(s.clicks, 10); assert.equal(s.impressions, 400);
  assert.equal(s.ctr, 10 / 400);
  assert.equal(s.position, (10 * 100 + 20 * 300) / 400);
});

test("2期間の日別比較：同じ長さ・重ならないときだけ比べる。長さが違う・重なるときは理由を示して比べない", () => {
  const rows = dayRows("2026-10-26", 28, (i) => ({ clicks: i, impressions: 100 + i, ctr: i / (100 + i), position: 10 }));
  const ok = compareWindows(rows, { from: "2026-10-26", to: "2026-11-08" }, { from: "2026-11-09", to: "2026-11-22" });
  assert.equal(ok.ok, true);
  assert.equal(ok.daily.length, 14);
  assert.equal(ok.a.clicks, [...Array(14).keys()].reduce((s, i) => s + i, 0));
  assert.equal(ok.change.clicks, ok.b.clicks - ok.a.clicks);
  assert.equal(ok.warnings.some((w) => /近似/.test(w)), true);
  assert.equal(compareWindows(rows, { from: "2026-10-26", to: "2026-11-08" }, { from: "2026-11-09", to: "2026-11-20" }).ok, false);
  const overlap = compareWindows(rows, { from: "2026-10-26", to: "2026-11-08" }, { from: "2026-11-05", to: "2026-11-18" });
  assert.equal(overlap.ok, false);
  assert.match(overlap.errors.join(""), /重なって/);
  const gap = compareWindows(rows, { from: "2026-10-26", to: "2026-11-01" }, { from: "2026-11-09", to: "2026-11-15" });
  assert.equal(gap.ok, true);
  assert.match(gap.warnings.join(""), /連続していません/);
});

test("2期間の日別比較：データの無い日は欠測として示し、0として扱わない", () => {
  const rows = dayRows("2026-10-26", 6, (i) => ({ clicks: 1, impressions: 10, ctr: 0.1, position: 5 })).filter((r) => r.date !== "2026-10-27");
  const c = compareWindows(rows, { from: "2026-10-26", to: "2026-10-28" }, { from: "2026-10-29", to: "2026-10-31" });
  assert.equal(c.ok, true);
  assert.equal(c.daily[1].aMissing, true);
  assert.equal(c.a.daysWithData, 2);
  assert.match(c.warnings.join(""), /データの無い日が 1日/);
});

test("フォルダの中の日別の表を、名前に関係なく見つける（画面のエクスポートには、中身と名前が合わないものがある）", async () => {
  const d = await mkdtemp(join(tmpdir(), "bl-"));
  await writeFile(join(d, "クエリ.csv"), "上位のクエリ,クリック数,表示回数,CTR,掲載順位\na,1,2,3%,4\n");
  await writeFile(join(d, "平均読み込み時間のチャート.csv"), UI);
  const r = await readDailyFromDir(d);
  assert.equal(r.file, "平均読み込み時間のチャート.csv");
  assert.equal(r.rows.length, 3);
  const empty = await mkdtemp(join(tmpdir(), "bl-"));
  assert.equal(await readDailyFromDir(empty), null);
});

test("登録の meta：日別の範囲を照合し、データが期間の途中から始まる場合は記録して補わない。プロパティ未指定は警告", () => {
  const daily = parseDailyCsv(UI);
  const { meta, warnings } = buildBaselineMeta({ from: "2026-10-05", to: "2026-11-01", property: "sc-domain:ossalt.jp", daily, label: "x", registeredOn: "2026-11-06" });
  assert.equal(meta.dataStartsOn, "2026-10-26");
  assert.equal(meta.searchType, "web"); assert.equal(meta.brandFiltered, false);
  assert.ok(warnings.some((w) => /2026-10-26 から始まって/.test(w)));
  assert.ok(buildBaselineMeta({ from: "2026-10-26", to: "2026-10-28", daily, label: "x", registeredOn: "d" }).warnings.some((w) => /プロパティ/.test(w)));
  assert.throws(() => buildBaselineMeta({ from: "2026-12-01", to: "2026-12-10", property: "p", daily, label: "x", registeredOn: "d" }), /重なりません/);
  assert.throws(() => buildBaselineMeta({ from: "2026-11-05", to: "2026-11-01", property: "p", daily, label: "x", registeredOn: "d" }), /不正/);
});

test("条件の照合：プロパティ・検索タイプ・国・デバイス・ブランド除外が違う、または未記録なら比較しない", () => {
  const base = { property: "sc-domain:ossalt.jp", searchType: "web", country: "all", device: "all", brandFiltered: false };
  assert.deepEqual(conditionProblems(base, { ...base }), []);
  assert.match(conditionProblems(base, { ...base, property: "https://ossalt.jp/" }).join(""), /プロパティが違います/);
  assert.match(conditionProblems(base, { ...base, property: null }).join(""), /未記録/);
  assert.match(conditionProblems(base, { ...base, device: "mobile" }).join(""), /デバイスが違います/);
  assert.match(conditionProblems(base, { ...base, brandFiltered: true }).join(""), /ブランド/);
});

test("インデックス登録：未取得は未取得と言い、取得できたものは最後の日の値と理由ごとの差を出す", async () => {
  assert.equal((await readIndexExport(null)).status, "未取得");
  assert.equal(compareIndex({ status: "未取得", reason: "x" }, { status: "取得" }).status, "未取得");
  const mk = async (chart, table) => {
    const d = await mkdtemp(join(tmpdir(), "ix-"));
    await writeFile(join(d, "チャート.csv"), chart); await writeFile(join(d, "表.csv"), table);
    return readIndexExport(d);
  };
  const before = await mk("日付,インデックス登録済み,未登録\n2026-10-26,700,40\n2026-11-02,710,45\n", "理由,ソース,確認,ページ\nクロール済み - インデックス未登録,Google システム,未開始,30\n重複,ウェブサイト,未開始,10\n");
  const after = await mk("日付,インデックス登録済み,未登録\n2026-11-22,725,60\n", "理由,ソース,確認,ページ\nクロール済み - インデックス未登録,Google システム,未開始,50\n");
  const c = compareIndex(before, after);
  assert.equal(c.status, "取得");
  assert.deepEqual(c.chart.map((x) => [x.name, x.before, x.after]), [["インデックス登録済み", 710, 725], ["未登録", 45, 60]]);
  assert.equal(c.reasons[0].reason, "クロール済み - インデックス未登録");
  assert.equal(c.reasons.find((r) => r.reason === "重複").change, null);
});

test("URL検査の集計：取得できなかったURLは数え、状態ごとに集計する", () => {
  const s = summarizeInspections([{ url: "a", verdict: "PASS", coverageState: "送信して登録されました" }, { url: "b", verdict: "NEUTRAL", coverageState: "クロール済み - インデックス未登録" }, { url: "c", error: "HTTP 429" }, { url: "d", verdict: "PASS", coverageState: "送信して登録されました" }]);
  assert.equal(s.total, 4); assert.equal(s.failed, 1);
  assert.deepEqual(s.byState[0], ["送信して登録されました", 2]);
});

test("inspectUrls：読み取りだけ・上限あり・失敗したURLは error で返す", async () => {
  const calls = [];
  const fetchImpl = async (u, o) => {
    calls.push(JSON.parse(o.body));
    const url = JSON.parse(o.body).inspectionUrl;
    if (url.endsWith("/bad/")) return { ok: false, status: 429, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => ({ inspectionResult: { indexStatusResult: { verdict: "PASS", coverageState: "送信して登録されました" } } }) };
  };
  const r = await inspectUrls({ token: "t", site: "sc-domain:ossalt.jp", urls: ["https://ossalt.jp/", "https://ossalt.jp/bad/"], fetchImpl });
  assert.equal(r[0].verdict, "PASS");
  assert.equal(r[1].error, "HTTP 429");
  assert.equal(calls[0].siteUrl, "sc-domain:ossalt.jp");
  await assert.rejects(inspectUrls({ token: "t", site: "s", urls: Array(201).fill("https://ossalt.jp/"), fetchImpl }), /200 件まで/);
});

const html = (title, { robots = null, canonical = null, h1 = "見出し", refresh = null } = {}) =>
  `<html><head><title>${title}</title>${robots ? `<meta name="robots" content="${robots}"/>` : ""}${canonical ? `<link rel="canonical" href="${canonical}"/>` : ""}${refresh ? `<meta http-equiv="refresh" content="${refresh}"/>` : ""}</head><body><h1>${h1}</h1></body></html>`;

test("サイトの構造：index対象・noindex・転送を数え、canonical・title・サイトマップの不整合を点検する。差分も出す", () => {
  const P = (arr) => new Map(arr.map(([u, h]) => [u, pageFacts(h)]));
  const a = buildSiteSnapshot(P([["/", html("A", { canonical: "https://ossalt.jp/" })], ["/tools/x/", html("X", { canonical: "https://ossalt.jp/tools/x/" })], ["/tools/old/", html("old", { refresh: "0; url=/tools/x/", canonical: "https://ossalt.jp/tools/x/" })], ["/compare/a/", html("c", { robots: "noindex, follow", canonical: "https://ossalt.jp/compare/a/" })]]), ["/", "/tools/x/"]);
  assert.equal(a.total.indexable, 2); assert.equal(a.total.redirect, 1); assert.equal(a.total.noindex, 1);
  assert.deepEqual(a.issues.sitemapNotIndexable, []);
  const b = buildSiteSnapshot(P([["/", html("A2", { canonical: "https://ossalt.jp/" })], ["/tools/x/", html("X", { canonical: "https://ossalt.jp/tools/other/" })], ["/tools/y/", html("", { canonical: "https://ossalt.jp/tools/y/" })], ["/compare/a/", html("c", { canonical: "https://ossalt.jp/compare/a/" })]]), ["/", "/tools/x/", "/compare/a/", "/missing/"]);
  assert.deepEqual(b.issues.canonicalNotSelf, ["/tools/x/"]);
  assert.deepEqual(b.issues.noTitle, ["/tools/y/"]);
  assert.deepEqual(b.issues.sitemapNotIndexable.sort(), ["/missing/"]);
  assert.deepEqual(b.issues.indexableNotInSitemap, ["/tools/y/"]);
  const d = diffSiteSnapshots(a, b);
  assert.equal(d.title.count, 1); assert.deepEqual(d.title.examples, ["/"]);
  assert.equal(d.canonical.count, 1); assert.equal(d.robots.count, 1);
  assert.equal(d.removedCount, 1); assert.equal(d.addedCount, 1);
  assert.deepEqual(d.sitemap, { added: 2, removed: 0 });
});

test("ページ別・クエリ別の比較：条件が合わなければ比べない。meta.json の期間・条件を使う", async () => {
  const mk = async (meta, rows) => {
    const d = await mkdtemp(join(tmpdir(), "ex-"));
    await writeFile(join(d, "ページ.csv"), "上位のページ,クリック数,表示回数,CTR,掲載順位\n" + rows.map(([u, c, i]) => `${u},${c},${i},${((c / i) * 100).toFixed(1)}%,8`).join("\n") + "\n");
    await writeFile(join(d, "クエリ.csv"), "上位のクエリ,クリック数,表示回数,CTR,掲載順位\nq1,1,50,2%,8\nq2,0,40,0%,9\n");
    await writeFile(join(d, "デバイス.csv"), "デバイス,クリック数,表示回数,CTR,掲載順位\nPC,10,500,2%,8\n");
    await writeFile(join(d, "meta.json"), JSON.stringify(meta));
    return readExportDir(d);
  };
  const cond = { searchType: "web", country: "all", device: "all", brandFiltered: false };
  const before = await mk({ from: "2026-10-26", to: "2026-11-08", ...cond }, [["https://ossalt.jp/a/", 1, 100], ["https://ossalt.jp/b/", 0, 60]]);
  const after = await mk({ from: "2026-11-09", to: "2026-11-22", ...cond }, [["https://ossalt.jp/a/", 2, 80], ["https://ossalt.jp/b/", 0, 90], ["https://ossalt.jp/c/", 0, 40]]);
  const r = compareExportPair(before, after);
  assert.equal(r.pages.check.ok, true);
  assert.equal(r.pages.appeared, 1);
  assert.equal(r.pages.gainers[0].label, "https://ossalt.jp/b/");
  assert.equal(r.pages.losers[0].label, "https://ossalt.jp/a/");
  const diffLen = await mk({ from: "2026-11-09", to: "2026-11-30", ...cond }, [["https://ossalt.jp/a/", 2, 80]]);
  const bad = compareExportPair(before, diffLen);
  assert.equal(bad.pages.check.ok, false);
  assert.match(bad.pages.check.errors.join(""), /期間の長さが違います/);
  assert.equal(bad.pages.gainers, undefined);
});

test("レポート：条件が違えば数値の比較をしない旨を最初に示し、数値の表を出さない。数値を含むことと、読み方の注意を示す", () => {
  const meta = (p) => ({ before: { from: "2026-10-26", to: "2026-11-08", property: "sc-domain:ossalt.jp", searchType: "web", country: "all", device: "all", brandFiltered: false }, after: { from: "2026-11-09", to: "2026-11-22", property: p, searchType: "web", country: "all", device: "all", brandFiltered: false } });
  const refused = { ok: false, errors: ["x"], warnings: [], a: null, b: null, daily: [] };
  const md = renderComparison({ meta: meta("https://ossalt.jp/"), daily: refused, tables: { pages: { check: { ok: false, errors: ["y"], warnings: [], unverified: [] } }, queries: { check: { ok: false, errors: ["y"], warnings: [], unverified: [] } } }, index: null, inspections: null, site: null, changelog: [], generatedAt: "t" });
  assert.match(md, /条件がそろっていないため、数値の比較をしていません/);
  assert.match(md, /Search Console の数値が含まれます/);
  assert.match(md, /変化の原因を、この表だけで断定しないでください/);
  assert.match(md, /未取得/);
  assert.ok(!/日の位置で並べた推移/.test(md));
});

test("出力先・保管名の検査：Git管理外の場所だけ、安全な名前だけ", () => {
  assert.ok(guardOut("reports/seo/baseline/x.md"));
  assert.ok(guardOut("agency/reports/x.md"));
  assert.throws(() => guardOut("docs/x.md"), /Git管理外/);
  assert.throws(() => guardOut("reports/seo/../../docs/x.md"), /Git管理外/);
  assert.equal(guardLabel("baseline-20261102"), "baseline-20261102");
  assert.throws(() => guardLabel("../x"), /--label/);
  assert.throws(() => guardLabel(""), /--label/);
});
