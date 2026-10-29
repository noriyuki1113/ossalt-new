/**
 * OSSALT Quality Intelligence：OSS詳細ページの品質評価（純粋関数のみ。ファイル・ネットワークに触れない）。
 *
 * 原則
 * - 判定は、ビルド済みHTML・掲載データ・手書きの解説に書かれている「事実」と、明示したルールだけで行う（LLMは使わない）。
 * - 検査できない項目は 0点にせず「unknown（未確認）」とし、配点の母数から外す。確認できた割合（coverage）が低いページは
 *   「暫定」「未評価」と表示し、総合点を無理に出さない。
 * - 「未検証」と「不合格」を区別する。重大な誤情報の疑いは、点数とは別に warning として出す。
 * - 同じ入力と同じ RULES_VERSION なら、同じ結果になる（日時以外は決定的）。
 */

export const RULES_VERSION = "qi-1.0";

export const DOMAINS = {
  unique: { label: "独自性・実用性", max: 30 },
  accuracy: { label: "正確性・根拠", max: 25 },
  decision: { label: "比較・意思決定", max: 20 },
  seo: { label: "SEO・検索意図", max: 15 },
  ux: { label: "使いやすさ", max: 10 },
};

export const GRADE_BANDS = [
  { grade: "A", min: 85 },
  { grade: "B", min: 70 },
  { grade: "C", min: 50 },
  { grade: "D", min: 0 },
];

/** 配点の何割を確認できたら総合点を出すか */
export const COVERAGE = { provisional: 0.8, unrated: 0.5 };

/** SaaSではなくOSSそのものが「代替対象」になっている、と既知のもの（編集で見直す候補） */
export const OSS_COMPETITORS = new Set(["kubernetes", "phpmyadmin", "adminer", "dbeaver"]);

const norm = (s) => String(s ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();

/** 文字 n-gram のシングル（重複検出用） */
export function shingles(text, n = 6) {
  const t = norm(text).replace(/[\s、。，．・「」（）()［］\[\]:：*#`|-]/g, "");
  const set = new Set();
  for (let i = 0; i + n <= t.length; i++) set.add(t.slice(i, i + n));
  return set;
}
export function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  const [s, l] = a.size < b.size ? [a, b] : [b, a];
  for (const x of s) if (l.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/** 本文から「N以上」「N+」などの件数の主張を取り出す（連携数などの食い違い検出用） */
export function countClaims(text) {
  const out = [];
  for (const m of norm(text).matchAll(/([0-9][0-9,]{1,6})\s*(?:以上|\+|超)\s*(?:の)?\s*(サービス|アプリ|連携|インテグレーション|ノード|モデル)/g)) {
    // サービス・アプリ・連携・インテグレーションは同じ「連携先の数」として比べる
    out.push({ n: Number(m[1].replace(/,/g, "")), what: /サービス|アプリ|連携|インテグレーション/.test(m[2]) ? "連携" : m[2] });
  }
  return out;
}

/** OSI承認でないライセンス（ソース公開型など）か。compare.ts の licenseGroupOf の結果を渡す */
export const isNonOsiGroup = (group) => group === "source-available";

/**
 * 1ページの評価。
 * input = {
 *   tool, facts (page-audit-lib の extractFacts), seoIssues (pageIssues の issues), jsonLdOk,
 *   inSitemap, noindex, inbound, guide: {body, glance, verification} | null,
 *   relation: string | null（alternative-relations の分類。無ければ null）, licenseGroup,
 *   maxSimilarity: {id, score} | null, competitorIsOss: boolean, uxTemplate: "pass" | "fail" | "unknown",
 *   faqShare: number(0..1)
 * }
 */
export function evaluatePage(input) {
  const { tool, facts, guide } = input;
  const crit = [];
  const add = (domain, id, label, max, status, basis, kind = "auto") => crit.push({ domain, id, label, max, status, points: status === "pass" ? max : 0, basis, kind });
  const text = facts?.text ?? "";
  const body = guide?.body ?? "";

  /* --- 独自性・実用性（30） --- */
  add("unique", "U1", "手書きの解説がある", 10, guide ? "pass" : "fail", guide ? "content/tools にある" : "content/tools に無い（自動の要約とデータのみ）");
  add("unique", "U2", "解説に十分な中身がある（600字以上）", 5, guide ? (norm(body).length >= 600 ? "pass" : "fail") : "fail", guide ? `${norm(body).length}字` : "解説なし");
  add("unique", "U3", "向いていない場合・制約・注意点がある", 5,
    guide ? ((guide.glance?.not_for?.length || /向いていない|向かない|注意点|制約|できないこと/.test(body)) ? "pass" : "fail") : "fail",
    guide ? "要約の not_for、または本文の見出し・語" : "解説なし");
  if (guide) {
    const sim = input.maxSimilarity;
    add("unique", "U4", "ほかのページの解説と重複していない", 5, sim && sim.score >= 0.5 ? "fail" : "pass", sim ? `最も近い解説：${sim.id}（類似度 ${sim.score.toFixed(2)}）` : "比較対象なし");
  } else add("unique", "U4", "ほかのページの解説と重複していない", 5, "na", "解説なし");
  add("unique", "U5", "導入・始め方の判断材料がある", 5, guide ? (/始め方|導入|インストール|動かす|セットアップ|必要な環境|要件/.test(body) ? "pass" : "fail") : "fail", guide ? "本文の見出し・語" : "解説なし");

  /* --- 正確性・根拠（25） --- */
  const lic = String(tool.license ?? "").replace(/\s*\(.*\)$/, "");
  add("accuracy", "R1", "ライセンス表記が掲載データと一致してページに出ている", 5, !tool.license ? "unknown" : text.includes(lic) ? "pass" : "fail", tool.license ? `data=${tool.license}` : "ライセンス未取得");
  const hasOfficial = /^https?:\/\//.test(tool.url ?? "") && input.html?.includes(`href="${tool.url}"`);
  const hasGh = input.html?.includes(`href="${tool.github_url}"`);
  add("accuracy", "R2", "公式サイト・リポジトリへのリンクがある", 5, hasOfficial && hasGh ? "pass" : hasGh || hasOfficial ? "fail" : "fail", `公式=${hasOfficial ? "あり" : "なし"} / GitHub=${hasGh ? "あり" : "なし"}`);
  const mirror = /mirror/i.test(tool.description_en ?? "");
  add("accuracy", "R3", "データの取得元が公式の開発リポジトリ（ミラーでない）", 5, mirror ? "fail" : "pass", mirror ? `GitHubの説明：${norm(tool.description_en).slice(0, 80)}` : "ミラーの表示なし");
  const v = guide?.verification ?? "unverified";
  add("accuracy", "R4", "解説を公式資料と照合した記録がある", 5, !guide ? "na" : v === "official" || v === "hands-on" ? "pass" : "unknown", !guide ? "解説なし" : `検証状態=${v}`, "editorial");
  const claimsD = countClaims(tool.description_ja ?? "");
  const claimsG = countClaims(body);
  const mismatch = claimsD.filter((d) => claimsG.some((g) => g.what === d.what && g.n !== d.n));
  const nonOsiOss = isNonOsiGroup(input.licenseGroup) && /オープンソース/.test(tool.description_ja ?? "") && !/ソース公開|オープンソースではない|OSI/.test(tool.description_ja ?? "");
  // 共通テンプレートが、OSI承認でないライセンスのツールにも「オープンソース代替」と書いていないか
  const templateOss = isNonOsiGroup(input.licenseGroup) && (/代替オープンソース|オープンソース代替/.test(facts?.title ?? "") || /のオープンソース代替/.test(text.slice(0, 400)));
  add("accuracy", "R5", "説明文・解説・共通テンプレートの間に、数値・用語の食い違いがない", 5, mismatch.length || nonOsiOss || templateOss ? "fail" : "pass",
    [mismatch.length ? `件数の食い違い：説明文 ${mismatch.map((m) => m.n + m.what).join("・")} ／ 解説 ${claimsG.map((g) => g.n + g.what).join("・")}` : "", nonOsiOss ? `OSI承認でないライセンス（${tool.license}）なのに、説明文が「オープンソース」と書いている` : "", templateOss ? "共通テンプレートのtitle・導入文が「オープンソース代替」と書いている" : ""].filter(Boolean).join("。") || "食い違いなし");

  /* --- 比較・意思決定（20） --- */
  add("decision", "C1", "代替の種類（直接・部分・組み合わせ・関連）が分類されている", 5, input.relation ? "pass" : "unknown", input.relation ? `分類=${input.relation}` : "未分類（直接代替という意味ではない）", "editorial");
  add("decision", "C2", "向いている人・向いていない人の要約がある", 5, guide?.glance ? "pass" : "fail", guide?.glance ? "「30秒で」要約あり" : "要約なし");
  add("decision", "C3", "比較ページ・代替ページへの導線がある", 5, /href="\/(compare|alternatives)\//.test(input.html ?? "") ? "pass" : "fail", "ページ内のリンク");
  add("decision", "C4", "代替対象がSaaS（OSSそのものではない）", 5, input.competitorIsOss ? "fail" : "pass", input.competitorIsOss ? `代替対象「${tool.primary_competitor}」はOSS、または自分自身` : `代替対象=${tool.primary_competitor}`);

  /* --- SEO・検索意図（15） --- */
  const seoBad = (input.seoIssues ?? []).filter((i) => i.severity !== "low" && !String(i.id).startsWith("jsonld") && !String(i.id).startsWith("faq"));
  add("seo", "S1", "title・description・canonical・h1 に問題がない", 5, seoBad.length ? "fail" : "pass", seoBad.length ? seoBad.map((i) => i.id).join(", ") : "問題なし");
  add("seo", "S2", "index とサイトマップの整合", 4, input.noindex === input.inSitemap ? "fail" : "pass", `noindex=${input.noindex} / sitemap=${input.inSitemap}`);
  add("seo", "S3", "構造化データが正しい", 3, input.jsonLdOk ? "pass" : "fail", input.jsonLdOk ? "構文・基本項目OK" : "構造化データの問題あり");
  add("seo", "S4", "内部リンクで十分に到達できる（3ページ以上から）", 3, (input.inbound ?? 0) >= 3 ? "pass" : "fail", `${input.inbound ?? 0}ページから`);

  /* --- 使いやすさ（10） --- */
  add("ux", "X1", "共通テンプレートの表示検査（代表ページ：横スクロール・アクセシビリティ・コンソール）", 6, input.uxTemplate ?? "unknown", input.uxTemplate === "pass" ? "代表ページの検査で問題なし（テンプレート共通）" : input.uxTemplate === "fail" ? "代表ページの検査で問題あり" : "検査結果なし");
  add("ux", "X2", "データの取得日・最終コミットが表示されている", 4, /取得日|最終コミット/.test(text) ? "pass" : "fail", "ページ本文");

  /* --- 集計 --- */
  const domains = {};
  for (const [k, d] of Object.entries(DOMAINS)) {
    const cs = crit.filter((c) => c.domain === k && c.status !== "na");
    const evaluated = cs.filter((c) => c.status === "pass" || c.status === "fail");
    const evMax = evaluated.reduce((s, c) => s + c.max, 0);
    const got = evaluated.reduce((s, c) => s + c.points, 0);
    const allMax = cs.reduce((s, c) => s + c.max, 0);
    domains[k] = { label: d.label, weight: d.max, earnedRatio: evMax ? got / evMax : null, coverage: allMax ? evMax / allMax : 0 };
  }
  // 総合点：確認できた項目だけで各領域の得点率を出し、領域の重みで合計（確認できなかった領域は母数から外す）
  let wsum = 0, score = 0, covW = 0;
  for (const d of Object.values(domains)) {
    covW += d.weight * d.coverage;
    if (d.earnedRatio == null) continue;
    wsum += d.weight;
    score += d.weight * d.earnedRatio;
  }
  const coverage = covW / Object.values(DOMAINS).reduce((s, d) => s + d.max, 0);
  const total = wsum ? Math.round((score / wsum) * 100) : null;
  const status = coverage < COVERAGE.unrated || total == null ? "unrated" : coverage < COVERAGE.provisional ? "provisional" : "rated";
  let grade = status === "unrated" ? null : GRADE_BANDS.find((b) => total >= b.min).grade;
  // A評価は「根拠つき」であることが条件：解説を公式資料と照合した記録（R4）が無いページは、点数が高くてもBまで
  const r4 = crit.find((c) => c.id === "R4");
  const capped = grade === "A" && r4?.status !== "pass";
  if (capped) grade = "B";

  /* --- 警告（点数とは別） --- */
  const warnings = [];
  const w = (id, severity, message, evidence, type) => warnings.push({ id, severity, message, evidence, type });
  if (mirror) w("mirror-source", "high", "GitHubのミラーから開発状況・セキュリティ評価を取得している可能性（公式の開発場所の数値と異なりうる）", norm(tool.description_en).slice(0, 120), "A");
  if (templateOss) w("template-oss-term", "high", "OSI承認でないライセンスなのに、共通テンプレートのtitle・導入文が「オープンソース代替」と書いている", `license=${tool.license} / title=${(facts?.title ?? "").slice(0, 60)}`, "A");
  if (nonOsiOss) w("license-term", "high", "OSI承認でないライセンスを「オープンソース」と書いている（用語の誤解）", `license=${tool.license}`, "B");
  if (mismatch.length) w("count-mismatch", "medium", "説明文と解説で、件数の記載が食い違っている", mismatch.map((m) => m.n + m.what).join("・"), "B");
  if (input.competitorIsOss) w("competitor-oss", "medium", "代替対象がSaaSではなくOSS、または自分自身（SaaS代替としての分類の見直し候補）", `primary_competitor=${tool.primary_competitor}`, "B");
  if (tool.github_archived) w("archived", "medium", "アーカイブ済み（開発終了）。index のまま一覧・サイトマップから外れている", "", "A");
  if (input.noindex && input.inSitemap) w("noindex-in-sitemap", "high", "noindex なのにサイトマップに載っている", "", "A");
  if (!input.noindex && !input.inSitemap && !tool.github_archived) w("not-in-sitemap", "high", "index 対象なのにサイトマップに無い", "", "A");
  if ((input.brokenLinks ?? []).length) w("broken-link", "high", "存在しないページへのリンク", input.brokenLinks.join(", "), "B");
  if (input.faqShare >= 0.8 && !guide) w("faq-template", "low", "FAQの大半が、ほかのページと同じ定型文（ツール名を除く）", `定型率 ${Math.round(input.faqShare * 100)}%`, "A");

  return { score: total, grade, gradeCapped: capped, status, coverage: Math.round(coverage * 100) / 100, domains, criteria: crit, warnings };
}

/** 改善の優先度。impressions は Search Console のページの表示回数（無ければ null。推測しない） */
export function priorityOf(result, { impressions = null } = {}) {
  const high = result.warnings.filter((w) => w.severity === "high");
  if (high.length) return { level: "P0", reason: `重大な警告：${high.map((w) => w.id).join(", ")}` };
  const med = result.warnings.filter((w) => w.severity === "medium");
  const demand = impressions != null && impressions >= 50;
  if (result.grade === "D" && (demand || impressions == null)) return { level: "P1", reason: demand ? `D評価で表示が多い（${impressions}回）` : "D評価（検索の表示回数は未取得）" };
  if (med.length) return { level: "P1", reason: `警告：${med.map((w) => w.id).join(", ")}` };
  if (result.grade === "C" || result.status === "unrated") return { level: "P2", reason: result.grade === "C" ? "C評価" : "未評価" };
  return { level: "P3", reason: result.grade ? `${result.grade}評価` : "暫定" };
}

/** 2回の監査結果の比較 */
export function diffAudits(prev, cur) {
  const p = new Map((prev?.pages ?? []).map((x) => [x.id, x]));
  const out = { improved: [], worsened: [], added: [], removed: [], changedInput: [] };
  for (const c of cur.pages) {
    const o = p.get(c.id);
    if (!o) { out.added.push(c.id); continue; }
    if (o.inputHash !== c.inputHash) out.changedInput.push(c.id);
    if (c.score != null && o.score != null && c.score !== o.score) (c.score > o.score ? out.improved : out.worsened).push({ id: c.id, from: o.score, to: c.score });
  }
  const ids = new Set(cur.pages.map((x) => x.id));
  for (const o of prev?.pages ?? []) if (!ids.has(o.id)) out.removed.push(o.id);
  return out;
}
