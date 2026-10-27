#!/usr/bin/env node
/**
 * Search Console API（searchanalytics.query）から、読み取り専用で実績を取得し、
 * seo-agency.mjs がそのまま読める CSV（query / page / pair）として agency/data/ に保存する。
 *
 * - 認証情報（サービスアカウントのJSONキー）はリポジトリに置かない。環境変数 GSC_KEY_FILE にパスだけを渡す。
 * - 対象サイトは環境変数 GSC_SITE（例: sc-domain:ossalt.jp または https://ossalt.jp/）。
 * - 取得のみ（scope は webmasters.readonly）。書き込み・送信はしない。保存先 agency/data/ は .gitignore 済み。
 * - 依存パッケージなし（node:crypto と fetch）。テストでは fetchImpl を差し替える。
 *
 * 使い方: GSC_KEY_FILE=~/.config/ossalt/gsc-key.json GSC_SITE=sc-domain:ossalt.jp \
 *   node scripts/gsc-api-fetch.mjs --days 28 [--out agency/data/api-YYYY-MM-DD]
 */
import { createSign } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
export const TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const API_BASE = 'https://www.googleapis.com/webmasters/v3/sites';
export const ROW_LIMIT = 25000;
export const MAX_ROWS = 250000; // 暴走防止の上限

const b64url = (v) => Buffer.from(v).toString('base64url');

export function parseKey(json) {
  let key;
  try { key = JSON.parse(json); } catch { throw new Error('キーファイルがJSONとして読めません'); }
  if (key.type !== 'service_account' || !key.client_email || !key.private_key) {
    throw new Error('サービスアカウントのキー（client_email と private_key を含むJSON）が必要です');
  }
  return key;
}

export function buildAssertion(key, nowSec = Math.floor(Date.now() / 1000)) {
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: key.client_email, scope: SCOPE, aud: TOKEN_URL, iat: nowSec, exp: nowSec + 3600 }));
  const sig = createSign('RSA-SHA256').update(`${head}.${claim}`).sign(key.private_key, 'base64url');
  return `${head}.${claim}.${sig}`;
}

export async function getAccessToken(key, fetchImpl = fetch) {
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: buildAssertion(key) }),
  });
  if (!res.ok) throw new Error(`アクセストークンを取得できません（HTTP ${res.status}）`);
  const body = await res.json();
  if (!body.access_token) throw new Error('アクセストークンが応答にありません');
  return body.access_token;
}

/** 1つの dimensions の組について、全ページ分の行を取得する */
export async function queryAll({ token, site, startDate, endDate, dimensions, fetchImpl = fetch }) {
  const url = `${API_BASE}/${encodeURIComponent(site)}/searchAnalytics/query`;
  const rows = [];
  for (let startRow = 0; rows.length < MAX_ROWS; startRow += ROW_LIMIT) {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ startDate, endDate, dimensions, rowLimit: ROW_LIMIT, startRow, dataState: 'final' }),
    });
    if (res.status === 403) throw new Error('権限がありません。サービスアカウントのメールをSearch Consoleのユーザーに追加したか、GSC_SITEの形式（sc-domain: か URLプレフィックス）を確認してください');
    if (!res.ok) throw new Error(`Search Console APIがHTTP ${res.status}を返しました`);
    const body = await res.json();
    const batch = body.rows ?? [];
    rows.push(...batch);
    if (batch.length < ROW_LIMIT) break;
  }
  return rows;
}

const csvCell = (v) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const HEADERS = { query: ['query'], page: ['page'], pair: ['query', 'page'] };

/** APIの行を、seo-agency.mjs が読むCSVにする。CTRは割合（0〜1）のまま */
export function rowsToCsv(kind, rows) {
  const lines = [[...HEADERS[kind], 'clicks', 'impressions', 'ctr', 'position'].join(',')];
  for (const r of rows) {
    lines.push([...r.keys, r.clicks, r.impressions, r.ctr, r.position].map(csvCell).join(','));
  }
  return lines.join('\n') + '\n';
}

export function dateRange(days, today = new Date()) {
  // Search Consoleの確定データは2〜3日遅れる。終了日は3日前にそろえる
  const end = new Date(today.getTime() - 3 * 86400000);
  const start = new Date(end.getTime() - (days - 1) * 86400000);
  const f = (d) => d.toISOString().slice(0, 10);
  return { startDate: f(start), endDate: f(end) };
}

export async function fetchAll({ key, site, days = 28, today, fetchImpl = fetch }) {
  const token = await getAccessToken(key, fetchImpl);
  const range = dateRange(days, today);
  const out = {};
  for (const [kind, dimensions] of [['query', ['query']], ['page', ['page']], ['pair', ['query', 'page']]]) {
    out[kind] = await queryAll({ token, site, ...range, dimensions, fetchImpl });
  }
  return { range, ...out };
}

async function main(argv, env) {
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const days = Number(arg('--days') ?? 28);
  if (!Number.isInteger(days) || days < 1 || days > 480) throw new Error('--days は1〜480の整数');
  if (!env.GSC_KEY_FILE || !env.GSC_SITE) {
    throw new Error('環境変数 GSC_KEY_FILE（キーのパス）と GSC_SITE（例: sc-domain:ossalt.jp）が必要です。キーはリポジトリに置かないでください');
  }
  const key = parseKey(await readFile(env.GSC_KEY_FILE, 'utf8'));
  const result = await fetchAll({ key, site: env.GSC_SITE, days });
  const dir = resolve(arg('--out') ?? `agency/data/api-${new Date().toISOString().slice(0, 10)}`);
  if (!dir.includes(`${resolve('agency/data')}`)) throw new Error('保存先は agency/data/ 以下にしてください（コミット対象外）');
  await mkdir(dir, { recursive: true });
  for (const kind of ['query', 'page', 'pair']) {
    const rows = result[kind].map((r) => ({ keys: r.keys, clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }));
    await writeFile(resolve(dir, `${kind === "query" ? "queries" : kind + "s"}.csv`), rowsToCsv(kind, rows));
  }
  await writeFile(resolve(dir, 'meta.json'), JSON.stringify({ site: env.GSC_SITE, ...result.range, fetchedAt: new Date().toISOString(), counts: { query: result.query.length, page: result.page.length, pair: result.pair.length } }, null, 2));
  console.log(`取得完了: ${dir}\n期間 ${result.range.startDate}〜${result.range.endDate}  クエリ${result.query.length}件 / ページ${result.page.length}件 / 組${result.pair.length}件`);
  console.log(`次: node scripts/seo-agency.mjs --queries ${dir}/queries.csv --pages ${dir}/pages.csv --pairs ${dir}/pairs.csv --site out`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2), process.env).catch((e) => { console.error(`エラー: ${e.message}`); process.exit(1); });
}
