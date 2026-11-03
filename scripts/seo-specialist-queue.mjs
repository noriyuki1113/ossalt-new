#!/usr/bin/env node
/**
 * OSSALT SEO：専門監査に回す優先候補の選定（読み取り専用）。
 *
 * 既存の2つの記録を、重複させずに結び付けるだけの小さな道具：
 *   - Quality Intelligence の最新の監査（reports/quality/latest/audit.json。ページ別の品質の欠点と、手元のGSC CSVから付けたページ別の実績）
 *   - SEO変更履歴（agency/ledger.json。28日の確認が終わっていないページは、効果の測定を邪魔しないよう候補から外す）
 * ページ別の実績の評価（順位帯・同順位帯のCTR中央値との比較）は、seo-priority.mjs の関数を再利用する。
 *
 *   npm run build && npm run qi:full           # 先に最新の監査を作る
 *   node scripts/seo-specialist-queue.mjs [--audit reports/quality/latest/audit.json] [--limit 10]
 *        [--out reports/seo/integration/queue.md] [--json reports/seo/integration/queue.json] [--today 2026-10-31]
 *
 * 出力にはSearch Consoleの数値が入る。必ずGit管理外の場所（reports/seo/ ・ agency/reports/）に出す。標準出力には数値を出さない。
 * 点数は「実測」と「仮説」の区分つきの独自の目安で、順位や流入の改善を予測・保証するものではない。
 * ページの削除・統合・noindex・canonical・URLの変更は、この道具では決めない（承認事項）。
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ctrMedianByBand, pageFamily, resolveMinImpressions, scoreRow } from './seo-priority.mjs';

export const MAX_LIMIT = 10;
/** 結び付けた点数の重み（仮説）。合計1。変えるときは docs/seo-specialist-queue.md も直す */
export const WEIGHTS = { search: 0.4, quality: 0.3, fixability: 0.15, scope: 0.15 };
/** この回数未満の表示しか無いページの検索実績は、順位・CTRが偶然に大きく振れるため、信頼度を下げる */
export const SMALL_SAMPLE_IMPRESSIONS = 50;
/** 「同じ原因のページ」の数がこれ以上なら、範囲の点数を最大にする */
export const SCOPE_SATURATION = 20;
/** 改善した効果の測定中とみなす日数（agency/AGENCY.md の28日の確認） */
export const MEASURING_DAYS = 28;

/** 失敗した基準の分類（仮説：修正の見込み）。C2 は要約の追加で、本文の根拠が要る */
const FIX_CLASSES = [
  { id: 'data', label: 'データ・出典・公式リンクの補正', test: (f, w) => w.includes('mirror-source') || f.has('R3') || f.has('R1') || f.has('R2'), fixability: 0.6, basis: '仮説：公式の開発場所の確認と、overrides での補正が要る（データの変更はオーナーの確認）' },
  { id: 'wording', label: '用語・件数・リンクの整合', test: (f, w) => w.some((x) => ['license-term', 'count-mismatch', 'broken-link', 'competitor-oss'].includes(x)) || f.has('R5'), fixability: 0.9, basis: '仮説：小さな差分で直せる（根拠は一次情報で確認する）' },
  { id: 'guide', label: '解説の追加（公式のREADME・LICENSEから）', test: (f) => f.has('U1') || f.has('U2') || f.has('U3'), fixability: 0.5, basis: '仮説：解説の作成が要る（1ページあたりの作業は中。根拠は公式の資料のみ）' },
  { id: 'summary', label: '要約・導入の判断材料の追加', test: (f) => f.has('C2') || f.has('U5') || f.has('C4'), fixability: 0.7, basis: '仮説：既存の解説の本文から、要約を足す（本文に無いことは書かない）' },
];

const failedIds = (page) => new Set((page.criteria ?? []).filter((c) => c.status === 'fail').map((c) => c.id));
const warningIds = (page) => (page.warnings ?? []).map((w) => (typeof w === 'string' ? w : w.id ?? w.code)).filter(Boolean);

export function fixClassOf(page) {
  const f = failedIds(page);
  const w = warningIds(page);
  return FIX_CLASSES.find((c) => c.test(f, w)) ?? { id: 'none', label: '大きな欠点なし', fixability: 0.2, basis: '仮説：直すものが少ない' };
}

/** 28日の確認が終わっていない、変更済みのURL（パス）。効果の測定を邪魔しないよう、候補から外す */
export function measuringPaths(ledger, today) {
  const out = new Map();
  const t = Date.parse(`${today}T00:00:00Z`);
  for (const e of ledger?.entries ?? []) {
    const done = (e.outcomes ?? e.results ?? []).some?.((o) => String(o.stage) === '28');
    const start = Date.parse(`${e.date}T00:00:00Z`);
    if (!Number.isFinite(start) || done) continue;
    if ((t - start) / 86400e3 <= MEASURING_DAYS + 7) {
      try { out.set(new URL(e.url).pathname.replace(/\/?$/, '/'), e.check28 ?? null); } catch { /* 何もしない */ }
    }
  }
  return out;
}

/**
 * @param {Array} pages  QI の audit.json の pages
 * @param {{ledger?: object, today?: string, limit?: number}} opts
 */
export function buildQueue(pages, { ledger = null, today = new Date().toISOString().slice(0, 10), limit = MAX_LIMIT } = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) throw new Error(`limit は1〜${MAX_LIMIT}`);
  const audited = (pages ?? []).filter((p) => p && p.auditState === 'audited');
  const measuring = measuringPaths(ledger, today);

  // 実績（ページ別）の評価の土台：同じ入力の中の、順位帯ごとのCTR中央値（行が少ない帯は比べない）
  const gscRows = audited.filter((p) => p.gsc).map((p) => ({ kind: 'page', label: p.url, ...p.gsc, ctr: p.gsc.ctr / 100 }));
  const min = resolveMinImpressions(gscRows);
  const bands = ctrMedianByBand(gscRows);

  // 範囲：同じ原因（警告・失敗した基準）を共有するページの数（実測）
  const share = new Map();
  for (const p of audited) {
    for (const k of [...warningIds(p).map((w) => `warn:${w}`), ...[...failedIds(p)].map((c) => `crit:${c}`)]) share.set(k, (share.get(k) ?? 0) + 1);
  }

  const excluded = { archived: [], measuring: [], noDefect: 0 };
  const items = [];
  for (const p of audited) {
    const warns = warningIds(p);
    if (p.archived || warns.includes('archived')) { excluded.archived.push(p.url); continue; }
    if (measuring.has(p.url)) { excluded.measuring.push({ url: p.url, check28: measuring.get(p.url) }); continue; }
    const fails = failedIds(p);
    const cls = fixClassOf(p);
    if (!fails.size && !warns.length) { excluded.noDefect++; continue; }

    // 1) 検索実績（実測・ページ別。クエリとは結び付けない）
    let search = { value: 0, status: '未確認', note: 'このページのGSCの行が無い（表示が無かったのか、取得できていないのかは区別できない）', action: null, impressions: null };
    if (p.gsc) {
      const s = scoreRow({ kind: 'page', label: p.url, ...p.gsc, ctr: p.gsc.ctr / 100 }, { bands, minImpressions: min.value });
      search = s
        ? { value: s.score, status: '候補', note: `${s.actionLabel}（${s.reason}）`, action: s.action, impressions: p.gsc.impressions, band: s.band }
        : { value: 0, status: '対象外', note: `表示${p.gsc.impressions >= min.value ? 'は十分だが、順位・CTRが候補の条件に当てはまらない' : `が少ない（${min.value}回未満）`}`, action: null, impressions: p.gsc.impressions };
    }
    // 2) 品質の欠点（実測・QI）。警告（ミラー・用語・リンク切れなど）は点数と別に重く見る
    const severe = warns.filter((w) => ['mirror-source', 'license-term', 'broken-link', 'count-mismatch'].includes(w)).length;
    const quality = Math.min(1, (100 - (p.score ?? 100)) / 100 + 0.2 * severe);
    // 3) 範囲（実測の件数 → 仮説の重み）
    const sharedN = Math.max(1, ...warns.map((w) => share.get(`warn:${w}`) ?? 1));
    const scope = Math.min(1, Math.log10(Math.max(1, sharedN)) / Math.log10(SCOPE_SATURATION));
    // 4) 信頼度（実測の有無で割り引く）
    const verified = p.fix || (p.sources ?? []).length > 0;
    const sample = p.gsc ? (p.gsc.impressions >= SMALL_SAMPLE_IMPRESSIONS ? 1 : 0.7) : 0.5;
    const reliability = Number((sample * (verified ? 1 : 0.85)).toFixed(2));
    // 実績が未確認のページは、検索の項を0にしたうえで、「暫定」として並べる（技術的な品質だけからの候補）
    const normSearch = search.value; // あとで全体の最大で割る
    items.push({
      url: p.url, id: p.id, name: p.name, grade: p.grade, qiScore: p.score, warnings: warns, failed: [...fails], fixClass: cls,
      family: pageFamily(p.url).id, search, quality, scope, sharedN, reliability, provisional: !p.gsc,
      factors: [], _search: normSearch,
    });
  }
  const maxSearch = Math.max(0, ...items.map((i) => i._search));
  for (const i of items) {
    const s = maxSearch > 0 ? i._search / maxSearch : 0;
    const raw = WEIGHTS.search * s + WEIGHTS.quality * i.quality + WEIGHTS.fixability * i.fixClass.fixability + WEIGHTS.scope * i.scope;
    i.score = Number((raw * i.reliability).toFixed(3));
    i.factors = [
      { name: '検索実績（ページ別）', value: Number(s.toFixed(2)), weight: WEIGHTS.search, kind: '実測', note: i.search.note },
      { name: '品質の欠点（QI）', value: Number(i.quality.toFixed(2)), weight: WEIGHTS.quality, kind: '実測', note: `${i.grade}評価 ${i.qiScore}点／失敗した基準 ${i.failed.join('・') || 'なし'}／警告 ${i.warnings.join('・') || 'なし'}` },
      { name: '修正の見込み', value: i.fixClass.fixability, weight: WEIGHTS.fixability, kind: '仮説', note: `${i.fixClass.label}。${i.fixClass.basis}` },
      { name: '範囲（同じ原因のページ数）', value: Number(i.scope.toFixed(2)), weight: WEIGHTS.scope, kind: '仮説', note: `同じ警告を持つページ ${i.sharedN}件（実測）を、対数で重み付け` },
      { name: '信頼度（割り引き）', value: i.reliability, weight: null, kind: '実測', note: i.provisional ? '検索実績が未確認のため暫定' : i.search.impressions < SMALL_SAMPLE_IMPRESSIONS ? '表示が少なく、順位・CTRが偶然で振れやすい' : '検索実績あり' },
    ];
    delete i._search;
  }
  items.sort((a, b) => b.score - a.score || (b.search.impressions ?? -1) - (a.search.impressions ?? -1) || a.url.localeCompare(b.url));
  const labels = new Map();
  for (const p of audited) for (const c of p.criteria ?? []) labels.set(`crit:${c.id}`, c.label);
  const shared = [...share.entries()].map(([key, count]) => ({ key, count, label: labels.get(key) ?? key.replace(/^warn:/, '警告：') })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  return { items: items.slice(0, limit), total: items.length, excluded, minImpressions: min, weights: WEIGHTS, shared };
}

/** 共通の原因の性質（仮説）。共通テンプレートの修正で済むか、ページごとの作業か、承認が要るか */
export function natureOf(key) {
  if (key.startsWith('warn:')) return '個別の確認が要る警告（データ・用語・リンク）';
  const id = key.replace('crit:', '');
  if (/^(U|C2)/.test(id)) return '解説・要約の追加（ページごと。根拠は公式の資料のみ）';
  if (/^R|^C4/.test(id)) return 'データ・出典の確認（データの変更はオーナーの確認）';
  if (/^S/.test(id)) return '内部リンク・index設定（noindex・canonical は承認事項）';
  return '分類なし';
}

export function renderQueue(result, meta = {}) {
  const L = [
    '# 専門監査の優先候補（OSSALT SEO × Quality Intelligence）', '',
    `- 生成：${meta.generatedAt ?? ''}`,
    `- 入力：QI ${meta.auditId ?? '（不明）'}／GSC ${meta.gscSource ?? '未取得'}（ページ別。ウェブ検索・国と端末は絞り込み無し・過去28日。クエリとは結び付けていない）`,
    `- 候補の総数 ${result.total}件のうち、上位 ${result.items.length}件。表示回数のしきい値 ${result.minImpressions.value}回（${result.minImpressions.reason}）`,
    `- 除外：アーカイブ済み ${result.excluded.archived.length}件（掲載の扱いはオーナーの判断）／効果の測定中 ${result.excluded.measuring.length}件／欠点が無い ${result.excluded.noDefect}件`,
    '- **点数は、OSSALT独自の仮説の目安です（順位や流入の改善を予測・保証しません）。** 重み：' + Object.entries(result.weights).map(([k, v]) => `${k} ${v}`).join('・') + '。信頼度を掛けます。', '',
    '| 順位 | ページ | 評価 | 点数 | 実績（ページ別） | 主な欠点 | 施策の分類（仮説） | 信頼度 |', '| ---: | --- | --- | ---: | --- | --- | --- | ---: |',
  ];
  result.items.forEach((i, n) => {
    const perf = i.provisional ? '未確認（暫定）' : `${i.search.impressions}回表示・${i.search.status}`;
    L.push(`| ${n + 1} | ${i.url} | ${i.grade}${i.qiScore} | ${i.score} | ${perf} | ${[...i.warnings, ...i.failed].join('・')} | ${i.fixClass.label} | ${i.reliability} |`);
  });
  L.push('', '## 点数の内訳（実測／仮説の区分つき）', '');
  result.items.forEach((i, n) => {
    L.push(`### ${n + 1}. ${i.name}（${i.url}）— ${i.score}`);
    for (const f of i.factors) L.push(`- ${f.name}：${f.value}${f.weight != null ? `（重み ${f.weight}）` : ''}［${f.kind}］ ${f.note}`);
    L.push('');
  });
  L.push('## 共通の原因（ページ数。共通テンプレートで直せるものと、ページごとの作業を分けて判断する）', '', '| 原因 | ページ数 | 性質（仮説） |', '| --- | ---: | --- |');
  for (const c of result.shared.slice(0, 12)) L.push(`| ${c.label}（${c.key.replace(/^(warn|crit):/, '')}） | ${c.count} | ${natureOf(c.key)} |`);
  L.push('');
  if (result.excluded.measuring.length) L.push('## 効果の測定中のため、候補から外したページ', '', ...result.excluded.measuring.map((m) => `- ${m.url}（28日の確認：${m.check28 ?? '未設定'}）`), '');
  L.push('> 検索実績はページ別の集計で、特定のクエリとの対応は示しません。クエリ×ページは、GSCで完全一致に絞った実測が必要です（未取得）。');
  return L.join('\n') + '\n';
}

function flags(argv, allowed) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    if (!allowed.includes(argv[i]) || argv[i + 1] == null || argv[i + 1].startsWith('--')) throw new Error(`不正な引数: ${argv[i]}`);
    o[argv[i].slice(2)] = argv[++i];
  }
  return o;
}

async function main() {
  const o = flags(process.argv.slice(2), ['--audit', '--ledger', '--limit', '--out', '--json', '--today']);
  const auditPath = resolve(o.audit ?? 'reports/quality/latest/audit.json');
  let audit;
  try { audit = JSON.parse(await readFile(auditPath, 'utf8')); } catch { throw new Error(`QIの監査（${auditPath}）を読めません。先に npm run build && npm run qi:full を実行してください`); }
  let ledger = null;
  try { ledger = JSON.parse(await readFile(resolve(o.ledger ?? 'agency/ledger.json'), 'utf8')); } catch { /* 履歴が無ければ測定中の除外はしない */ }
  const result = buildQueue(audit.pages, { ledger, today: o.today, limit: o.limit ? Number(o.limit) : MAX_LIMIT });
  const md = renderQueue(result, { generatedAt: new Date().toISOString(), auditId: audit.summary?.auditId, gscSource: audit.summary?.gscSource });
  const out = resolve(o.out ?? 'reports/seo/integration/queue.md');
  const rel = out.replace(resolve('.') + '/', '');
  if (!/^(reports\/(seo|quality|private)|agency\/reports)\//.test(rel)) throw new Error('出力にはSearch Consoleの数値が入ります。reports/seo/・reports/quality/・reports/private/・agency/reports/ のいずれか（Git管理外）を指定してください');
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, md, 'utf8');
  if (o.json) {
    const jp = resolve(o.json);
    const jrel = jp.replace(resolve('.') + '/', '');
    if (!/^(reports\/(seo|quality|private)|agency\/reports)\//.test(jrel)) throw new Error('--json もGit管理外の場所を指定してください');
    await writeFile(jp, JSON.stringify(result, null, 2) + '\n', 'utf8');
  }
  console.log(`候補 ${result.items.length}件（対象 ${result.total}件）を ${rel} に出力しました。数値を含むため、コミットしないでください`);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]))
  main().catch((e) => { console.error('SEO queue: ' + e.message); process.exitCode = 1; });
