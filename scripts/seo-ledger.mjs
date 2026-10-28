#!/usr/bin/env node
/**
 * SEO変更履歴（Analyst 用）。公開した変更を記録し、28日・約90日の確認期限を管理する。
 *
 *   node scripts/seo-ledger.mjs add --date 2026-11-02 --url https://ossalt.jp/alternatives/notion/ \
 *        --query "notion 代替" --change "titleとdescriptionを見直し" --pr https://github.com/…/pull/50 --window "2026-08-01〜2026-10-31（Web・日本・全デバイス）"
 *   node scripts/seo-ledger.mjs due [--today 2026-12-01]
 *   node scripts/seo-ledger.mjs record --id 1 --stage 28 --outcome improved|flat|worse|not-assessable [--note "…"]
 *   node scripts/seo-ledger.mjs render        # agency/ledger.json から agency/LEDGER.md を作り直す
 *
 * リポジトリは公開されているため、ここに記録するのは「いつ・どのURL・どのクエリを・どう変えたか・確認期限」だけ。
 * Search Console の数値（クリック・表示・順位）は書かない。必要なら ignored の agency/data/ に置く。
 * 90日は計画上の目安で、Googleの固定ルールではない。事実の誤りや技術的な不具合は、期限を待たず直す。
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const OUTCOMES = { improved: '改善', flat: '変化なし', worse: '悪化', 'not-assessable': '評価不能（データ不足・期間中の他の変更など）' };
export const CHECK_DAYS = { 28: 28, 90: 90 };
const HOSTS = ['ossalt.jp', 'www.ossalt.jp'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const NUMERIC_CLAIM_RE = /(クリック|表示回数|表示|CTR|順位|impressions?|clicks?|position)\s*[:：は]?\s*[0-9０-９]/i;

export function isoDate(s) {
  if (!DATE_RE.test(String(s))) throw new Error(`日付は YYYY-MM-DD で指定してください: ${s}`);
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) throw new Error(`存在しない日付です: ${s}`);
  return d;
}
export const addDays = (s, n) => new Date(isoDate(s).getTime() + n * 86_400_000).toISOString().slice(0, 10);

export function validateEntry(e) {
  isoDate(e.date);
  let u;
  try { u = new URL(e.url); } catch { throw new Error(`URLが不正です: ${e.url}`); }
  if (u.protocol !== 'https:' || !HOSTS.includes(u.hostname)) throw new Error(`OSSALTのURLを指定してください: ${e.url}`);
  for (const k of ['query', 'change']) if (!String(e[k] ?? '').trim()) throw new Error(`${k} は必須です`);
  if (e.pr && !/^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+$/.test(e.pr)) throw new Error(`PRのURLが不正です: ${e.pr}`);
  for (const k of ['query', 'change', 'note', 'window']) {
    if (e[k] && NUMERIC_CLAIM_RE.test(e[k])) throw new Error(`${k} に Search Console の数値らしき記述があります。公開リポジトリには数値を書かず、agency/data/ に置いてください`);
  }
}

export function newEntry(ledger, input) {
  const entry = {
    id: (ledger.entries.reduce((m, e) => Math.max(m, e.id), 0)) + 1,
    date: input.date, url: input.url, query: input.query, change: input.change,
    pr: input.pr ?? null, window: input.window ?? null,
    check28: addDays(input.date, CHECK_DAYS[28]), check90: addDays(input.date, CHECK_DAYS[90]),
    outcome28: null, outcome90: null, note: input.note ?? null,
  };
  validateEntry(entry);
  return entry;
}

export function dueEntries(ledger, today) {
  isoDate(today);
  const out = [];
  for (const e of ledger.entries) {
    for (const stage of [28, 90]) {
      if (e[`outcome${stage}`] == null && e[`check${stage}`] <= today) out.push({ id: e.id, stage, due: e[`check${stage}`], url: e.url, query: e.query, overdueDays: Math.round((isoDate(today) - isoDate(e[`check${stage}`])) / 86_400_000) });
    }
  }
  return out.sort((a, b) => a.due.localeCompare(b.due) || a.id - b.id);
}

export function recordOutcome(ledger, { id, stage, outcome, note }) {
  const e = ledger.entries.find((x) => x.id === Number(id));
  if (!e) throw new Error(`id ${id} の記録がありません`);
  if (![28, 90].includes(Number(stage))) throw new Error('stage は 28 か 90');
  if (!OUTCOMES[outcome]) throw new Error(`outcome は ${Object.keys(OUTCOMES).join(' / ')} のいずれか`);
  if (note && NUMERIC_CLAIM_RE.test(note)) throw new Error('noteに Search Console の数値らしき記述があります。数値は agency/data/ に置いてください');
  e[`outcome${stage}`] = outcome;
  if (note) e.note = [e.note, `${stage}日: ${note}`].filter(Boolean).join(' / ');
}

const cell = (s) => String(s ?? '—').replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
export function renderLedger(ledger) {
  const rows = ledger.entries.map((e) => `| ${e.id} | ${e.date} | ${cell(e.url)} | ${cell(e.query)} | ${cell(e.window)} | ${cell(e.change)} | ${e.pr ? e.pr : '—'} | ${e.check28}（${e.outcome28 ? OUTCOMES[e.outcome28] : '未確認'}） | ${e.check90}（${e.outcome90 ? OUTCOMES[e.outcome90] : '未確認'}） | ${cell(e.note)} |`);
  return [
    '# OSSALT SEO change ledger', '',
    '公開した変更の記録です（`agency/ledger.json` から `node scripts/seo-ledger.mjs render` で作ります。直接編集しないでください）。',
    'リポジトリは公開されているため、Search Console の数値は書きません。変更前後の数値は、ignored の `agency/data/` に保存します。',
    '90日は計画上の目安で、Googleの固定ルールではありません。事実の誤りや技術的な不具合は、期限を待たず直します。', '',
    '| # | 公開日 | URL | 対象クエリ | 比較の条件（期間・検索の種類・国・デバイス） | 変更内容と根拠 | PR | 28日の確認 | 約90日の確認 | 備考 |',
    '| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...(rows.length ? rows : ['| — | — | — | — | — | まだ公開した変更はありません | — | — | — | — |']), '',
  ].join('\n');
}

const LEDGER_JSON = 'agency/ledger.json';
const LEDGER_MD = 'agency/LEDGER.md';
export async function loadLedger(path = LEDGER_JSON) {
  try { return JSON.parse(await readFile(resolve(path), 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return { version: 1, entries: [] }; throw new Error(`${path} を読めません: ${e.message}`); }
}
async function save(ledger) {
  await mkdir(dirname(resolve(LEDGER_JSON)), { recursive: true });
  await writeFile(resolve(LEDGER_JSON), JSON.stringify(ledger, null, 2) + '\n', 'utf8');
  await writeFile(resolve(LEDGER_MD), renderLedger(ledger), 'utf8');
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
  const [cmd, ...rest] = process.argv.slice(2);
  const ledger = await loadLedger();
  if (cmd === 'add') {
    const o = flags(rest, ['--date', '--url', '--query', '--change', '--pr', '--window', '--note']);
    const entry = newEntry(ledger, o);
    ledger.entries.push(entry);
    await save(ledger);
    console.log(`記録しました（#${entry.id}）。28日の確認: ${entry.check28} / 約90日の確認: ${entry.check90}`);
  } else if (cmd === 'due') {
    const o = flags(rest, ['--today']);
    const today = o.today ?? new Date().toISOString().slice(0, 10);
    const due = dueEntries(ledger, today);
    if (!due.length) console.log(`${today} 時点で、確認期限を過ぎた未確認の項目はありません（記録${ledger.entries.length}件）`);
    for (const d of due) console.log(`#${d.id} ${d.stage}日の確認（期限 ${d.due}、${d.overdueDays}日経過）：${d.url} / ${d.query}`);
  } else if (cmd === 'record') {
    recordOutcome(ledger, flags(rest, ['--id', '--stage', '--outcome', '--note']));
    await save(ledger);
    console.log('更新しました');
  } else if (cmd === 'render') {
    await save(ledger);
    console.log(`${LEDGER_MD} を作り直しました（記録${ledger.entries.length}件）`);
  } else throw new Error('使い方: add | due | record | render（ファイル先頭の説明を参照）');
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]))
  main().catch((e) => { console.error('SEO ledger: ' + e.message); process.exitCode = 1; });
