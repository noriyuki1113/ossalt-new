#!/usr/bin/env node
/**
 * 同梱フォントの @font-face（src/app/fonts.css）を、@fontsource のパッケージから生成する。
 *
 *   node scripts/gen-fonts-css.mjs          # src/app/fonts.css を書き出す
 *   node scripts/gen-fonts-css.mjs --check  # 生成物が最新か確認する（違えば終了コード1）
 *
 * 背景：next/font/google はビルドのたびに fonts.googleapis.com / fonts.gstatic.com から取得し、取得に失敗するとビルドが落ちた。
 * @fontsource（OFL-1.1のフォントを npm で配布）から同じ分割（unicode-range のスライス）を読み、外部への取得をなくす。
 * 以前の設定（next/font/google）と同じにしている点：
 *  - 太さ：Noto Sans JP 100〜900（可変。使うのは400/500/700）、Zen Kaku Gothic New 700/900、JetBrains Mono 400/700
 *  - font-display: optional（読み込みが間に合わなければ代替フォントのまま。表示のずれ＝CLSを出さない）
 * 変えている点：woff（旧形式）の予備は外し、woff2 のみにする（出力サイズが二重になるのを避ける。woff2は全主要ブラウザが対応）。
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Noto Sans JP は可変フォント（1ファイルで全太さ。Googleの配信と同じ形で、スライスごとに1ファイル）。
// 静的ファイルだと太さごとに別ファイルになり、1ページで読むファイルが増える。Zen Kaku Gothic New は元から静的。
export const FONTS = [
  { dir: "@fontsource-variable/noto-sans-jp", pkg: "noto-sans-jp", files: ["wght.css"], rename: ["Noto Sans JP Variable", "Noto Sans JP"] },
  { dir: "@fontsource/zen-kaku-gothic-new", pkg: "zen-kaku-gothic-new", files: ["700.css", "900.css"] },
  { dir: "@fontsource/jetbrains-mono", pkg: "jetbrains-mono", files: ["400.css", "700.css"] },
];
export const OUT = "src/app/fonts.css";

/** fontsource の1つの weight.css を、optional・woff2のみ・src/app からの相対パスに書き換える */
export function convert(css, dir, rename = null) {
  let n = 0;
  const out = css.replace(/@font-face\s*\{[^}]*\}/g, (block) => {
    n++;
    let b = block
      .replace(/font-display:\s*swap;/, "font-display: optional;")
      .replace(/src:\s*url\(\.\/files\/([^)]+\.woff2)\)\s*format\('(woff2(?:-variations)?)'\)(?:\s*,\s*url\([^)]+\)\s*format\('woff'\))?;/, (_, f, fmt) => `src: url(../../node_modules/${dir}/files/${f}) format("${fmt}");`);
    if (rename) b = b.replace(`font-family: '${rename[0]}'`, `font-family: '${rename[1]}'`);
    return b;
  });
  const converted = (out.match(/src:\s*url\(\.\.\/\.\.\/node_modules\//g) ?? []).length;
  if (converted !== n || /swap|\.woff\)|\.\/files\/|Variable'/.test(out)) throw new Error(`${dir}: 想定外の @font-face の形です。生成を中止します（fontsource の形式が変わった可能性）`);
  return { css: out, count: n };
}

export async function generate(root = ".") {
  const parts = [
    "/* このファイルは scripts/gen-fonts-css.mjs が @fontsource から生成します。直接編集しないでください。",
    "   フォント：Noto Sans JP・Zen Kaku Gothic New・JetBrains Mono（いずれも SIL Open Font License 1.1）。",
    "   生成：node scripts/gen-fonts-css.mjs ／ 最新か確認：node scripts/gen-fonts-css.mjs --check */",
  ];
  const stats = [];
  for (const { dir, pkg, files, rename = null } of FONTS) {
    for (const file of files) {
      const css = await readFile(resolve(root, "node_modules", dir, file), "utf8");
      const { css: c, count } = convert(css, dir, rename);
      parts.push(c.trim());
      stats.push({ pkg, weight: file.replace(".css", ""), faces: count });
    }
  }
  return { text: parts.join("\n") + "\n", stats };
}

async function main() {
  const check = process.argv.includes("--check");
  const { text, stats } = await generate();
  if (check) {
    const cur = await readFile(resolve(OUT), "utf8").catch(() => "");
    if (cur !== text) { console.error(`${OUT} が最新ではありません。node scripts/gen-fonts-css.mjs を実行してください`); process.exitCode = 1; }
    else console.log(`${OUT} は最新です`);
    return;
  }
  await writeFile(resolve(OUT), text, "utf8");
  console.log(`${OUT} を生成しました（${stats.map((s) => `${s.pkg} ${s.weight}: ${s.faces}`).join("、")}）`);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main().catch((e) => { console.error(e.message); process.exitCode = 1; });
