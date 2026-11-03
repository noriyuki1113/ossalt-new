import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readExportDir, compareExports, checkComparable, parseDateText, parseFilters, compareRows, capState, GSC_UI_ROW_CAP } from "./gsc-compare-lib.mjs";

const SAMPLE = new URL("./fixtures/gsc-sample/", import.meta.url).pathname;

async function makeDir({ queries, filters = "フィルタ,値\n検索タイプ,ウェブ\n日付,2026/10/06 - 2026/11/02\n", meta = { brandFiltered: true } }) {
  const d = await mkdtemp(join(tmpdir(), "gsc-"));
  await writeFile(join(d, "クエリ.csv"), queries);
  await writeFile(join(d, "フィルタ.csv"), filters);
  await writeFile(join(d, "meta.json"), JSON.stringify(meta));
  return d;
}
const csv = (rows) => "上位のクエリ,クリック数,表示回数,CTR,掲載順位\n" + rows.map(([q, c, i, p]) => `${q},${c},${i},${(c / i * 100).toFixed(2)}%,${p}`).join("\n") + "\n";

test("サンプルの2期間を比較できる。架空データであることを警告する", async () => {
  const cur = await readExportDir(SAMPLE + "cur"), prev = await readExportDir(SAMPLE + "prev");
  const r = compareExports(cur, prev);
  assert.ok(r.check.ok);
  assert.ok(r.check.warnings.some((w) => w.includes("架空")));
  const by = Object.fromEntries(r.rows.map((x) => [x.label, x]));
  assert.equal(by["notion 代替 oss"].dClicks, 1);
  assert.equal(by["notion 代替 oss"].dPosition, -2.3); // 負＝順位が上がった
  assert.equal(by["旧クエリのみ"].status, "prev-only");
  assert.equal(by["新クエリのみ"].status, "cur-only");
  assert.equal(by["少数クエリ"].status, "cur-only");
  assert.ok(r.coverage.cur.impressionShare < 1, "匿名化・上限で全件ではないことをカバー率で示す");
});

test("少数の表示回数の行は、順位差を出さず lowSample にする", () => {
  const mk = (i, p) => ({ label: "q", kind: "query", clicks: 0, impressions: i, ctr: 0, position: p });
  const [r] = compareRows([mk(10, 5)], [mk(100, 9)]);
  assert.equal(r.lowSample, true);
  assert.equal(r.dPosition, null);
});

test("条件が違う期間は比較を拒否する（長さ・重複・検索タイプ）", async () => {
  const dirs = [];
  try {
    const base = await makeDir({ queries: csv([["a", 1, 100, 8]]) });
    dirs.push(base);
    const mismatchLen = await makeDir({ queries: csv([["a", 1, 100, 8]]), filters: "フィルタ,値\n検索タイプ,ウェブ\n日付,2026/09/15 - 2026/10/05\n" });
    const overlap = await makeDir({ queries: csv([["a", 1, 100, 8]]), filters: "フィルタ,値\n検索タイプ,ウェブ\n日付,2026/10/01 - 2026/10/28\n" });
    const image = await makeDir({ queries: csv([["a", 1, 100, 8]]), filters: "フィルタ,値\n検索タイプ,画像\n日付,2026/09/08 - 2026/10/05\n" });
    dirs.push(mismatchLen, overlap, image);
    const cur = await readExportDir(base);
    assert.match(compareExports(cur, await readExportDir(mismatchLen)).check.errors.join(), /期間の長さが違/);
    assert.match(compareExports(cur, await readExportDir(overlap)).check.errors.join(), /重なって/);
    const t = compareExports(cur, await readExportDir(image));
    assert.match(t.check.errors.join(), /検索タイプが違/);
    assert.deepEqual(t.rows, []);
  } finally { await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true }))); }
});

test("相対表記（過去28日間）だけでは期間を確定しない＝未確認と明示。ブランド除外の申告が無いときも未確認", async () => {
  const f = "フィルタ,値\n検索タイプ,ウェブ（テキストベース）\n日付,過去 28 日間\n";
  const a = await makeDir({ queries: csv([["a", 1, 100, 8]]), filters: f, meta: {} });
  const b = await makeDir({ queries: csv([["a", 1, 100, 8]]), filters: f, meta: {} });
  try {
    const c = checkComparable(await readExportDir(a), await readExportDir(b));
    assert.ok(c.ok);
    assert.ok(c.unverified.some((x) => x.includes("期間")));
    assert.ok(c.unverified.some((x) => x.includes("ブランド")));
  } finally { await rm(a, { recursive: true }); await rm(b, { recursive: true }); }
});

test("行数が上限の表は全件でないとみなし、片方にだけある行を断定しない", () => {
  assert.equal(capState(GSC_UI_ROW_CAP).capped, true);
  assert.equal(capState(GSC_UI_ROW_CAP - 1).capped, false);
  const mk = (l) => ({ label: l, kind: "query", clicks: 1, impressions: 100, ctr: 0.01, position: 8 });
  const rows = compareRows([mk("x")], [mk("y")], { curCapped: true, prevCapped: true });
  assert.deepEqual(rows.map((r) => r.status).sort(), ["unverifiable", "unverifiable"]);
});

test("parseDateText / parseFilters", () => {
  assert.deepEqual(parseDateText("過去 28 日間"), { from: null, to: null, relativeDays: 28 });
  assert.deepEqual(parseDateText("2026/10/06 - 2026/11/02"), { from: "2026-10-06", to: "2026-11-02", relativeDays: null });
  assert.equal(parseFilters("フィルタ,値\n国,日本\nデバイス,モバイル\n").country, "日本");
});
