/**
 * 転送用ページ（掲載をやめたページの行き先）の組み立て（純粋関数のみ）
 * 即時に移動するページ（meta refresh）に、転送先を正規のURLとして示す。
 */
const BASE = "https://ossalt.jp";

const escape = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

export function redirectHtml(to) {
  const url = `${BASE}${to}`;
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ページは移動しました | ossalt.jp</title>
<link rel="canonical" href="${escape(url)}">
<meta http-equiv="refresh" content="0; url=${escape(to)}">
</head>
<body>
<p>このページは移動しました。<a href="${escape(to)}">移動先のページを開く</a></p>
</body>
</html>
`;
}

/** 転送元・転送先の形式を確認する。問題があれば文字列の配列で返す */
export function validateRedirects(map) {
  const errors = [];
  for (const [from, to] of Object.entries(map)) {
    for (const [label, p] of [["転送元", from], ["転送先", to]]) {
      if (!/^\/[a-z0-9\-_/]*\/$/.test(p)) errors.push(`${label}の形式が不正です（/で始まり/で終わる）: ${p}`);
    }
    if (from === to) errors.push(`転送元と転送先が同じです: ${from}`);
    if (map[to]) errors.push(`転送先がさらに転送されます（二重の転送）: ${from} → ${to}`);
  }
  return errors;
}
