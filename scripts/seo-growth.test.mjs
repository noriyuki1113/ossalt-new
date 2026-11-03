import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readExportDir } from "./gsc-compare-lib.mjs";
import { buildGrowth, renderGrowth, loadQiIndex } from "./seo-growth-lib.mjs";

const ROOT = new URL("../", import.meta.url).pathname;
const S = ROOT + "scripts/fixtures/gsc-sample/";

test("サンプルから候補とレポートを作る。架空表示・データ不足・仮説の区分が入る", async () => {
  const cur = await readExportDir(S + "cur"), prev = await readExportDir(S + "prev");
  const g = buildGrowth({ cur, prev, qiMap: loadQiIndex({ pages: [{ url: "/tools/affine/", status: "rated", grade: "C", score: 40 }] }) });
  assert.equal(g.primaryKind, "pairs");
  assert.ok(g.ranked.items.length >= 1 && g.ranked.items.length <= 10);
  const md = renderGrowth(g, { cur, prev, generatedAt: "2026-11-03", sample: true });
  assert.match(md, /サンプル（架空）データです/);
  assert.match(md, /推定クリック増加は、確実な成果として表示しません/);
  assert.match(md, /データ不足/);
  assert.match(md, /平均順位10\.7/);
  assert.ok(g.cannibal.groups.length === 1);
});

test("前期間なしでも動き、比較していないことを明示する（架空の増減を作らない）", async () => {
  const cur = await readExportDir(S + "cur");
  const g = buildGrowth({ cur, prev: null });
  assert.ok(g.notes.some((n) => n.includes("増減の比較は行っていません")));
  assert.ok(g.ranked.items.every((x) => x.cmp === null));
});

test("CLI：サンプルは --allow-sample が無いと拒否、出力先は gitignore 済みの場所に限る", async () => {
  const node = process.execPath;
  const base = ["scripts/seo-growth.mjs", "rank", "--cur", S + "cur", "--prev", S + "prev"];
  const r1 = spawnSync(node, base, { cwd: ROOT, encoding: "utf8" });
  assert.notEqual(r1.status, 0);
  assert.match(r1.stderr, /架空のサンプル/);
  const r2 = spawnSync(node, [...base, "--allow-sample", "--out", "docs/leak.md"], { cwd: ROOT, encoding: "utf8" });
  assert.notEqual(r2.status, 0);
  assert.match(r2.stderr, /gitignore 済み/);
  const dir = await mkdtemp(join(tmpdir(), "growth-"));
  try {
    // tmp は許可リスト外なので、reports/seo/ 配下の一時ファイルに出して消す
    const out = "reports/seo/growth/_test-rank.md";
    execFileSync(node, [...base, "--allow-sample", "--out", out], { cwd: ROOT });
    assert.match(await readFile(ROOT + out, "utf8"), /SEO Growth Engine/);
    await rm(ROOT + out);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("effect：ledger の各項目を評価。サンプルの期間は変更日と合わないので評価不能になる", async () => {
  const node = process.execPath, out = "reports/seo/growth/_test-effect.md";
  execFileSync(node, ["scripts/seo-growth.mjs", "effect", "--before", S + "prev", "--after", S + "cur", "--allow-sample", "--out", out], { cwd: ROOT });
  const md = await readFile(ROOT + out, "utf8");
  assert.match(md, /サンプル（架空）データ/);
  assert.match(md, /兆候|評価不能/);
  assert.doesNotMatch(md, /成功しました|効果がありました/);
  await rm(ROOT + out);
});
