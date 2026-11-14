/**
 * 共有用画像（OG）を作るときの日本語フォントの用意（ビルド時だけ使う。サーバー専用）。
 *
 * 依存に入っている @fontsource/zen-kaku-gothic-new（OFL-1.1）は、文字の範囲ごとに
 * 細かく分けたファイル（woff）で配布されている。画像に使う文字を含むファイルだけを読み込む。
 * （next/og の描画は woff2 を読めないため、woff を使う）
 */
import fs from "node:fs";
import path from "node:path";

const PKG_DIR = path.join(process.cwd(), "node_modules", "@fontsource", "zen-kaku-gothic-new");

export type FontSubset = { file: string; ranges: Array<[number, number]> };

/** CSSの unicode-range（U+3000-303f,U+30a0 など）を、[開始, 終了] の配列にする */
export function parseUnicodeRange(s: string): Array<[number, number]> {
  return s.split(",").map((part) => {
    const m = part.trim().replace(/^U\+/i, "");
    const [a, b] = m.split("-");
    if (m.includes("?")) {
      return [parseInt(m.replace(/\?/g, "0"), 16), parseInt(m.replace(/\?/g, "f"), 16)] as [number, number];
    }
    const lo = parseInt(a, 16);
    return [lo, b ? parseInt(b, 16) : lo] as [number, number];
  }).filter(([lo, hi]) => Number.isFinite(lo) && Number.isFinite(hi));
}

/** fontsource のCSS（例: 700.css）から、woff のファイル名と範囲を取り出す */
export function parseFontsourceCss(css: string): FontSubset[] {
  const out: FontSubset[] = [];
  for (const block of css.split("@font-face").slice(1)) {
    const file = block.match(/url\(\.\/files\/([^)]+\.woff)\)\s*format\('woff'\)/)?.[1];
    const range = block.match(/unicode-range:\s*([^;]+);/)?.[1];
    if (file && range) out.push({ file, ranges: parseUnicodeRange(range) });
  }
  return out;
}

/** text の文字を含むファイルだけを選ぶ（同じファイルは1回） */
export function subsetsFor(text: string, subsets: FontSubset[]): FontSubset[] {
  const picked = new Set<FontSubset>();
  for (const ch of new Set(Array.from(text))) {
    const cp = ch.codePointAt(0)!;
    const hit = subsets.find((s) => s.ranges.some(([lo, hi]) => cp >= lo && cp <= hi));
    if (hit) picked.add(hit);
  }
  return subsets.filter((s) => picked.has(s));
}

const cache = new Map<string, Buffer>();
let subsetsByWeight: Map<number, FontSubset[]> | null = null;

function subsetsOf(weight: number): FontSubset[] {
  subsetsByWeight ??= new Map();
  let list = subsetsByWeight.get(weight);
  if (!list) {
    list = parseFontsourceCss(fs.readFileSync(path.join(PKG_DIR, `${weight}.css`), "utf8"));
    subsetsByWeight.set(weight, list);
  }
  return list;
}

/**
 * next/og（ImageResponse）の fonts に渡す形で、text に必要なフォントを返す。
 * 描画は、同じ名前の複数のフォントの間では文字を探し直さないため、分割したファイルごとに
 * 別の名前を付け、family（CSSの font-family に渡す並び）で全部を指定する。
 */
export function ogFonts(text: string, weight: 400 | 700 | 900 = 700) {
  const fonts = subsetsFor(text, subsetsOf(weight)).map((s, i) => {
    let data = cache.get(s.file);
    if (!data) {
      data = fs.readFileSync(path.join(PKG_DIR, "files", s.file));
      cache.set(s.file, data);
    }
    return { name: `ZenKaku${weight}-${i}`, data, weight, style: "normal" as const };
  });
  return { fonts, family: fonts.map((f) => f.name).join(", ") };
}
