#!/usr/bin/env node
/**
 * ビルドの再試行（Google Fonts の一時的な取得エラー専用）。
 *
 * next/font/google は、ビルド時に fonts.googleapis.com / fonts.gstatic.com から取得する。
 * CI のランナーで取得に失敗すると、コードに関係なくビルドが落ちる（2026-11-01〜03 に3回）。
 * そのときだけ、最大3回まで、同じコマンドを再実行する。ほかの失敗（型・テスト・コードの問題）は再試行しない。
 *
 *   node scripts/build-retry.mjs <コマンド> [引数...]    例: node scripts/build-retry.mjs npm run build
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const MAX_ATTEMPTS = 3;
export const WAIT_SECONDS = [0, 15, 45];

/** フォント取得の一時的な失敗か。出力に、フォントの取得元と失敗の語が両方あるときだけ true */
export function isFontFetchFailure(output) {
  const text = String(output ?? '');
  const fontRelated = /next\/font|internal\/font\/google|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(text);
  const fetchFailed = /Failed to fetch|Failed to download|module-not-found|ECONN|ETIMEDOUT|ENOTFOUND|fetch failed/i.test(text);
  return fontRelated && fetchFailed;
}

function run(cmd, args) {
  return new Promise((done) => {
    let out = '';
    const child = spawn(cmd, args, { stdio: ['inherit', 'pipe', 'pipe'], shell: false });
    const tee = (stream, sink) => stream.on('data', (d) => { out = (out + d).slice(-200000); sink.write(d); });
    tee(child.stdout, process.stdout);
    tee(child.stderr, process.stderr);
    child.on('close', (code) => done({ code: code ?? 1, out }));
    child.on('error', (e) => done({ code: 1, out: String(e) }));
  });
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (!cmd) { console.error('使い方: node scripts/build-retry.mjs <コマンド> [引数...]'); process.exit(2); }
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { code, out } = await run(cmd, args);
    if (code === 0) return;
    if (attempt === MAX_ATTEMPTS || !isFontFetchFailure(out)) process.exit(code);
    const wait = WAIT_SECONDS[attempt] ?? 45;
    console.error(`\n[build-retry] Google Fonts の取得に失敗したため、${wait}秒後に再試行します（${attempt}/${MAX_ATTEMPTS}）`);
    await new Promise((r) => setTimeout(r, wait * 1000));
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
