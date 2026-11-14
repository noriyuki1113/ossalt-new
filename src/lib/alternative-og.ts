/**
 * 代替ページの共有用画像（OG）に入れる文言。掲載データ（SaaSの名前・候補の件数・候補の名前）だけから作る。
 */
export const ALT_OG_SIZE = { width: 1200, height: 630 } as const;

/** 共有用画像の、サイト内のパス */
export function alternativeOgPath(slug: string): string {
  return `/og/alternatives/${slug}/image.png`;
}

export function alternativeOgText(saas: string, toolNames: string[]) {
  const eyebrow = "オープンソースの代替を比較";
  const top3 = toolNames.slice(0, 3);
  const top = top3.length
    ? `健全度の上位：${top3.join("・")}${toolNames.length > top3.length ? " ほか" : ""}`
    : "";
  // SaaSの名前が長いときは、見出しの文字を小さくして2行に収める
  const len = Array.from(saas).length;
  const titleSize = len <= 8 ? 84 : len <= 14 ? 72 : 60;
  const count = String(toolNames.length);
  return {
    eyebrow, saas, top, count, titleSize,
    /** フォントの読み込みに使う、画像の中のすべての文字 */
    allText: [eyebrow, saas, "の代わりになるOSS", "候補", count, "件を比較", top, "ossalt", ".jp"].join(""),
  };
}
