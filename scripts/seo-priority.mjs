/**
 * OSSALT SEO Agency：優先順位の計算（純粋関数のみ。ファイル・ネットワークに触れない）。
 *
 * すべての係数に「実測」か「仮説」の区分を付ける。
 *   実測 … Search Console のCSVの数値、またはビルド済みサイト（out/）の事実
 *   仮説 … 検索パターンの分類・ページ種別の事業上の重要度・施策の実装コスト（OSSALT側の判断。需要や成果の証明ではない）
 * 外部の順位別CTR表は使わない。「CTRが低い」は、この入力データの中の同じ順位帯の中央値との比較だけで判断する。
 */

/* ------------------------------------------------------------------ *
 * 検索パターン（分類だけ。このパターンに需要があるという意味ではない）
 * ------------------------------------------------------------------ */

export const PATTERNS = [
  { id: "vs", label: "OSS A vs OSS B（比較）", re: /\bvs\b|\bversus\b|比較|違い|どっち|比べ/i, weight: 1.15, basis: "仮説：比較ページ（/compare/）に対応できる" },
  { id: "alternative", label: "SaaS名＋代替", re: /代替|代わり|乗り換|移行|alternative|alternatives|replacement|\bfree\b.*\bversion\b/i, weight: 1.2, basis: "仮説：代替ページ（/alternatives/）に対応できる" },
  { id: "opensource", label: "SaaS名＋オープンソース", re: /オープンソース|open ?source|\boss\b|無料.*(ツール|ソフト)|フリー(ソフト|ウェア)/i, weight: 1.1, basis: "仮説：代替ページ・OSS詳細に対応できる" },
  { id: "selfhost", label: "セルフホスト＋用途", re: /セルフホスト|self[- ]?host|オンプレ|自前|自社サーバ|自分のサーバ/i, weight: 1.1, basis: "仮説：OSS詳細・導入の解説に対応できる" },
  { id: "license", label: "OSS＋ライセンス", re: /ライセンス|license|licence|\bagpl\b|\bgpl\b|\bmit\b|商用利用/i, weight: 1.0, basis: "仮説：ライセンスページ・OSS詳細に対応できる" },
  { id: "install", label: "OSS＋導入方法", re: /導入|インストール|install|docker|セットアップ|setup|構築|使い方|やり方/i, weight: 1.0, basis: "仮説：OSS詳細・導入の解説に対応できる" },
];
export const PATTERN_OTHER = { id: "other", label: "上記以外（分類なし）", weight: 0.85, basis: "仮説：分類できない" };

export function classifyQuery(query) {
  const q = String(query ?? "").normalize("NFKC");
  return PATTERNS.find((p) => p.re.test(q)) ?? PATTERN_OTHER;
}

/** ページのURLパス → 種類と、事業上の重要度（仮説） */
export const PAGE_FAMILIES = [
  { id: "alternatives", re: /^\/alternatives\/[^/]+\/$/, weight: 1.2, basis: "仮説：SaaSの代替を探す人の入口（回遊・収益導線の起点）" },
  { id: "compare", re: /^\/compare\/[^/]+\/$/, weight: 1.15, basis: "仮説：比較して決める直前のページ" },
  { id: "licenses", re: /^\/licenses\/[^/]*\/?$/, weight: 1.05, basis: "仮説：判断材料のページ" },
  { id: "tools", re: /^\/tools\/[^/]+\/$/, weight: 1.05, basis: "仮説：個別のOSSの検索に対応" },
  { id: "guide", re: /^\/(guide|blog|diagnosis|cost-lab|rankings|for-you)\//, weight: 1.0, basis: "仮説：補助的なページ" },
];
export function pageFamily(pathname) {
  return PAGE_FAMILIES.find((f) => f.re.test(pathname)) ?? { id: "other", weight: 0.9, basis: "仮説：分類なし" };
}
export const pathOf = (url) => {
  try { return new URL(url).pathname; } catch { return String(url ?? ""); }
};

/* ------------------------------------------------------------------ *
 * 実測：同じ順位帯の中央値との比較
 * ------------------------------------------------------------------ */

export const POSITION_BANDS = [
  { id: "1-3", min: 1, max: 3.999 },
  { id: "4-7", min: 4, max: 7.999 },
  { id: "8-12", min: 8, max: 12.999 },
  { id: "13-20", min: 13, max: 20.999 },
  { id: "21+", min: 21, max: Infinity },
];
export const bandOf = (position) => POSITION_BANDS.find((b) => position >= b.min && position <= b.max)?.id ?? "21+";

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** 入力データの中の、順位帯ごとのCTR中央値。行が MIN_ROWS 未満の帯は null（比べない） */
export const MIN_ROWS_FOR_BAND = 5;
export function ctrMedianByBand(rows) {
  const out = {};
  for (const b of POSITION_BANDS) {
    const xs = rows.filter((r) => bandOf(r.position) === b.id && r.impressions >= 30).map((r) => r.ctr);
    out[b.id] = xs.length >= MIN_ROWS_FOR_BAND ? median(xs) : null;
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * 候補の採点
 * ------------------------------------------------------------------ */

export const MIN_IMPRESSIONS = 100;
/** 入力の表示回数の合計がこれ未満の小さなサイトでは、しきい値を下げる（100回以上の行がほとんど無いため）。下げたことはレポートに明記する */
export const SMALL_SITE_IMPRESSIONS = 50_000;
export const SMALL_SITE_MIN = 30;
export function resolveMinImpressions(rows, requested = "auto") {
  if (requested !== "auto") {
    const n = Number(requested);
    if (!Number.isInteger(n) || n < 1) throw new Error("--min-impressions は1以上の整数か auto");
    return { value: n, reason: "指定された値" };
  }
  const total = rows.reduce((s, r) => s + r.impressions, 0);
  return total < SMALL_SITE_IMPRESSIONS
    ? { value: SMALL_SITE_MIN, reason: `表示回数の合計が${total.toLocaleString("ja-JP")}回（${SMALL_SITE_IMPRESSIONS.toLocaleString("ja-JP")}回未満）の小さなサイトなので、しきい値を下げた（100回では候補がほとんど残らないため）` }
    : { value: MIN_IMPRESSIONS, reason: "既定値" };
}

/** 施策の種類（仮説の実装コスト：小=1、中=2、大=3） */
export const ACTIONS = {
  title: { label: "title・descriptionの見直し", cost: 1, basis: "仮説：実装コスト小（メタ情報のみ）" },
  content: { label: "既存ページの内容・内部リンクの強化", cost: 2, basis: "仮説：実装コスト中（調査と本文の編集）" },
  intent: { label: "検索意図とのずれの確認（新規ページの要否を含む）", cost: 3, basis: "仮説：実装コスト大（調査が先。需要が確認できるまで作らない）" },
};

/**
 * 1行（クエリ、ページ、またはクエリ×ページ）に対する候補判定。候補にならなければ null。
 * 戻り値の factors は、点数に効いた係数を、実測／仮説の区分つきで列挙する。
 */
export function scoreRow(row, { bands, pageState = null, minImpressions = MIN_IMPRESSIONS } = {}) {
  if (row.impressions < minImpressions) return null;
  const band = bandOf(row.position);
  const med = bands?.[band] ?? null;
  const ctrGap = med != null && row.ctr < med;
  let action, reason;
  if (row.position >= 5 && row.position <= 20) {
    action = "content"; reason = "順位5〜20位：上位に近い位置にある";
  } else if (row.position < 5 && (ctrGap || row.ctr < 0.02)) {
    action = "title"; reason = ctrGap ? "同じ順位帯の中央値よりCTRが低い" : "上位表示だがCTRが2%未満";
  } else if (row.position > 20 && row.position <= 40 && row.impressions >= 500) {
    action = "intent"; reason = "表示は多いが順位が遠い：勝てる検索意図か調査";
  } else return null;

  const query = row.query ?? (row.kind === "query" ? row.label : null);
  const page = row.page ?? (row.kind === "page" ? row.label : null);
  const pattern = query ? classifyQuery(query) : null;
  const family = page ? pageFamily(pathOf(page)) : null;

  const headroom = action === "content" ? 1 + (20 - row.position) / 30 : action === "title" ? 1.1 : 0.6;
  const factors = [
    { name: "表示回数", value: row.impressions, kind: "実測", note: "検索結果に出た回数（対数で効かせる）" },
    { name: "順位", value: Number(row.position.toFixed(1)), kind: "実測", note: `${band}位の帯（${reason}）` },
  ];
  if (med != null) factors.push({ name: "同順位帯のCTR中央値との差", value: `${(row.ctr * 100).toFixed(2)}% / 中央値${(med * 100).toFixed(2)}%`, kind: "実測", note: "入力データ内の比較" });
  factors.push({ name: "改善余地の係数", value: Number(headroom.toFixed(2)), kind: "仮説", note: "順位が上位に近いほど大きい（計算の仮定）" });
  let mult = headroom;
  if (pattern) { mult *= pattern.weight; factors.push({ name: `検索パターン：${pattern.label}`, value: pattern.weight, kind: "仮説", note: pattern.basis }); }
  if (family) { mult *= family.weight; factors.push({ name: `ページ種別：${family.id}`, value: family.weight, kind: "仮説", note: family.basis }); }
  const blocked = pageState && (pageState.refresh || pageState.noindex);
  if (blocked) { mult *= 0; }
  const cost = ACTIONS[action].cost;
  const score = Math.log10(row.impressions) * mult / (1 + (cost - 1) * 0.25);
  factors.push({ name: "実装コスト", value: cost, kind: "仮説", note: ACTIONS[action].basis });
  return {
    ...row, action, actionLabel: ACTIONS[action].label, reason, band, pattern: pattern?.id ?? null, family: family?.id ?? null,
    score: Number(score.toFixed(3)), factors,
    blocked: blocked ? (pageState.refresh ? "転送ページ（掲載をやめたURL）" : "noindexのページ") : null,
  };
}

export function rankRows(rows, { limit = 5, siteState = null, minImpressions = MIN_IMPRESSIONS } = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error("limit must be 1..50");
  const bands = ctrMedianByBand(rows);
  const out = [];
  for (const row of rows) {
    const page = row.page ?? (row.kind === "page" ? row.label : null);
    const pageState = page && siteState ? siteState(pathOf(page)) : null;
    const s = scoreRow(row, { bands, pageState, minImpressions });
    if (s) out.push(s);
  }
  out.sort((a, b) => b.score - a.score || b.impressions - a.impressions || String(a.label ?? a.query).localeCompare(String(b.label ?? b.query)));
  return { items: out.slice(0, limit), total: out.length, bands, minImpressions };
}

/** 検索パターンごとの実測の合計（需要の判定ではなく、手元のデータの内訳） */
export function patternSummary(queryRows) {
  const m = new Map();
  for (const r of queryRows) {
    const p = classifyQuery(r.label ?? r.query);
    const e = m.get(p.id) ?? { id: p.id, label: p.label, queries: 0, impressions: 0, clicks: 0 };
    e.queries++; e.impressions += r.impressions; e.clicks += r.clicks;
    m.set(p.id, e);
  }
  return [...m.values()].sort((a, b) => b.impressions - a.impressions);
}
