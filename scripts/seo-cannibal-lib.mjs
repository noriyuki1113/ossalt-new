/**
 * カニバリゼーション（同じクエリで複数のOSSALTページが表示される状態）の検出。
 *
 * 検証できる範囲：
 *  - 実測：クエリ×ページのCSV（pairs）がある場合だけ、「同じクエリに複数ページが出ている」ことを検出できる。
 *    クエリ別・ページ別のCSVから、URLとクエリを推測して結び付けない。
 *  - 静的：ビルド済みサイト（out/）の h1・description が同一のページ（検索意図が重なる候補）。GSCデータなしで検出できる。
 * 「複数ページが出ている」ことは、カニバリの断定ではない（意図が違えば正常。例：代替ページと詳細ページ）。
 * 統合・canonical・301は個別承認が必要で、このモジュールは候補を出すだけ。
 */
import { pageFamily, pathOf } from "./seo-priority.mjs";

const norm = (q) => String(q ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * @param pairRows readGscExport(…, 'pair') の rows（{query,page,clicks,impressions,position}）
 * @param opts.minImpressions クエリ全体の表示回数がこれ未満なら対象外（少数で判断しない）
 * @param opts.minSecondShare 2位のページの表示回数の割合がこれ未満なら、競合とみなさない
 * @param opts.capped ペアの表が行数上限に達している場合 true（欠けた行があり、競合を見落としている可能性）
 */
export function detectCannibalization(pairRows, { minImpressions = 30, minSecondShare = 0.2, capped = false, prevPairRows = null } = {}) {
  const byQuery = new Map();
  for (const r of pairRows) {
    const q = norm(r.query);
    if (!byQuery.has(q)) byQuery.set(q, []);
    byQuery.get(q).push(r);
  }
  const prevLeader = new Map();
  if (prevPairRows) {
    const g = new Map();
    for (const r of prevPairRows) { const q = norm(r.query); if (!g.has(q) || g.get(q).impressions < r.impressions) g.set(q, r); }
    for (const [q, r] of g) prevLeader.set(q, pathOf(r.page));
  }
  const groups = [];
  for (const [query, rows] of byQuery) {
    if (rows.length < 2) continue;
    const total = rows.reduce((s, r) => s + r.impressions, 0);
    if (total < minImpressions) continue;
    const pages = rows.map((r) => ({ path: pathOf(r.page), family: pageFamily(pathOf(r.page)).id, clicks: r.clicks, impressions: r.impressions, position: r.position, share: r.impressions / total })).sort((a, b) => b.impressions - a.impressions);
    if (pages[1].share < minSecondShare) continue;
    const families = new Set(pages.map((p) => p.family));
    const leaderChanged = prevLeader.has(query) && prevLeader.get(query) !== pages[0].path;
    groups.push({
      query, totalImpressions: total, pages, leaderChanged,
      // 種類が違うページが出ているだけなら、意図の違いの可能性が高い（仮説）。同じ種類なら、内容の重複を疑う
      assessment: families.size === 1 ? "同じ種類のページが競合：内容・意図の重複を確認" : "種類の異なるページが表示：意図が違う可能性（統合の前に確認）",
    });
  }
  groups.sort((a, b) => b.totalImpressions - a.totalImpressions);
  return { groups, capped, note: capped ? "ペアの表が上限に達しているため、見落としがある可能性があります。" : null };
}

/** 静的な候補：indexされるページのうち、h1 または meta description が同一のもの。GSCデータなしでも出せる（実測ではなくHTMLの事実） */
export function staticOverlapCandidates(pages) {
  const entries = [...pages.entries()].filter(([k, p]) => !p.refresh && !p.noindex && k !== "/404/" && k !== "/_not-found/");
  const group = (pick) => {
    const m = new Map();
    for (const [k, p] of entries) { const v = pick(p); if (v) (m.get(v) ?? m.set(v, []).get(v)).push(k); }
    return [...m.entries()].filter(([, ks]) => ks.length > 1).map(([text, paths]) => ({ text, paths }));
  };
  return { duplicateH1: group((p) => p.h1?.length === 1 ? p.h1[0] : null), duplicateDescription: group((p) => p.description) };
}
