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

/**
 * Cloudflare Pages用HTTP 301のルール。
 * 静的アセットが存在しても _redirects が先に評価される。
 * GitHub Pages等では従来のmeta refresh HTMLがフォールバックとなる。
 */
export function cloudflarePagesRedirects(map) {
  const errors = validateRedirects(map);
  if (errors.length) throw new Error(errors.join("\n"));
  const entries = Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length > 2000) throw new Error("Cloudflare Pagesの静的リダイレクト上限（2000件）を超えています");
  return "# Auto-generated from data-source/redirects.json. Do not edit manually.\n"
    + "# Cloudflare Pages: HTTP 301; GitHub Pages: legacy HTML fallback remains.\n"
    + entries.map(([from, to]) => from + " " + to + " 301").join("\n") + "\n";
}

/**
 * Cloudflare Bulk RedirectsへのCSVインポート用。
 * Sourceはスキームを省略し、http/https両方に一致させる。
 * 末尾スラッシュ有無の2つを明示して、同一パスの判定差を避ける。
 * ヘッダー行なし。1行: source,target,301,preserve_query,include_subdomains,subpath,preserve_suffix
 */
export function cloudflareBulkRedirectsCsv(map, hostname = "ossalt.jp") {
  const errors = validateRedirects(map);
  if (errors.length) throw new Error(errors.join("\n"));
  if (!/^[a-z0-9.-]+$/.test(hostname) || !hostname.includes(".") || hostname.includes("..")) throw new Error("ホスト名が不正です");
  const rows = [];
  for (const [from, to] of Object.entries(map).sort(([a], [b]) => a.localeCompare(b))) {
    for (const p of [from.slice(0, -1), from]) {
      const source = hostname + p;
      const target = "https://" + hostname + to;
      rows.push([source, target, "301", "TRUE", "FALSE", "FALSE", "FALSE"].join(","));
    }
  }
  if (rows.length > 10000) throw new Error("Redirect Listのデフォルト上限を超える可能性があります");
  return rows.join("\n") + "\n";
}
