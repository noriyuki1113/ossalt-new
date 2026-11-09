/**
 * GitHub Actions のワークフローコマンド（::error ...::）。失敗の理由を、実行ログと要約の注釈に出す。
 * GITHUB_ACTIONS=true のときだけ出す（ローカルでは通常の ✗ 行のみ）。
 * エスケープの規則：データは % → %25、\r → %0D、\n → %0A。プロパティはさらに : → %3A、, → %2C。
 */
const esc = (s) => String(s).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
const escProp = (s) => esc(s).replace(/:/g, "%3A").replace(/,/g, "%2C");

export function errorAnnotation(message, title) {
  return `::error${title ? ` title=${escProp(title)}` : ""}::${esc(message)}`;
}

/** 失敗の一覧を、Actions 上でだけ注釈として出す */
export function emitErrors(problems, title, env = process.env, write = (l) => console.log(l)) {
  if (env.GITHUB_ACTIONS !== "true") return 0;
  for (const p of problems) write(errorAnnotation(p, title));
  return problems.length;
}
