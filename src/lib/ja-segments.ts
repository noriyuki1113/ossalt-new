/** 日本語の短い文を、語に分ける（句読点・閉じ括弧は直前の語に付ける）。見出し・導入文の折り返し用。 */
export function jaSegments(text: string): string[] {
  const out: string[] = [];
  for (const s of new Intl.Segmenter("ja", { granularity: "word" }).segment(text)) {
    // 句読点・閉じ括弧は、直前の語に付ける（行頭に来ないようにする）
    if (out.length > 0 && /^[、。，．）」』】〕！？!?,.)\]]+$/.test(s.segment)) out[out.length - 1] += s.segment;
    else out.push(s.segment);
  }
  return out;
}
