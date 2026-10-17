#!/usr/bin/env node
// Claude Code の PreToolUse フック。Bash コマンドを security.mjs の許可リストで検査し、
// 拒否するときは exit code 2 と理由（stderr）を返す。
import { bashCheck } from "../lib/security.mjs";

let raw = "";
process.stdin.on("data", (d) => (raw += d));
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(raw);
    if (input.tool_name !== "Bash") process.exit(0);
    const r = bashCheck(input.tool_input?.command);
    if (r.ok) process.exit(0);
    process.stderr.write(`autodev: ブロックしました — ${r.reason}\n`);
    process.exit(2);
  } catch (e) {
    process.stderr.write(`autodev: フックの入力を読めませんでした（安全のため拒否）: ${e.message}\n`);
    process.exit(2);
  }
});
