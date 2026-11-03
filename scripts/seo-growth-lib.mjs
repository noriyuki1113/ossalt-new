/**
 * SEO Growth Engine：2期間のGSCエクスポートから、改善候補（最大10件）とレポートを作る。純粋関数中心。
 * 入力は readExportDir の結果。実データが無い・足りないときは、候補を減らし、データ不足を明示する。
 * 数値は読み取ったCSVの値だけ。『推定クリック増加』のような予測は出さない（CTR改善余地は仮説）。
 */
import { compareExports, capState, coverage } from "./gsc-compare-lib.mjs";
import { rankRows, resolveMinImpressions, pathOf, patternSummary } from "./seo-priority.mjs";
import { detectCannibalization } from "./seo-cannibal-lib.mjs";

/** QI の audit.json（reports/quality/<id>/audit.json）→ パス → { grade, score }。評価されていないものは含めない */
export function loadQiIndex(audit) {
  const m = new Map();
  for (const p of audit?.pages ?? []) {
    if (p.url && p.status === "rated" && p.grade) m.set(p.url, { grade: p.grade, score: p.score, gradeCapped: !!p.gradeCapped });
  }
  return m;
}

const key = (r) => r.label;

/** 採点の入力行を作る（前期間との比較・QIを付ける） */
export function enrichRows(rows, cmpRows, qiMap, pageCmpRows = null) {
  const idx = new Map((cmpRows ?? []).map((c) => [c.label, c]));
  // クエリ×ページの前期間が無いとき、ページ全体の前期間比で代用する（クエリ別の増減ではないことを明示）
  const pageIdx = new Map((pageCmpRows ?? []).map((c) => [c.label, c]));
  return rows.map((r) => {
    if (!idx.has(key(r)) && r.page && pageIdx.has(r.page)) {
      const c = pageIdx.get(r.page);
      const page = r.page;
      const qi = qiMap ? qiMap.get(pathOf(page).endsWith("/") ? pathOf(page) : pathOf(page) + "/") ?? null : null;
      return { ...r, cmp: { ...c, pageLevel: true }, qi };
    }
    const page = r.page ?? (r.kind === "page" ? r.label : null);
    const qi = page && qiMap ? qiMap.get(pathOf(page).endsWith("/") ? pathOf(page) : pathOf(page) + "/") ?? null : null;
    return { ...r, cmp: idx.get(key(r)) ?? null, qi };
  });
}

/**
 * @returns { primaryKind, comparison, ranked, queryRanked, cannibal, conditions, notes }
 */
export function buildGrowth({ cur, prev, siteState = null, qiMap = null, limit = 10, minImpressions = "auto", aiOverview = null }) {
  const primaryKind = cur.pairs ? "pairs" : "pages";
  const cmp = prev ? compareExports(cur, prev, { kind: primaryKind }) : null;
  const cmpQ = prev && cur.queries && prev.queries ? compareExports(cur, prev, { kind: "queries" }) : null;
  const notes = [];
  if (!cur[primaryKind]) throw new Error("直近の期間に、ページ別（またはクエリ×ページ）の表がありません");
  const cmpPages = primaryKind === "pairs" && prev && cur.pages && prev.pages ? compareExports(cur, prev, { kind: "pages" }) : null;
  const rows = enrichRows(cur[primaryKind].rows, cmp?.rows, qiMap, cmpPages?.check.ok ? cmpPages.rows : null).map((r) => (aiOverview?.has(r.query ?? "") ? { ...r, aiOverview: aiOverview.get(r.query) } : r));
  const min = resolveMinImpressions(rows, minImpressions);
  const ranked = rankRows(rows, { limit: 50, siteState, minImpressions: min.value });
  ranked.items = ranked.items.filter((x) => x.score > 0).slice(0, limit);
  let queryRanked = null;
  if (cur.queries) {
    const qrows = enrichRows(cur.queries.rows, cmpQ?.rows, null);
    const qmin = resolveMinImpressions(qrows, minImpressions);
    queryRanked = rankRows(qrows, { limit: 5, minImpressions: qmin.value });
  }
  if (!prev) notes.push("前期間のエクスポートが指定されていないため、増減の比較は行っていません。");
  else if (cmp && !cmp.check.ok && !cmpPages?.check.ok) notes.push("前期間との条件がそろわないため、増減の比較は行っていません（理由は『比較の条件』を参照）。");
  if (primaryKind === "pages") notes.push("クエリ×ページのCSVが無いため、候補は『ページ単位』です。どのクエリで表示されているかは、クエリ別の表と結び付けていません（推測しません）。");
  if (cmpPages?.check.ok && cmp && !cmp.check.ok) notes.push("前期間にクエリ×ページの表が無いため、増減はページ全体の値で代用しています（そのクエリ単独の増減ではありません）。");
  const cannibal = cur.pairs ? detectCannibalization(cur.pairs.rows, { capped: capState(cur.rawRows.pairs).capped, prevPairRows: prev?.pairs?.rows ?? null }) : null;
  if (!cur.pairs) notes.push("カニバリゼーションの実測検出には、クエリ×ページのCSVが必要です。");
  return { primaryKind, comparison: cmp, queryComparison: cmpQ, ranked, minImpressions: min, queryRanked, cannibal, notes, patterns: cur.queries ? patternSummary(cur.queries.rows) : null };
}

const f = (n) => new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 }).format(n);
const pct = (x) => (x == null ? "—" : `${(x * 100).toFixed(1)}%`);
const esc = (s) => String(s).replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");

function condLine(label, c) {
  const range = c.from && c.to ? `${c.from}〜${c.to}（${c.days}日）` : `${c.dateText ?? "不明"}（絶対日付：未確認）`;
  return `- ${label}：${range}／検索タイプ ${c.searchType ?? "未確認"}／国 ${c.country.value ?? "未確認"}／デバイス ${c.device.value ?? "未確認"}／ブランド除外 ${c.brandFiltered == null ? "未確認" : c.brandFiltered ? "あり" : "なし"}`;
}

export function renderGrowth(g, { cur, prev, generatedAt, sample = false }) {
  const L = ["# SEO Growth Engine レポート（ローカル・非公開）", "", `生成日: ${generatedAt}`, ""];
  if (sample) L.push("> **サンプル（架空）データです。実測値ではありません。判断に使わないでください。**", "");
  L.push("このファイルには Search Console の数値が含まれます。gitignore 済みの場所（reports/seo/）にだけ出力し、コミット・PR・ログに載せないでください。", "");
  L.push("## 比較の条件", "", condLine("直近", cur.conditions));
  if (prev) L.push(condLine("前", prev.conditions));
  const chk = g.comparison?.check;
  if (chk) {
    for (const e of chk.errors) L.push(`- ❌ ${e}`);
    for (const w of chk.warnings) L.push(`- ⚠️ ${w}`);
    for (const u of chk.unverified) L.push(`- ❓ 未確認：${u}`);
    if (chk.ok && !chk.errors.length) L.push("- 比較に必要な条件（期間の長さ・検索タイプ・国・デバイス）の矛盾は検出されていません（未確認の項目を除く）。");
  }
  L.push("", "## データの網羅性", "");
  const cov = (label, exp, kind) => {
    const cs = capState(exp.rawRows[kind]);
    const cv = coverage(exp[kind]?.rows, exp.totals);
    L.push(`- ${label}：${kind === "pairs" ? "クエリ×ページ" : kind === "pages" ? "ページ別" : "クエリ別"} ${exp.rawRows[kind] ?? 0}行${cs.capped ? "（上限到達：全件ではない）" : ""}` +
      (cv ? `／CSVの表示回数は全体（デバイス別の合計）の ${pct(cv.impressionShare)}（残りは匿名化クエリ・ブランド除外・上限など。内訳は不明）` : "／全体の合計が無く、カバー率は未確認"));
  };
  cov("直近", cur, g.primaryKind); if (prev?.[g.primaryKind]) cov("前", prev, g.primaryKind);
  const t = g.comparison?.totals;
  if (t?.cur && t?.prev) {
    const d = (a, b) => (b ? `${a >= b ? "+" : ""}${((a / b - 1) * 100).toFixed(1)}%` : "—");
    L.push("", "### 全体の合計（デバイス別の表の合計）", "", "| | 直近 | 前 | 変化 |", "| --- | ---: | ---: | ---: |", `| クリック | ${f(t.cur.clicks)} | ${f(t.prev.clicks)} | ${d(t.cur.clicks, t.prev.clicks)} |`, `| 表示回数 | ${f(t.cur.impressions)} | ${f(t.prev.impressions)} | ${d(t.cur.impressions, t.prev.impressions)} |`);
  }
  for (const n of g.notes) L.push("", `> ${n}`);
  L.push("", `## 改善候補（最大10件。基準を満たす行が少なければ、それだけ）`, "", `- 表示回数のしきい値：${g.minImpressions.value}（${g.minImpressions.reason}）`, `- 採点の根拠：各係数に『実測』『仮説』を付けています。仮説は、このツールの計算の仮定であり、成果の予測ではありません。`, `- CTRの改善余地は仮説です。推定クリック増加は、確実な成果として表示しません。`, "");
  if (!g.ranked.items.length) L.push("基準に合う候補がありません（データ不足、または基準を満たす行が無い）。", "");
  g.ranked.items.forEach((r, i) => {
    L.push(`### ${i + 1}. ${esc(r.label)}`, "", `- 施策案：${r.actionLabel}（${r.reason}）`, `- 実測：表示 ${f(r.impressions)}／クリック ${f(r.clicks)}／CTR ${(r.ctr * 100).toFixed(2)}%／平均順位 ${r.position.toFixed(1)}`, `- 点数：${r.score}`);
    if (r.cmp?.status === "both" && !r.cmp.lowSample) L.push(`- 前期間比：表示 ${r.cmp.dImpressions >= 0 ? "+" : ""}${f(r.cmp.dImpressions)}、順位の差 ${r.cmp.dPosition ?? "—"}（負＝上昇）`);
    L.push("- 係数：", ...r.factors.map((x) => `  - ${esc(x.name)}（${x.kind}）：${esc(x.value)}｜${esc(x.note)}`));
    if (r.dataGaps.length) L.push("- データ不足：", ...r.dataGaps.map((x) => `  - ${esc(x)}`));
    L.push("");
  });
  if (g.queryRanked?.items.length) {
    L.push("## クエリ単位の候補（対応するURLは不明。結び付けていません）", "", "| クエリ | 表示 | CTR | 平均順位 | 施策案 |", "| --- | ---: | ---: | ---: | --- |");
    for (const r of g.queryRanked.items) L.push(`| ${esc(r.label)} | ${f(r.impressions)} | ${(r.ctr * 100).toFixed(2)}% | ${r.position.toFixed(1)} | ${esc(r.actionLabel)} |`);
    L.push("");
  }
  L.push("## カニバリゼーション", "");
  if (!g.cannibal) L.push("検証できません（クエリ×ページのCSVがありません）。", "");
  else {
    if (g.cannibal.note) L.push(`> ${g.cannibal.note}`, "");
    if (!g.cannibal.groups.length) L.push("基準に合うクエリはありません。", "");
    for (const x of g.cannibal.groups.slice(0, 10)) {
      L.push(`- **${esc(x.query)}**（表示 ${f(x.totalImpressions)}）${x.leaderChanged ? "［前期間から先頭のページが入れ替わっている］" : ""}：${esc(x.assessment)}`, ...x.pages.map((p) => `  - ${p.path}（${p.family}）表示 ${f(p.impressions)}・順位 ${p.position.toFixed(1)}`));
    }
    L.push("", "> 複数ページが表示されていることは、カニバリの断定ではありません。統合・canonical・301は個別の承認が必要です。", "");
  }
  L.push("## 判断を保留しているもの", "", "- AI Overview・スニペットなどのSERP機能：未確認（確認できたクエリだけ係数に反映）", "- 検索意図の一致：URLとクエリの対応が実測できる行（クエリ×ページ）だけ判定", "- 『平均順位10.7』のような未検証の数値は、この計算に使っていません。", "");
  return L.join("\n");
}
