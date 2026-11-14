/** 日時を日本時間の「YYYY/MM/DD HH:mm」で表す。読めない値は「未確認」（ブラウザでも使えるよう、fs を使うモジュールから分けている） */
export function activityDateJst(input: string): string {
  const date = new Date(input);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
      }).format(date)
    : "未確認";
}
