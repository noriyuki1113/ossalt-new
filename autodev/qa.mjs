#!/usr/bin/env node
/**
 * Browser QA の実行と証拠の記録。
 *   node autodev/qa.mjs [--sweep] [--grep <text>] [--project desktop|mobile] [--no-build] [--out <dir>]
 * - ビルド済みの out/ を localhost で配信して Playwright を実行する（本番には接続しない）
 * - 認証情報を取り除いた環境変数で実行する
 * - 失敗は、再現手順・対象URL・スクリーンショット・エラーログつきで reports/qa/runs/<id>/ に保存する
 * 終了コード: 0=すべて成功 / 1=失敗あり / 2=実行できなかった
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scrubEnv } from "./lib/security.mjs";
import { extractFailures, renderFailureMarkdown, statsOf } from "./lib/report.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function runQa(opts = {}) {
  const { sweep = false, grep = null, project = null, build = true, outDir = null, label = "qa" } = opts;
  const env = scrubEnv(process.env, { NEXT_PUBLIC_SITE_URL: "https://ossalt.jp", ...(sweep ? { E2E_SWEEP: "1" } : {}) });

  if (build && !existsSync(path.join(root, "out", "index.html"))) {
    console.log("out/ がないためビルドします…");
    const b = spawnSync("npm", ["run", "build"], { cwd: root, env: { ...env, NEXT_TELEMETRY_DISABLED: "1", NODE_OPTIONS: "--max-old-space-size=3000" }, stdio: "inherit" });
    if (b.status !== 0) return { code: 2, error: "ビルドに失敗しました", failures: [], stats: null };
  }

  const resultsFile = path.join(root, "test-results", "results.json");
  rmSync(resultsFile, { force: true });
  const args = ["playwright", "test"];
  if (sweep) args.push("e2e/sweep.spec.ts");
  if (grep) args.push("--grep", grep);
  if (project) args.push("--project", project);
  const r = spawnSync("npx", args, { cwd: root, env, stdio: ["ignore", "inherit", "inherit"] });
  if (!existsSync(resultsFile)) return { code: 2, error: "Playwright の結果ファイルがありません（実行できませんでした）", failures: [], stats: null };

  const json = JSON.parse(readFileSync(resultsFile, "utf8"));
  const failures = extractFailures(json);
  const stats = statsOf(json);

  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${label}`;
  const dir = outDir ?? path.join(root, "reports", "qa", "runs", runId);
  mkdirSync(path.join(dir, "evidence"), { recursive: true });
  failures.forEach((f, i) => {
    for (const key of ["screenshot", "trace", "video"]) {
      if (f[key] && existsSync(f[key])) {
        const dest = path.join(dir, "evidence", `${String(i + 1).padStart(2, "0")}-${f.project}-${key}${path.extname(f[key])}`);
        copyFileSync(f[key], dest);
        f[key] = path.relative(root, dest);
      }
    }
  });
  writeFileSync(path.join(dir, "failures.json"), JSON.stringify(failures, null, 2));
  writeFileSync(path.join(dir, "failures.md"), renderFailureMarkdown(failures));
  const summary = { runId, at: new Date().toISOString(), sweep, grep, project, stats, failed: failures.length };
  writeFileSync(path.join(dir, "summary.json"), JSON.stringify(summary, null, 2));
  return { code: failures.some((f) => !f.flaky) || r.status !== 0 ? 1 : 0, dir: path.relative(root, dir), failures, stats };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = process.argv.slice(2);
  const val = (k) => (a.includes(k) ? a[a.indexOf(k) + 1] : null);
  const res = runQa({ sweep: a.includes("--sweep"), grep: val("--grep"), project: val("--project"), build: !a.includes("--no-build"), outDir: val("--out") });
  if (res.error) console.error(res.error);
  else console.log(`\nQA: 成功 ${res.stats.passed} / 失敗 ${res.stats.failed} / 不安定 ${res.stats.flaky}。記録: ${res.dir}`);
  process.exit(res.code);
}
