#!/usr/bin/env node
/**
 * OSSALTの本番ドメインが最新のSEO改善を配信しているか確認する。
 * GitHub Pagesのworkflow成功と独自ドメインの反映は別なので、実HTTPを読む。
 * 外部URLは読み取り専用。認証情報は送信しない。
 */
import dns from 'node:dns/promises';
import { appendFile } from 'node:fs/promises';

const sources = [
  { name: 'ossalt.jp', base: 'https://ossalt.jp' },
  { name: 'Cloudflare Pages', base: 'https://ossalt-new.pages.dev' },
  { name: 'GitHub Pages', base: 'https://noriyuki1113.github.io/ossalt-new' },
];

const routes = [
  { path: '/tools/', marker: 'オープンソースソフトウェア一覧' },
  { path: '/compare/', marker: 'まず読みたい、OSSの比較ガイド' },
  { path: '/alternatives/notion/', marker: 'Notionの代替OSSは、何を置き換えたいかで選ぶ' },
  { path: '/compare/borg-vs-restic/', marker: 'BorgBackupとRestic、どっちを選ぶ？' },
];

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const escapeCell = (s) => String(s ?? '').replaceAll('|', '/').replaceAll('\n', ' ').slice(0, 160);

async function inspect(base, route) {
  const url = base.replace(/\/$/, '') + route.path;
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(17000),
      headers: { 'user-agent': 'OSSALT-Growth-Deployment-Check/1.0', 'cache-control': 'no-cache', pragma: 'no-cache' },
    });
    const html = await response.text();
    const missing = !html.includes(route.marker);
    return {
      path: route.path,
      status: response.status,
      ok: response.ok && !missing,
      marker: !missing,
      responseUrl: response.url,
      server: response.headers.get('server') || '',
      cfCache: response.headers.get('cf-cache-status') || '',
      cfRay: response.headers.get('cf-ray') || '',
      age: response.headers.get('age') || '',
      cacheControl: response.headers.get('cache-control') || '',
      bytes: html.length,
    };
  } catch (err) {
    return { path: route.path, ok: false, marker: false, status: 'ERROR', error: String(err?.message || err) };
  }
}

async function inspectSource(source, retries = 1) {
  let result = [];
  for (let attempt = 0; attempt < retries; attempt++) {
    result = await Promise.all(routes.map((route) => inspect(source.base, route)));
    if (result.every((r) => r.ok)) break;
    if (attempt < retries - 1) await sleep(20000);
  }
  return { ...source, routes: result };
}


const redirectSamples = [
  { path: '/tools/194/', target: '/tools/zammad/' },
  { path: '/tools/254/', target: '/tools/plane/' },
];

async function inspectLegacyRedirect(base, sample) {
  const requestUrl = base.replace(/\\/$/, '') + sample.path;
  try {
    const response = await fetch(requestUrl, {
      redirect: 'manual',
      signal: AbortSignal.timeout(17000),
      headers: { 'user-agent': 'OSSALT-Growth-Deployment-Check/1.0', 'cache-control': 'no-cache', pragma: 'no-cache' },
    });
    const location = response.headers.get('location') || '';
    const target = location ? new URL(location, requestUrl).pathname : '';
    return {
      path: sample.path,
      expected: sample.target,
      status: response.status,
      location,
      ok: (response.status === 301 || response.status === 308) && target === sample.target,
    };
  } catch (e) {
    return { path: sample.path, expected: sample.target, status: 'ERROR', location: String(e.message), ok: false };
  }
}

async function dnsInfo() {
  const result = {};
  for (const name of ['ossalt.jp', 'www.ossalt.jp']) {
    const data = {};
    for (const [kind, method] of [['A', dns.resolve4], ['CNAME', dns.resolveCname]]) {
      try { data[kind] = await method(name); } catch (e) { data[kind] = e.code || 'unavailable'; }
    }
    result[name] = data;
  }
  return result;
}

async function main() {
  const [custom, cloudflare, github] = await Promise.all([
    inspectSource(sources[0], 3),
    inspectSource(sources[1]),
    inspectSource(sources[2]),
  ]);
  const results = [custom, cloudflare, github];
  const dnsResults = await dnsInfo();
  // HTTPリダイレクトをfollowしてしまうとmeta refresh（200）との区別ができない。
  const legacy = await Promise.all(redirectSamples.map((x) => inspectLegacyRedirect(sources[0].base, x)));
  const legacyPages = await Promise.all(redirectSamples.map((x) => inspectLegacyRedirect(sources[1].base, x)));
  const lines = [
    '## OSSALT 公開ドメイン反映チェック', '',
    'GitHub Pagesの公開成功だけでなく、ユーザーが開くドメインのHTMLを直接確認します。',
    '参照先のプレビュー環境は診断用で、本番合否には含めません。', '',
    '| 配信先 | ページ | HTTP | 新しい内容 | CF cache | Age | 最終URL |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const source of results) {
    for (const r of source.routes) {
      lines.push('| ' + [source.name, r.path, r.status, r.ok ? 'OK' : '未確認/旧版', r.cfCache, r.age, r.responseUrl || r.error || ''].map(escapeCell).join(' | ') + ' |');
    }
  }
  lines.push('', '### 旧URLのHTTP 301確認', '',
    '| 配信先 | 旧URL | HTTP | Location | 結果 |',
    '| --- | --- | --- | --- | --- |');
  for (const [source, entries] of [['ossalt.jp', legacy], ['Cloudflare Pages', legacyPages]]) {
    for (const r of entries) {
      lines.push('| ' + [source, r.path, r.status, r.location || '', r.ok ? 'OK' : 'NG'].map(escapeCell).join(' | ') + ' |');
    }
  }
  lines.push('', '### DNS（公開情報）', '', JSON.stringify(dnsResults, null, 2), '');
  const passed = custom.routes.every((r) => r.ok) && legacy.every((r) => r.ok);
  lines.push(passed ? '✅ ossalt.jp の必須4ページと旧URL301を確認' : '❌ ossalt.jp のHTMLか旧URLのHTTP 301が未確認です。Cloudflare Pages本番とカスタムドメインを点検してください。', '');
  const report = lines.join('\n');
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, report);
  if (!passed) process.exitCode = 1;
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
