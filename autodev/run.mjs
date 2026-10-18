#!/usr/bin/env node
/**
 * OSSALT Autonomous Dev System — 実行ループ
 *   タスク選択 → 実装（Coding Agent）→ 単体テスト → ビルド → Browser QA → 不合格なら失敗を渡して修正 → 再検証
 *   → 合格したらコミット（autodev/ ブランチ）→（--push で）ブランチを push → PR本文を生成
 *
 * 使い方:  node autodev/run.mjs [--agent dry-run|claude|none] [--task AD-001] [--max-iterations N] [--max-cost USD] [--push]
 *   --agent dry-run  （既定）プロンプトを書き出すだけ。AIは呼ばない。
 *   --agent claude   claude CLI（-p）で Coding Agent を実行。ANTHROPIC_API_KEY などが必要。
 *   --agent none     エージェントを呼ばず、今の変更を検証だけする（人が書いた変更の検証用）。
 * 絶対にしないこと：main・公開用ブランチへのコミット/push、マージ、本番への書き込み、PRの自動マージ。
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateTasks, selectNextTask, updateTask, summarize } from "./lib/tasks.mjs";
import { resolveLimits, checkBudget, errorSignature, recordOutcome, newRunState } from "./lib/budget.mjs";
import { scrubEnv, agentEnv } from "./lib/security.mjs";
import { renderPrBody } from "./lib/pr.mjs";
import { runQa } from "./qa.mjs";
import { explore } from "./explore.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const P = (...p) => path.join(root, ...p);
// テスト・検証用に、タスクと状態のファイルを差し替えられる（上限や安全装置は変えられない）
const argVal = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null);
const TASKS = argVal("--tasks-file") ? path.resolve(argVal("--tasks-file")) : P("autodev", "tasks.json");
const STATE = argVal("--state-file") ? path.resolve(argVal("--state-file")) : P("autodev", "state.json");
const PROGRESS = P("autodev", "progress.md");
const OUT = P("autodev", "out");

const readJson = (f, fb) => (existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : fb);
const writeJson = (f, v) => writeFileSync(f, JSON.stringify(v, null, 2) + "\n");
const log = (...a) => console.log("[autodev]", ...a);

function sh(cmd, args, { env = scrubEnv(process.env), input } = {}) {
  const r = spawnSync(cmd, args, { cwd: root, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, input });
  return { code: r.status ?? 1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}
const git = (...a) => sh("git", a);
const tail = (s, n = 40) => s.split("\n").slice(-n).join("\n");

// ---------- 検証 ----------
function verify(task) {
  const kinds = new Set(task.verification.map((v) => v.kind));
  const steps = [];
  const result = { steps, e2e: null, evidenceDir: null, notes: [], failureMd: null, errorText: null };
  const fail = (name, detail, errorText, failureMd = null) => {
    steps.push({ name, ok: false, detail });
    result.ok = false;
    result.errorText = errorText;
    result.failureMd = failureMd ?? "```\n" + tail(errorText, 60) + "\n```";
    return result;
  };

  const unit = sh("npm", ["test"]);
  const m = unit.out.match(/# pass (\d+)/);
  if (unit.code !== 0) return fail("単体テスト（npm test）", "失敗", unit.out);
  steps.push({ name: "単体テスト（npm test）", ok: true, detail: `${m?.[1] ?? "?"}件 合格` });

  if (kinds.has("build") || kinds.has("e2e") || kinds.has("sweep")) {
    const b = sh("npm", ["run", "build"], { env: scrubEnv(process.env, { NEXT_PUBLIC_SITE_URL: "https://ossalt.jp", NEXT_TELEMETRY_DISABLED: "1", NODE_OPTIONS: "--max-old-space-size=3000" }) });
    // ビルドが生成データを書き換えても、本番データは変えない
    git("checkout", "--", "public/data", "data-source");
    if (b.code !== 0) return fail("ビルド（npm run build）", "失敗", b.out);
    steps.push({ name: "ビルド（npm run build）", ok: true, detail: "成功" });
  }

  for (const v of task.verification.filter((x) => x.kind === "e2e")) {
    const q = runQa({ grep: v.grep ?? null, build: false, label: `${task.id}-targeted` });
    result.evidenceDir = q.dir ?? result.evidenceDir;
    if (q.code !== 0) return fail(`ブラウザ検証（${v.grep ?? "全体"}）`, `失敗 ${q.failures?.length ?? "?"}件`, q.error ?? q.failures.map((f) => `${f.title}: ${f.error}`).join("\n"), q.failures?.length ? readFileSync(P(q.dir, "failures.md"), "utf8") : null);
    steps.push({ name: `ブラウザ検証（${v.grep ?? "全体"}）`, ok: true, detail: `成功 ${q.stats.passed}` });
  }

  if (kinds.has("sweep")) {
    const q = runQa({ sweep: true, build: false, label: `${task.id}-sweep` });
    result.evidenceDir = q.dir ?? result.evidenceDir;
    if (q.code !== 0) return fail("巡回（sweep）", `失敗 ${q.failures?.length ?? "?"}件`, q.error ?? q.failures.map((f) => `${f.title}: ${f.error}`).join("\n"), q.failures?.length ? readFileSync(P(q.dir, "failures.md"), "utf8") : null);
    steps.push({ name: "巡回（sweep・デスクトップ＋スマホ）", ok: true, detail: `成功 ${q.stats.passed}` });
  }

  if (kinds.has("e2e") || kinds.has("sweep")) {
    // 回帰テスト：修正のたびに、既存の全E2Eを実行する
    const q = runQa({ build: false, label: `${task.id}-regression` });
    result.evidenceDir = q.dir ?? result.evidenceDir;
    if (q.code !== 0) return fail("回帰テスト（全E2E）", `失敗 ${q.failures?.length ?? "?"}件`, q.error ?? q.failures.map((f) => `${f.title}: ${f.error}`).join("\n"), q.failures?.length ? readFileSync(P(q.dir, "failures.md"), "utf8") : null);
    result.e2e = q.stats;
    steps.push({ name: "回帰テスト（全E2E・デスクトップ＋スマホ）", ok: true, detail: `成功 ${q.stats.passed}` });
  }
  result.ok = true;
  return result;
}

// ---------- エージェント ----------
function buildPrompt(task, taskState) {
  const base = readFileSync(P("autodev", "prompts", "coding_prompt.md"), "utf8");
  const tail = taskState?.lastFailure
    ? `\n\n## 前回の失敗（再現手順・対象URL・エラー）\n${taskState.lastFailure}\n\n同じ操作を直したあと、同じテストが通ることを確かめてください。`
    : "";
  return `${base}\n\n## タスク\n- ID: ${task.id}\n- 優先度: ${task.priority}\n- 対象機能: ${task.feature}\n- 題名: ${task.title}\n- 受け入れ条件:\n${task.acceptance.map((a) => `  - ${a}`).join("\n")}\n- 検証方法: ${JSON.stringify(task.verification)}\n${tail}\n`;
}

function runAgent(kind, prompt, { limits, model }) {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, "last-prompt.md"), prompt);
  if (kind !== "claude") return { ok: true, costUsd: 0, text: kind === "dry-run" ? "(dry-run: プロンプトを autodev/out/last-prompt.md に書き出しました)" : "(agent なし)" };
  const args = [
    "-p", prompt,
    "--output-format", "json",
    "--max-budget-usd", String(limits.maxCostUsdPerSession),
    "--permission-mode", "acceptEdits",
    "--settings", P("autodev", "claude-settings.json"),
    "--allowedTools", "Read", "Edit", "Write", "Glob", "Grep", "Bash",
    ...(model ? ["--model", model] : []),
  ];
  const r = spawnSync("claude", args, { cwd: root, env: agentEnv(process.env), encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  try {
    const j = JSON.parse(r.stdout);
    return { ok: !j.is_error && r.status === 0, costUsd: Number(j.total_cost_usd ?? 0), text: String(j.result ?? "") };
  } catch {
    return { ok: false, costUsd: 0, text: `claude の出力を読めませんでした（終了コード ${r.status}）\n${tail(`${r.stdout}\n${r.stderr}`, 20)}` };
  }
}

// ---------- 本体 ----------
function main() {
  const a = process.argv.slice(2);
  const val = (k) => (a.includes(k) ? a[a.indexOf(k) + 1] : null);
  const agentKind = val("--agent") ?? "dry-run";
  if (!["dry-run", "claude", "none"].includes(agentKind)) throw new Error(`--agent は dry-run / claude / none`);
  const config = readJson(P("autodev", "config.json"), {});
  const overrides = {};
  if (val("--max-iterations")) overrides.maxIterations = val("--max-iterations");
  if (val("--max-cost")) overrides.maxCostUsd = val("--max-cost");
  const limits = resolveLimits(config, overrides);
  const protectedBranches = config.protectedBranches ?? ["main", "master"];
  const prefix = config.branchPrefix ?? "autodev/";

  let doc = readJson(TASKS);
  const problems = validateTasks(doc);
  if (problems.length) { console.error("tasks.json に問題があります:\n- " + problems.join("\n- ")); process.exit(2); }

  let state = readJson(STATE, { tasks: {} });
  let run = newRunState();
  log(`上限: ${JSON.stringify(limits)}`);
  log(`タスク: ${JSON.stringify(summarize(doc))}`);

  for (;;) {
    const stop = checkBudget(limits, run);
    if (stop.stop) { log(`停止: ${stop.reason}`); break; }

    const task = a.includes("--task") ? doc.tasks.find((t) => t.id === val("--task")) : selectNextTask(doc, { maxAttempts: limits.maxAttemptsPerTask });
    if (!task || ["passed", "blocked"].includes(task.status) || task.attempts >= limits.maxAttemptsPerTask) { log("着手できるタスクがありません。"); break; }

    // ブランチ：公開用のブランチには絶対にコミットしない
    const branch = `${prefix}${task.id}`;
    const cur = git("rev-parse", "--abbrev-ref", "HEAD").out.trim();
    if (cur !== branch) {
      if (protectedBranches.includes(cur) || !cur.startsWith(prefix)) {
        if (git("status", "--porcelain").out.trim()) { console.error(`未コミットの変更があるため、ブランチを切り替えません（現在: ${cur}）。先に整理してください。`); process.exit(2); }
      }
      const exists = git("rev-parse", "--verify", branch).code === 0;
      const sw = git(...(exists ? ["checkout", branch] : ["checkout", "-b", branch]));
      if (sw.code !== 0) { console.error(sw.out); process.exit(2); }
    }
    if (protectedBranches.includes(git("rev-parse", "--abbrev-ref", "HEAD").out.trim())) { console.error("保護されたブランチ上では実行しません。"); process.exit(2); }

    run = { ...run, iterations: run.iterations + 1 };
    const ts = state.tasks[task.id] ?? { firstFailure: null, lastFailure: null, lastSignature: null, repeats: 0 };
    log(`セッション ${run.iterations}/${limits.maxIterations}：${task.id} ${task.title}（試行 ${task.attempts + 1}/${limits.maxAttemptsPerTask}）`);
    if (agentKind !== "dry-run") {
      doc = updateTask(doc, task.id, { status: "in_progress", attempts: task.attempts + 1 });
      writeJson(TASKS, doc);
    }

    const ag = runAgent(agentKind, buildPrompt(task, ts), { limits, model: config.model });
    run = { ...run, costUsd: run.costUsd + ag.costUsd };
    log(`エージェント: ${ag.ok ? "完了" : "失敗"}（約$${ag.costUsd.toFixed(2)}）`);
    if (agentKind === "dry-run") { log(ag.text); break; }

    const v = ag.ok ? verify(task) : { ok: false, steps: [{ name: "エージェント", ok: false, detail: "失敗" }], errorText: ag.text, failureMd: "```\n" + ag.text + "\n```" };
    if (v.ok) {
      // Agent 自身がコミットした変更も含めるため、HEAD ではなく、ベースブランチとの差分で数える
      const base = config.baseBranch ? `origin/${config.baseBranch}` : "HEAD";
      const files = [...new Set([
        ...git("diff", "--name-only", `${base}...HEAD`).out.split("\n"),
        ...git("diff", "--name-only", "HEAD").out.split("\n"),
        ...git("ls-files", "--others", "--exclude-standard").out.split("\n"),
      ])].filter((f) => f && !f.startsWith("autodev/out/") && f !== "autodev/state.json");
      // Agent の報告（確かめていないこと・残課題を含む）を、既知の制約としてPR本文に残す
      v.notes = ag.text ? [`エージェントの報告（原文）：${ag.text.replace(/\s+/g, " ").slice(0, 800)}`] : ["（エージェントの報告なし）"];
      const evidence = v.evidenceDir ?? "unit/build only";
      doc = updateTask(doc, task.id, { status: "passed", lastResult: { at: new Date().toISOString(), summary: v.steps.map((s) => `${s.name}: ${s.detail}`).join(" / "), evidence } });
      state.tasks[task.id] = { ...ts, lastFailure: null, lastSignature: null, repeats: 0 };
      run = recordOutcome(run, { ok: true });
      appendFileSync(PROGRESS, `\n## ${new Date().toISOString()} ${task.id} 合格\n- ${v.steps.map((s) => `${s.name}: ${s.detail}`).join("\n- ")}\n- 証拠: ${evidence}\n`);
      writeJson(TASKS, doc); writeJson(STATE, state);
      mkdirSync(OUT, { recursive: true });
      const body = renderPrBody({ task, branch, files, verification: v, before: ts.firstFailure, after: v.steps.map((s) => `- ${s.name}: ${s.detail}`).join("\n"), limits, costUsd: run.costUsd });
      writeFileSync(path.join(OUT, `PR_BODY-${task.id}.md`), body);
      git("add", "-A");
      const c = git("commit", "-m", `autodev(${task.id}): ${task.title}`);
      log(c.code === 0 ? `コミットしました（${branch}）` : `コミットなし: ${tail(c.out, 3)}`);
      if (a.includes("--push")) {
        if (!branch.startsWith(prefix)) throw new Error("autodev/ 以外のブランチは push しません");
        const p = git("push", "-u", "origin", branch);
        log(p.code === 0 ? `push しました。PR本文: autodev/out/PR_BODY-${task.id}.md（PRの作成とマージは人が行います）` : `push 失敗: ${tail(p.out, 5)}`);
      } else log(`PR本文: autodev/out/PR_BODY-${task.id}.md（push は --push、PR作成・マージは人が行います）`);
      if (a.includes("--task")) break;
      continue;
    }

    // 不合格：失敗を記録し、同じエラーが続けば停止する
    const sig = errorSignature(v.errorText ?? "");
    run = recordOutcome({ ...run, lastSignature: ts.lastSignature, sameErrorRepeats: ts.repeats }, { ok: false, signature: sig });
    const failedStep = v.steps.find((s) => !s.ok)?.name ?? "不明";
    state.tasks[task.id] = { firstFailure: ts.firstFailure ?? `${failedStep}\n${v.failureMd}`, lastFailure: `${failedStep}\n${v.failureMd}`, lastSignature: sig, repeats: run.sameErrorRepeats };
    // 2回目以降の同じタスクの失敗では、読み取り専用の調査（probe.mjs で実ブラウザを確認）を1回だけ行い、原因の仮説を渡す
    if (agentKind === "claude" && config.exploreOnFailure !== false && task.attempts >= 1 && run.costUsd < limits.maxCostUsd) {
      const ex = explore({ failuresMd: state.tasks[task.id].lastFailure, id: task.id, agent: "claude", maxCostUsd: Math.min(1, limits.maxCostUsdPerSession), model: config.model });
      run = { ...run, costUsd: run.costUsd + ex.costUsd };
      if (ex.ok && ex.text) state.tasks[task.id].lastFailure += `\n\n### 調査担当の報告（原因の仮説）\n${ex.text}`;
    }
    const attempts = task.attempts + 1;
    const blocked = run.sameErrorRepeats >= limits.maxSameErrorRepeats || attempts >= limits.maxAttemptsPerTask;
    doc = updateTask(doc, task.id, { status: blocked ? "blocked" : "failed", lastResult: { at: new Date().toISOString(), summary: `${failedStep}で失敗`, evidence: v.evidenceDir ?? null } });
    writeJson(TASKS, doc); writeJson(STATE, state);
    appendFileSync(PROGRESS, `\n## ${new Date().toISOString()} ${task.id} 不合格（${failedStep}）\n- 同じエラーの連続: ${run.sameErrorRepeats}回\n`);
    if (blocked) {
      mkdirSync(OUT, { recursive: true });
      const f = path.join(OUT, `STOP-${task.id}.md`);
      writeFileSync(f, `# ${task.id} を停止しました\n\n- 理由: ${run.sameErrorRepeats >= limits.maxSameErrorRepeats ? `同じエラーが${run.sameErrorRepeats}回続いた` : `試行回数の上限（${limits.maxAttemptsPerTask}）`}\n- 失敗した手順: ${failedStep}\n- 証拠: ${v.evidenceDir ?? "（なし）"}\n\n## ログ\n${state.tasks[task.id].lastFailure}\n\n人が原因を確かめてから、tasks.json の status を todo、attempts を 0 に戻し、autodev/state.json の該当タスクを消して再開してください。\n`);
      log(`停止: ${task.id}。原因とログ: ${path.relative(root, f)}`);
      process.exitCode = 1;
      break;
    }
    log(`不合格（${failedStep}）。失敗の内容を次のセッションに渡します。`);
  }
  log(`終了。セッション ${run.iterations}、AI利用額 約$${run.costUsd.toFixed(2)}、タスク: ${JSON.stringify(summarize(doc))}`);
}

main();
