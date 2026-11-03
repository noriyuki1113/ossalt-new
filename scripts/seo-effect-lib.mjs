/**
 * 効果検証：変更履歴（seo-ledger）の1件について、変更の前と後の同条件の期間を比べる。純粋関数。
 *
 * 原則：
 *  - 前の期間は変更日より前に終わり、後の期間は変更日より後に始まっていること。長さ・検索タイプ・国・デバイス等が
 *    そろわないものは「評価不能」とし、数値の差を結論にしない。
 *  - 結果は「兆候」の記述で、成功・失敗の断定はしない。改善直後の変動は、再クロール・再評価の途中の可能性がある。
 *  - 同じURLの期間内の他の変更、季節性（前後で曜日・時期が違う）、少数の表示回数を、必ず注記する。
 *  - Search Console の数値は、このモジュールの出力（ignoredのreports/seo/）にだけ出す。ledger.json には書かない。
 *  - suggestedOutcome は seo-ledger.mjs record に渡す候補で、自動では記録しない。
 */
import { addDay, checkComparable, daysBetween } from "./gsc-compare-lib.mjs";

export const MIN_IMPRESSIONS_FOR_EFFECT = 50;
export const SETTLE_DAYS = 7; // 変更直後の不安定な期間の目安（仮説）。後の期間がこれより早く始まるときは注記する

const pathOf = (u) => { try { return new URL(u).pathname; } catch { return u; } };
const findPage = (exp, url) => exp.pages?.rows.find((r) => pathOf(r.label) === pathOf(url)) ?? null;
const findPair = (exp, url, query) => exp.pairs?.rows.find((r) => pathOf(r.page) === pathOf(url) && r.query.normalize("NFKC").toLowerCase() === query.normalize("NFKC").toLowerCase()) ?? null;

export function evaluateEntry(entry, before, after, { otherEntries = [] } = {}) {
  const caveats = [
    "Search Console の数値は、変更以外の要因（検索需要の季節変動、他の変更、アルゴリズムの更新、集計の遅延）でも動く。因果は証明できない。",
    "『兆候』は、同条件の2期間の差の記述であり、成功・失敗の断定ではない。",
  ];
  const res = { id: entry.id, url: entry.url, query: entry.query, changeDate: entry.date, caveats, conditionErrors: [], conditionWarnings: [], unverified: [] };
  const b = before.conditions, a = after.conditions;
  // 期間の前後関係
  if (b.to && a.from) {
    if (b.to >= entry.date) res.conditionErrors.push(`前の期間（終了 ${b.to}）が、変更日 ${entry.date} より前に終わっていません。`);
    if (a.from <= entry.date) res.conditionErrors.push(`後の期間（開始 ${a.from}）が、変更日 ${entry.date} より後に始まっていません。`);
    if (!res.conditionErrors.length && a.from < addDay(entry.date, SETTLE_DAYS)) res.conditionWarnings.push(`後の期間が変更日の ${SETTLE_DAYS} 日以内に始まっています。再クロール・再評価の途中の変動を含む可能性があります。`);
    if (!res.conditionErrors.length && a.to && daysBetween(entry.date, a.to) < 28) res.conditionWarnings.push("変更日から28日に満たない時点までの結果です（暫定）。");
  } else res.unverified.push("期間：絶対日付が無く、変更日との前後関係を確認できません（meta.json の from/to）。");
  // 他の条件（長さ・検索タイプ・国・デバイス・ブランド）は比較可能性の判定を流用。連続性の警告は「間に変更日がある」ので除く
  const c = checkComparable(after, before, { kind: "pages" });
  res.conditionErrors.push(...c.errors.filter((e) => !e.includes("重なって")));
  res.conditionWarnings.push(...c.warnings.filter((w) => !w.includes("連続していません")));
  res.unverified.push(...c.unverified);
  // 同じURLの、期間内の他の変更
  const others = otherEntries.filter((o) => o.id !== entry.id && pathOf(o.url) === pathOf(entry.url));
  if (others.length) res.conditionWarnings.push(`同じURLに他の変更の記録があります（#${others.map((o) => `${o.id}（${o.date}）`).join("、")}）。効果を切り分けられません。`);

  const pb = findPage(before, entry.url), pa = findPage(after, entry.url);
  res.page = { before: pb, after: pa };
  const qb = findPair(before, entry.url, entry.query), qa = findPair(after, entry.url, entry.query);
  res.pair = { before: qb, after: qa, available: !!(before.pairs && after.pairs) };
  if (!res.pair.available) res.unverified.push("クエリ×ページのCSVが無く、対象クエリでの前後の差を、このURLの値として確認できません（ページ全体の値のみ）。");

  if (res.conditionErrors.length) { res.verdict = "評価不能（条件がそろっていない）"; res.suggestedOutcome = "not-assessable"; return res; }
  if (!pb || !pa) { res.verdict = "評価不能（どちらかの期間に、このURLの行が無い。表示ゼロとは限らず、上限・匿名化の可能性）"; res.suggestedOutcome = "not-assessable"; return res; }
  if (pb.impressions < MIN_IMPRESSIONS_FOR_EFFECT || pa.impressions < MIN_IMPRESSIONS_FOR_EFFECT) { res.verdict = `評価不能（表示回数が少ない：前 ${pb.impressions} / 後 ${pa.impressions}。目安 ${MIN_IMPRESSIONS_FOR_EFFECT} 以上）`; res.suggestedOutcome = "not-assessable"; return res; }

  const dPos = Number((pa.position - pb.position).toFixed(2));
  const dCtr = pa.ctr - pb.ctr;
  const dImpr = pa.impressions / pb.impressions - 1;
  res.delta = { clicks: pa.clicks - pb.clicks, impressions: pa.impressions - pb.impressions, impressionsRatio: dImpr, ctr: dCtr, position: dPos };
  const up = dPos <= -1 && dCtr >= 0, down = dPos >= 1 && dCtr <= 0;
  const hold = Math.abs(dPos) < 1 && Math.abs(dImpr) < 0.2;
  if (up) { res.verdict = "改善の兆候（順位が上がり、CTRは下がっていない。断定はしない）"; res.suggestedOutcome = "improved"; }
  else if (down) { res.verdict = "悪化の兆候（順位が下がり、CTRも上がっていない。変更が原因とは限らない）"; res.suggestedOutcome = "worse"; }
  else if (hold) { res.verdict = "変化小（順位・表示回数とも大きな動きなし）"; res.suggestedOutcome = "flat"; }
  else { res.verdict = "判断保留（指標の動きが一方向でない）"; res.suggestedOutcome = "not-assessable"; }
  return res;
}

const f = (n) => new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 }).format(n);
const pct = (x) => `${(x * 100).toFixed(2)}%`;

export function renderEffect(results, { generatedAt, sample = false } = {}) {
  const L = ["# 効果検証レポート（ローカル・非公開）", "", `生成日: ${generatedAt}`, ""];
  if (sample) L.push("> **サンプル（架空）データです。実測値ではありません。**", "");
  L.push("変更履歴（agency/ledger.json）の各項目について、変更前後の同条件の期間を比較しています。結果は『兆候』であり、成功・失敗の断定ではありません。このファイルは gitignore 済みの場所にだけ出力してください（Search Console の数値を含みます）。", "");
  if (!results.length) L.push("評価対象の変更履歴がありません。", "");
  for (const r of results) {
    L.push(`## #${r.id} ${r.url}`, "", `- 対象クエリ：${r.query}`, `- 変更日：${r.changeDate}`, `- 判定：**${r.verdict}**`, `- ledger への記録候補（自動では記録しません）：\`${r.suggestedOutcome}\``);
    if (r.conditionErrors.length) L.push("", "条件の問題：", ...r.conditionErrors.map((e) => `- ${e}`));
    if (r.conditionWarnings.length) L.push("", "注意：", ...r.conditionWarnings.map((e) => `- ${e}`));
    if (r.unverified.length) L.push("", "未確認：", ...r.unverified.map((e) => `- ${e}`));
    if (r.page?.before && r.page?.after) {
      const b = r.page.before, a = r.page.after;
      L.push("", "| ページ全体 | 前 | 後 |", "| --- | ---: | ---: |", `| クリック | ${f(b.clicks)} | ${f(a.clicks)} |`, `| 表示回数 | ${f(b.impressions)} | ${f(a.impressions)} |`, `| CTR | ${pct(b.ctr)} | ${pct(a.ctr)} |`, `| 平均掲載順位 | ${b.position.toFixed(1)} | ${a.position.toFixed(1)} |`);
    }
    if (r.pair?.before && r.pair?.after) {
      const b = r.pair.before, a = r.pair.after;
      L.push("", `対象クエリ「${r.query}」（このURL）：表示 ${f(b.impressions)} → ${f(a.impressions)}、順位 ${b.position.toFixed(1)} → ${a.position.toFixed(1)}`);
    }
    L.push("");
  }
  L.push("## 共通の注意", "", ...(results[0]?.caveats ?? ["（対象なし）"]).map((c) => `- ${c}`), "");
  return L.join("\n");
}
