#!/usr/bin/env node
/**
 * 失敗の調査（Claude Browser Use 相当）。読み取り専用のエージェントに、失敗レポートと probe.mjs を使わせ、
 * 原因の仮説と直す場所を autodev/out/investigation-<id>.md に書かせる。
 *   node autodev/explore.mjs --failures <failures.md> [--id AD-001] [--agent dry-run|claude]
 * 編集系のツール（Edit/Write）は与えない。Bash は bash-guard の許可リストを通る。
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { agentEnv } from "./lib/security.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function explore({ failuresMd, id = "adhoc", agent = "dry-run", maxCostUsd = 1, model = null }) {
  const prompt = `${readFileSync(path.join(root, "autodev", "prompts", "explore_prompt.md"), "utf8")}\n## 失敗レポート\n${failuresMd}\n`;
  const out = path.join(root, "autodev", "out");
  mkdirSync(out, { recursive: true });
  writeFileSync(path.join(out, "explore-prompt.md"), prompt);
  if (agent !== "claude") return { ok: true, costUsd: 0, text: "(dry-run: プロンプトを autodev/out/explore-prompt.md に書き出しました)" };
  const r = spawnSync("claude", [
    "-p", prompt, "--output-format", "json", "--max-budget-usd", String(maxCostUsd),
    "--settings", path.join(root, "autodev", "claude-settings.json"),
    "--allowedTools", "Read", "Glob", "Grep", "Bash",
    "--disallowedTools", "Edit", "Write", "NotebookEdit",
    ...(model ? ["--model", model] : []),
  ], { cwd: root, env: agentEnv(process.env), encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  try {
    const j = JSON.parse(r.stdout);
    const text = String(j.result ?? "");
    writeFileSync(path.join(out, `investigation-${id}.md`), text);
    return { ok: !j.is_error, costUsd: Number(j.total_cost_usd ?? 0), text };
  } catch {
    return { ok: false, costUsd: 0, text: `調査の出力を読めませんでした（終了コード ${r.status}）` };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = process.argv.slice(2);
  const val = (k) => (a.includes(k) ? a[a.indexOf(k) + 1] : null);
  if (!val("--failures")) { console.error("使い方: node autodev/explore.mjs --failures <failures.md> [--id AD-001] [--agent claude]"); process.exit(2); }
  const res = explore({ failuresMd: readFileSync(val("--failures"), "utf8"), id: val("--id") ?? "adhoc", agent: val("--agent") ?? "dry-run" });
  console.log(res.text);
  process.exit(res.ok ? 0 : 1);
}
