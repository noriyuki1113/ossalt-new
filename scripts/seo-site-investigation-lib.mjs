/**
 * 既存サイト（out/）の追加調査。読み取り専用の純粋関数。サイト・設定・データは一切変えない。
 *  - sitemapGap：indexされるのにサイトマップに無いページ、サイトマップにあるのに index されないURL を列挙して分類する
 *  - titleReview：title長超過を、文字数だけでなく「重複・定型文・切れる部分に何があるか・h1との乖離」で優先評価する
 * 分類は事実（out/ のHTMLとサイトマップ）と、ソース（src/app/sitemap.ts）の設計に基づく。
 * 「切れる位置」は目安（仮説）で、実際の表示は SERP と GSC で確認する。
 */
import { internalPath } from "./seo-audit-lib.mjs";

export const widthOf = (s) => [...String(s)].reduce((n, c) => n + (/[\u0000-ÿ]/.test(c) ? 1 : 2), 0);

/** 先頭から width 以内の部分 */
export function visiblePart(title, width) {
  let n = 0, out = "";
  for (const c of String(title)) {
    const w = /[\u0000-ÿ]/.test(c) ? 1 : 2;
    if (n + w > width) break;
    n += w; out += c;
  }
  return out;
}

/**
 * index対象 と サイトマップ の差を、両方向で列挙する。
 * reason の決め方（src/app/sitemap.ts の設計に対応）：

 *  - 元データ側でアーカイブ解除済みだが public/data が未反映 → 一時的（次回の日次更新で解消）
 *  - アーカイブ済みツール → 意図的（サイトマップはアクティブなツールのみ）
 *  - サイトマップの静的ページ一覧に無い補助ページ → 設定の確認が必要（意図か漏れか、ソースで判断）
 */
export function sitemapGap({ pages, sitemap }, { base = "https://ossalt.jp", archived = new Set(), knownSupportPages = new Set(), pendingRefresh = new Set() } = {}) {
  const sm = new Set(sitemap.map((u) => internalPath(u, base)).filter(Boolean));
  const entries = [...pages.entries()].filter(([k, p]) => !p.refresh && k !== "/404/" && k !== "/_not-found/");
  const indexable = new Map(entries.filter(([, p]) => !p.noindex));
  const notInSitemap = [];
  for (const [path, p] of indexable) {
    if (sm.has(path)) continue;
    let cls, why;
    if (pendingRefresh.has(path)) { cls = "pending"; why = "元データ（data-source）ではアーカイブ解除済み。public/data が次回の日次更新で再生成されると、サイトマップに入る見込み（一時的）"; }
    else if (archived.has(path)) { cls = "intentional"; why = "アーカイブ済みツール。サイトマップは掲載中のツールのみ（src/app/sitemap.ts の getActiveTools）"; }
    else if (knownSupportPages.has(path)) { cls = "intentional"; why = "補助ページ。サイトマップに載せない設計として記録済み"; }
    else { cls = "review"; why = "サイトマップの生成条件に該当しない。意図か設定漏れかをソースで確認"; }
    notInSitemap.push({ path, cls, why, canonical: p.canonical ?? null });
  }
  const inSitemapNotIndexable = [];
  for (const path of sm) {
    const p = pages.get(path);
    if (!p) inSitemapNotIndexable.push({ path, cls: "error", why: "サイトマップにあるのに、ビルド結果に無い（リンク切れの可能性）" });
    else if (p.refresh) inSitemapNotIndexable.push({ path, cls: "error", why: "サイトマップにあるのに、転送ページ" });
    else if (p.noindex) inSitemapNotIndexable.push({ path, cls: "error", why: "サイトマップにあるのに、noindex" });
  }
  return { indexableCount: indexable.size, sitemapCount: sm.size, notInSitemap, inSitemapNotIndexable };
}

const SEGMENT_SPLIT = /\s*[｜|]\s*|\s+[—–-]\s+/;
const BRAND = /^ossalt\.jp$/i;

export function titleSegments(title) {
  return String(title).split(SEGMENT_SPLIT).map((s) => s.trim()).filter((s) => s && !BRAND.test(s));
}

/** 数字を N にそろえる（「2選」「14選」を同じ定型として数える） */
const skeleton = (s) => s.replace(/[0-9０-９]+/g, "N");

/**
 * title長超過の優先評価。
 * 各ページに次を付ける：
 *  - exactDup：完全に同じtitleのページ数（2以上は重複）
 *  - boilerplateTail：切れる部分が、サイト全体で10ページ以上に出る定型の語句だけか
 *  - cutLoss：目安の位置（cutWidth）で切れたとき、失われる部分
 *  - h1Overlap：titleの先頭の語句がh1に含まれる割合の目安（低いと検索意図とのずれの疑い）
 * 優先度：重複 > 切れる部分に固有の情報がある > 定型のみ（低）
 */
export function titleReview(pages, { maxWidth = 70, cutWidth = 60, boilerplateMin = 10, familyOf = () => "other" } = {}) {
  const entries = [...pages.entries()].filter(([k, p]) => !p.refresh && !p.noindex && p.title && k !== "/404/" && k !== "/_not-found/");
  const titleCount = new Map();
  for (const [, p] of entries) titleCount.set(p.title, (titleCount.get(p.title) ?? 0) + 1);
  const segCount = new Map();
  for (const [, p] of entries) for (const s of new Set(titleSegments(p.title).map(skeleton))) segCount.set(s, (segCount.get(s) ?? 0) + 1);
  const isBoiler = (seg) => (segCount.get(skeleton(seg)) ?? 0) >= boilerplateMin;

  const rows = [];
  for (const [path, p] of entries) {
    const width = widthOf(p.title);
    if (width <= maxWidth) continue;
    const vis = visiblePart(p.title, cutWidth);
    const lost = p.title.slice(vis.length);
    // セグメントごとに位置を数え、切れる位置にかかる（または完全に後ろにある）セグメントのうち、定型でないものを「固有の情報」とする
    const lostUnique = [];
    let cursor = 0;
    for (const seg of titleSegments(p.title)) {
      const at = p.title.indexOf(seg, cursor);
      if (at < 0) continue;
      cursor = at + seg.length;
      const endWidth = widthOf(p.title.slice(0, cursor));
      if (endWidth > cutWidth && !isBoiler(seg)) lostUnique.push(seg);
    }
    const lead = titleSegments(p.title)[0] ?? "";
    const leadToken = lead.split(/[とはのでをにがの？?：:、]/)[0].trim();
    const h1 = (p.h1[0] ?? "");
    const h1Overlap = leadToken ? (h1.toLowerCase().includes(leadToken.toLowerCase()) ? 1 : 0) : null;
    const exactDup = titleCount.get(p.title);
    const priority = exactDup > 1 ? "A:重複" : lostUnique.length ? "B:切れる部分に固有の情報" : "C:切れるのは定型・屋号のみ";
    rows.push({ path, family: familyOf(path), width, title: p.title, exactDup, lost, lostUnique, h1Overlap, priority });
  }
  const byPriority = {};
  for (const r of rows) (byPriority[r.priority] ??= []).push(r);
  const byFamily = {};
  for (const r of rows) {
    const f = (byFamily[r.family] ??= { total: 0, A: 0, B: 0, C: 0 });
    f.total++; f[r.priority[0]]++;
  }
  const boilerplates = [...segCount.entries()].filter(([, n]) => n >= boilerplateMin).sort((a, b) => b[1] - a[1]).slice(0, 15);
  const h1Mismatch = rows.filter((r) => r.h1Overlap === 0);
  return { totalIndexable: entries.length, over: rows.length, rows, byPriority, byFamily, boilerplates, h1Mismatch, duplicateGroups: [...titleCount.entries()].filter(([, n]) => n > 1).map(([title, n]) => ({ title, n })) };
}

export function renderTitleReview(r, { cutWidth = 60 } = {}) {
  const L = [];
  L.push("## title長超過の優先評価", "");
  L.push(`index対象 ${r.totalIndexable}ページのうち、半角1・全角2で70を超えるものは ${r.over}ページ。`, "");
  L.push("文字数だけでは判断できない。この表示幅の数え方は目安で、Googleは実際にはピクセル幅で切り、titleを書き換えることもある。実際の表示はSERPとGSCで確認する。", "");
  L.push("### 種類ごと", "", "| 種類 | 超過 | A:重複 | B:切れる部分に固有の情報 | C:定型・屋号のみ |", "| --- | ---: | ---: | ---: | ---: |");
  for (const [f, v] of Object.entries(r.byFamily)) L.push(`| ${f} | ${v.total} | ${v.A} | ${v.B} | ${v.C} |`);
  L.push("", `### 定型の語句（10ページ以上に出るもの）`, "", "| 語句（数字はN） | ページ数 |", "| --- | ---: |");
  for (const [s, n] of r.boilerplates) L.push(`| ${s.replace(/\|/g, "\\|")} | ${n} |`);
  L.push("", `### 完全に同じtitle`, "");
  L.push(r.duplicateGroups.length ? r.duplicateGroups.map((d) => `- ${d.n}ページ：${d.title}`).join("\n") : "なし。");
  L.push("", `### 優先度B：目安の位置（全角${cutWidth / 2}文字相当）で切れると、固有の情報が失われる例`, "");
  for (const x of (r.byPriority["B:切れる部分に固有の情報"] ?? []).slice(0, 15)) L.push(`- ${x.path}：失われる → 「${x.lost}」`);
  L.push("", `### h1とtitleの先頭語が一致しない（検索意図とのずれの疑い。語の一致だけの機械的な目安）：${r.h1Mismatch.length}ページ`, "");
  for (const x of r.h1Mismatch.slice(0, 10)) L.push(`- ${x.path}：${x.title}`);
  return L.join("\n");
}
