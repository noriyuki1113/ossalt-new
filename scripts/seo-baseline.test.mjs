import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const CLI = resolve("scripts/seo-baseline.mjs");
const run = (cwd, ...args) => spawnSync("node", [CLI, ...args], { cwd, encoding: "utf8" });

async function exportDir(cwd, name, from, days, { clicks = 1, impr = 100, pages } = {}) {
  const d = join(cwd, "in", name);
  await mkdir(d, { recursive: true });
  const rows = ["日付,クリック数,表示回数,CTR,掲載順位"];
  for (let i = 0; i < days; i++) rows.push(`${new Date(Date.parse(`${from}T00:00:00Z`) + i * 86400000).toISOString().slice(0, 10)},${clicks},${impr},${((clicks / impr) * 100).toFixed(2)}%,9`);
  await writeFile(join(d, "チャート.csv"), rows.join("\n") + "\n");
  await writeFile(join(d, "ページ.csv"), "上位のページ,クリック数,表示回数,CTR,掲載順位\n" + (pages ?? [["https://ossalt.jp/a/", 1, 100]]).map(([u, c, i]) => `${u},${c},${i},1%,8`).join("\n") + "\n");
  await writeFile(join(d, "クエリ.csv"), "上位のクエリ,クリック数,表示回数,CTR,掲載順位\nq,1,50,2%,8\n");
  await writeFile(join(d, "デバイス.csv"), "デバイス,クリック数,表示回数,CTR,掲載順位\nPC,10,500,2%,8\n");
  return d;
}

test("register → compare：同じ条件の2期間を比べ、レポートは Git管理外の場所に出る。標準出力に数値を出さない", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cli-"));
  const a = await exportDir(cwd, "a", "2026-10-26", 14, { impr: 120 });
  const b = await exportDir(cwd, "b", "2026-11-09", 14, { impr: 80, pages: [["https://ossalt.jp/a/", 2, 80], ["https://ossalt.jp/c/", 0, 30]] });
  const r1 = run(cwd, "register", "--export", a, "--label", "before", "--from", "2026-10-26", "--to", "2026-11-08", "--property", "sc-domain:ossalt.jp");
  assert.equal(r1.status, 0, r1.stderr);
  const r2 = run(cwd, "register", "--export", b, "--label", "after", "--from", "2026-11-09", "--to", "2026-11-22", "--property", "sc-domain:ossalt.jp");
  assert.equal(r2.status, 0, r2.stderr);
  assert.ok(!/\b1,680\b|\b1\.680\b/.test(r1.stdout + r2.stdout)); // 数値（合計の表示回数）を標準出力に出さない
  const c = run(cwd, "compare", "--before", "before", "--after", "after");
  assert.equal(c.status, 0, c.stderr);
  assert.match(c.stdout, /reports\/seo\/baseline\/compare\.md/);
  assert.ok(!/表示回数|クリック数\s*[:：]/.test(c.stdout));
  const md = await readFile(join(cwd, "reports/seo/baseline/compare.md"), "utf8");
  assert.match(md, /日の位置で並べた推移/);
  assert.match(md, /https:\/\/ossalt\.jp\/c\//);
  assert.match(md, /前だけにあった：0件／後だけにあった：1件/);
});

test("compare：プロパティが違う（または未記録の）2つは、数値を比べず理由を示す", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cli-"));
  const a = await exportDir(cwd, "a", "2026-10-26", 14), b = await exportDir(cwd, "b", "2026-11-09", 14);
  assert.equal(run(cwd, "register", "--export", a, "--label", "before", "--from", "2026-10-26", "--to", "2026-11-08", "--property", "sc-domain:ossalt.jp").status, 0);
  assert.equal(run(cwd, "register", "--export", b, "--label", "after", "--from", "2026-11-09", "--to", "2026-11-22", "--property", "https://ossalt.jp/").status, 0);
  const c = run(cwd, "compare", "--before", "before", "--after", "after");
  assert.equal(c.status, 0, c.stderr);
  assert.match(c.stdout, /比較できなかった項目/);
  const md = await readFile(join(cwd, "reports/seo/baseline/compare.md"), "utf8");
  assert.match(md, /条件がそろっていないため、数値の比較をしていません/);
  assert.match(md, /プロパティが違います/);
  assert.ok(!/日の位置で並べた推移/.test(md));
});

test("register：上書きしない／不正な名前・期間・出力先を拒否する／プロパティ未指定は警告", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cli-"));
  const a = await exportDir(cwd, "a", "2026-10-26", 14);
  const ok = run(cwd, "register", "--export", a, "--label", "x", "--from", "2026-10-26", "--to", "2026-11-08");
  assert.equal(ok.status, 0);
  assert.match(ok.stdout, /プロパティが指定されていません/);
  assert.notEqual(run(cwd, "register", "--export", a, "--label", "x", "--from", "2026-10-26", "--to", "2026-11-08").status, 0);
  assert.match(run(cwd, "register", "--export", a, "--label", "../x", "--from", "2026-10-26", "--to", "2026-11-08").stderr, /--label/);
  assert.match(run(cwd, "register", "--export", a, "--label", "y", "--from", "2027-01-01", "--to", "2027-01-10").stderr, /重なりません/);
  assert.match(run(cwd, "daily", "--export", a, "--a", "2026-10-26..2026-11-01", "--b", "2026-11-02..2026-11-08", "--out", "docs/leak.md").stderr, /Git管理外/);
  assert.match(run(cwd, "bogus").stderr, /使い方/);
});

test("site-snapshot：ビルド結果から構造を記録する（小さすぎる入力は拒否）", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cli-"));
  const out = join(cwd, "out"); await mkdir(join(out, "tools", "x"), { recursive: true });
  await writeFile(join(out, "index.html"), "<html><head><title>T</title></head><body><h1>H</h1></body></html>");
  assert.match(run(cwd, "site-snapshot", "--out-dir", out, "--label", "s").stderr, /小さすぎ/);
  for (let i = 0; i < 12; i++) { await mkdir(join(out, "tools", `p${i}`), { recursive: true }); await writeFile(join(out, "tools", `p${i}`, "index.html"), `<html><head><title>P${i}</title><link rel="canonical" href="https://ossalt.jp/tools/p${i}/"/></head><body><h1>P${i}</h1></body></html>`); }
  await writeFile(join(out, "sitemap.xml"), `<urlset>${Array.from({ length: 12 }, (_, i) => `<url><loc>https://ossalt.jp/tools/p${i}/</loc></url>`).join("")}</urlset>`);
  const r = run(cwd, "site-snapshot", "--out-dir", out, "--label", "s");
  assert.equal(r.status, 0, r.stderr);
  const snap = JSON.parse(await readFile(join(cwd, "reports/seo/baseline/site-s.json"), "utf8"));
  assert.equal(snap.total.sitemap, 12);
  assert.ok(snap.total.indexable >= 12);
});
