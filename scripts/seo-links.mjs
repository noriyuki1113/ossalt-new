#!/usr/bin/env node
/**
 * 内部リンクの候補（Linker 用・読み取り専用）。
 *   npm run build && node scripts/seo-links.mjs --target /alternatives/notion/ [--dir out] [--out agency/reports/links.md]
 *
 * 対象ページに「データの上で関連する」のに、まだリンクしていないページを、実在するページの中から挙げる。
 * 関連は、掲載データ（public/data/tools.json）の代替対象・カテゴリ・ライセンス区分と、ビルド済みHTMLのリンクの事実だけから決める。
 * 順位への効果は示さない。リンクを置くかどうか・文脈・アンカーテキストは、本文を読んで人が決める（機械的な一括挿入はしない）。
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { internalPath, loadSite } from './seo-audit-lib.mjs';

/** src/lib/tools.ts の slugifyCompetitor と同じ規則（同じであることは seo-links.test.mjs で確かめる） */
const OVERRIDES = { マネーフォワード: 'moneyforward', 調整さん: 'chouseisan', メールディーラー: 'mail-dealer' };
export function slugifyCompetitor(name) {
  if (OVERRIDES[name]) return OVERRIDES[name];
  return String(name).toLowerCase().replace(/\./g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** ツール → 関連するページ（代替ページのslugの一覧、カテゴリ） */
export function toolRelations(t) {
  const slugs = [t.primary_competitor, ...(t.also_competitors ?? [])].map(slugifyCompetitor).filter(Boolean);
  return { alternatives: [...new Set(slugs)], category: t.category };
}

/** 比較ページのslug（a-vs-b）を、ツールidの組に分ける。idにハイフンが含まれていても、両方が実在するidになる分け方だけを採る */
export function splitCompareSlug(slug, ids) {
  const parts = slug.split('-vs-');
  const out = [];
  for (let i = 1; i < parts.length; i++) {
    const a = parts.slice(0, i).join('-vs-'), b = parts.slice(i).join('-vs-');
    if (ids.has(a) && ids.has(b)) out.push([a, b]);
  }
  return out.length === 1 ? out[0] : null;
}

/**
 * target（例 /alternatives/notion/）に、データの上で関連するページ（リンク元の候補）を返す。
 * すでにリンクしているページは除く。各候補に「なぜ関連するか」を付ける。
 */
export function linkCandidates({ target, pages, tools, base = 'https://ossalt.jp' }) {
  if (!pages.has(target)) throw new Error(`${target} はビルド済みサイトに存在しません`);
  const ids = new Set(tools.map((t) => t.id));
  const byId = new Map(tools.map((t) => [t.id, t]));
  const rel = (t) => toolRelations(t);
  const linksTo = (from, to) => (pages.get(from)?.links ?? []).some((h) => internalPath(h, base) === to);
  const cands = new Map();
  const add = (path, why) => {
    if (path === target || !pages.has(path) || pages.get(path).refresh || pages.get(path).noindex) return;
    if (linksTo(path, target)) return;
    const c = cands.get(path) ?? { path, reasons: [] };
    if (!c.reasons.includes(why)) c.reasons.push(why);
    cands.set(path, c);
  };
  const comparePages = [...pages.keys()].filter((p) => /^\/compare\/[^/]+\/$/.test(p)).map((p) => {
    const pair = splitCompareSlug(p.split('/')[2], ids);
    return pair ? { path: p, pair } : null;
  }).filter(Boolean);

  let m;
  if ((m = /^\/alternatives\/([^/]+)\/$/.exec(target))) {
    const slug = m[1];
    const group = tools.filter((t) => rel(t).alternatives.includes(slug));
    for (const t of group) add(`/tools/${t.id}/`, `${t.name}は、この代替ページの候補（掲載データで代替対象が同じ）`);
    for (const c of comparePages) if (c.pair.some((id) => group.some((t) => t.id === id))) add(c.path, '同じSaaSの代替どうしの比較ページ');
  } else if ((m = /^\/tools\/([^/]+)\/$/.exec(target))) {
    const t = byId.get(m[1]);
    if (!t) throw new Error(`ツール ${m[1]} が掲載データにありません`);
    for (const slug of rel(t).alternatives) add(`/alternatives/${slug}/`, `${t.name}の代替対象（${slug}）の代替ページ`);
    for (const c of comparePages) if (c.pair.includes(t.id)) add(c.path, `${t.name}を含む比較ページ`);
    for (const o of tools) if (o.id !== t.id && o.category === t.category && rel(o).alternatives.some((s) => rel(t).alternatives.includes(s))) add(`/tools/${o.id}/`, `同じ代替対象・同じカテゴリのツール（${o.name}）`);
  } else if ((m = /^\/compare\/([^/]+)\/$/.exec(target))) {
    const pair = splitCompareSlug(m[1], ids);
    if (!pair) throw new Error('比較ページのslugからツールを特定できません');
    for (const id of pair) {
      const t = byId.get(id);
      add(`/tools/${id}/`, `${t.name}の詳細ページ（比較の当事者）`);
      for (const slug of rel(t).alternatives) add(`/alternatives/${slug}/`, `${t.name}の代替対象の代替ページ`);
    }
  } else throw new Error('対象は /alternatives/<slug>/ /tools/<id>/ /compare/<slug>/ のいずれか');
  const inboundNow = [...pages.keys()].filter((p) => linksTo(p, target)).length;
  return { target, inboundNow, candidates: [...cands.values()].sort((a, b) => b.reasons.length - a.reasons.length || a.path.localeCompare(b.path)) };
}

export function renderLinks(r, generatedAt) {
  const L = ['# 内部リンクの候補（読み取り専用）', '', `- 生成日: ${generatedAt}`, `- 対象: ${r.target}`, `- 現在このページへリンクしているページ: ${r.inboundNow}件`, ''];
  if (!r.candidates.length) L.push('データの上で関連するのに未リンクのページは、見つかりませんでした。');
  else {
    L.push('| リンク元の候補 | 関連する理由（データ上の事実） |', '| --- | --- |');
    for (const c of r.candidates) L.push(`| ${c.path} | ${c.reasons.join('／')} |`);
  }
  L.push('', '> 候補は関連の事実だけから出しています。リンクを置くか、置く文脈・アンカーテキストは、リンク元の本文を読んで決めてください（同じ語句の繰り返しや、数合わせのリンクは避ける）。');
  return L.join('\n') + '\n';
}

async function main() {
  const o = { dir: 'out' };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (!['--target', '--dir', '--out', '--base'].includes(argv[i]) || !argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error(`不正な引数: ${argv[i]}`);
    o[argv[i].slice(2)] = argv[++i];
  }
  if (!o.target) throw new Error('--target に /alternatives/<slug>/ などのパスを指定してください');
  const site = await loadSite(resolve(o.dir));
  if (!site.pages.size) throw new Error(`${o.dir}/ にビルド結果がありません。先に npm run build を実行してください`);
  const tools = JSON.parse(await readFile(resolve('public/data/tools.json'), 'utf8')).filter((t) => !t.github_archived);
  const md = renderLinks(linkCandidates({ target: o.target, pages: site.pages, tools, base: o.base ?? 'https://ossalt.jp' }), new Date().toISOString().slice(0, 10));
  if (o.out) { await mkdir(dirname(resolve(o.out)), { recursive: true }); await writeFile(resolve(o.out), md, 'utf8'); console.log(`保存: ${o.out}`); }
  else console.log(md);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]))
  main().catch((e) => { console.error('SEO links: ' + e.message); process.exitCode = 1; });
