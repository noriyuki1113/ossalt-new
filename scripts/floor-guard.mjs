#!/usr/bin/env node
/**
 * CONSTRAINTS.md の基準を、変更の差分から見張る（読み取り専用。ネットワークに接続しない。手動で実行する）。
 *
 *   node scripts/floor-guard.mjs [--base <ref>] [--strict]
 *   npm run guard:floor
 *
 *   --base    比較の基準（既定: origin/HEAD → origin/claude/ossalt-jp-setup-deploy-tsv3x8 → origin/main の順に探す）
 *   --strict  「弱める可能性が高い」変更があれば、終了コード1にする（既定は表示だけで、終了コード0）
 *
 * 終了コード: 0＝表示のみ／問題なし、1＝--strict で、弱める可能性が高い変更あり、2＝実行できない（git が使えない・基準が無い等）。
 * 2 を 0 と読み違えないこと。判定の中身は scripts/floor-guard-lib.mjs。
 * 考え方は agent-skills（MIT）の constraint-driven-development。実装はOSSALT向けに書き直したもの。
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { analyzeDiff, exitCodeFor, formatReport } from "./floor-guard-lib.mjs";

const git = (args, { allowDiffExit = false } = {}) => {
  try {
    return execFileSync("git", args, { encoding: "utf8", maxBuffer: 512 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    // `git diff --no-index` は、差があると終了コード1を返す（新規ファイルでは通常）。出力は使う。
    if (allowDiffExit && e.status === 1 && typeof e.stdout === "string") return e.stdout;
    return null;
  }
};

export function main(argv) {
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const strict = argv.includes("--strict");
  const bail = (m) => { console.error(`floor-guard: ${m}`); return 2; };

  const top = git(["rev-parse", "--show-toplevel"])?.trim();
  if (!top) return bail("git の作業ツリーの中で実行してください");
  process.chdir(top);

  const candidates = arg("--base") ? [arg("--base")] : ["origin/HEAD", "origin/claude/ossalt-jp-setup-deploy-tsv3x8", "origin/main"];
  let base = null, mergeBase = null;
  for (const c of candidates) {
    const mb = git(["merge-base", c, "HEAD"])?.trim();
    if (mb) { base = c; mergeBase = mb; break; }
  }
  if (!mergeBase) return bail(`比較の基準が見つかりません（${candidates.join(", ")}）。git fetch するか、--base を指定してください`);

  const tracked = git(["diff", "--unified=0", mergeBase, "--"]);
  if (tracked === null) return bail("差分を取得できませんでした");
  const others = git(["ls-files", "--others", "--exclude-standard"]);
  if (others === null) return bail("未追跡ファイルを取得できませんでした");
  const untracked = others.split("\n").filter(Boolean).map((f) => {
    const d = git(["diff", "--no-index", "--unified=0", "--", "/dev/null", f], { allowDiffExit: true });
    return d ?? "";
  }).join("\n");

  const findings = analyzeDiff(`${tracked}\n${untracked}`);
  console.log(formatReport(findings, { base, strict }));
  return exitCodeFor(findings, { strict });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
