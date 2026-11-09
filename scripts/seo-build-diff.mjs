#!/usr/bin/env node
/**
 * 2つのビルドの検索まわりの差分と、重要ページの保証（読み取り専用。ネットワークに接続しない）。
 *
 *   node scripts/seo-build-diff.mjs --after out                      重要ページだけ確認（失敗で終了コード1）
 *   node scripts/seo-build-diff.mjs --before <旧out> --after <新out>  差分も表示（重要ページに問題があれば終了コード1）
 *
 * 旧ビルドは、`git worktree add <dir> <commit>` でその時点のソースを取り出して `next build` すると得られる。
 * 差分は事実の一覧で、検索順位への影響は示さない。
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CRITICAL_PATHS, checkCritical, diffSnapshots, loadSnapshot } from "./seo-build-diff-lib.mjs";

function main(argv) {
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const after = arg("--after");
  if (!after) { console.error("使い方: --after <out> [--before <旧out>]"); return 2; }
  const b = loadSnapshot(path.resolve(after));
  const before = arg("--before");
  if (before) {
    const d = diffSnapshots(loadSnapshot(path.resolve(before)), b);
    const show = (label, list) => console.log(`${label}: ${list.length}件${list.length ? "  " + list.slice(0, 12).join(" ") + (list.length > 12 ? " …" : "") : ""}`);
    console.log(`index可能なページ: ${d.indexable.before} → ${d.indexable.after}`);
    show("消えたページ", d.removed); show("増えたページ", d.added);
    show("index可能→不可", d.becameNoindex); show("index不可→可能", d.becameIndexable);
    show("canonical変更", d.canonicalChanged); show("title変更", d.titleChanged);
    show("サイトマップから外れた", d.sitemapRemoved); show("サイトマップに加わった", d.sitemapAdded);
  }
  const problems = checkCritical(b, CRITICAL_PATHS);
  console.log(`重要ページ ${CRITICAL_PATHS.length}件: 問題 ${problems.length}件`);
  for (const p of problems) console.log(`  ✗ ${p}`);
  return problems.length ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
