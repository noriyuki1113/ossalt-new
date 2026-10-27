/**
 * ビルド済みサイト（out/）の読み取り専用SEO監査（Technician / Linker 用）。
 *
 * - 何も書き換えない。out/ のHTMLと sitemap.xml・robots.txt を読んで、事実だけを集計する。
 * - 「問題」と「確認が必要」を分ける。意図的な設定（解説の無い比較ページの noindex など）は問題にしない。
 * - 純粋関数（HTML文字列 → 抽出）と、ファイルを読む関数を分け、テストできるようにしている。
 */
import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const decode = (s) =>
  String(s ?? "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'");

const attr = (tag, name) => {
  const m = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i").exec(tag);
  return m ? decode(m[2] ?? m[3]) : null;
};

/** 1ページぶんのHTMLから、SEOに関わる項目を取り出す */
export function extractPage(html) {
  const title = decode((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "").trim()) || null;
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
  const meta = (name) => {
    const t = metas.find((x) => (attr(x, "name") ?? "").toLowerCase() === name);
    return t ? attr(t, "content") : null;
  };
  const canonicalTag = /<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>/i.exec(html)?.[0];
  const robots = meta("robots");
  const jsonld = [];
  const jsonldErrors = [];
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { jsonld.push(JSON.parse(m[1])); } catch (e) { jsonldErrors.push(String(e.message)); }
  }
  const body = html.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<style\b[\s\S]*?<\/style>/gi, "");
  const links = [...body.matchAll(/<a\b[^>]*>/gi)].map((m) => attr(m[0], "href")).filter((h) => h != null);
  const h1 = [...body.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => decode(m[1].replace(/<[^>]+>/g, "").trim())).filter(Boolean);
  const refreshTag = metas.find((x) => (attr(x, "http-equiv") ?? "").toLowerCase() === "refresh");
  const refresh = refreshTag ? /url\s*=\s*(\S+)/i.exec(attr(refreshTag, "content") ?? "")?.[1] ?? null : null;
  return {
    refresh,
    title,
    description: meta("description"),
    canonical: canonicalTag ? attr(canonicalTag, "href") : null,
    robots,
    noindex: /(^|[\s,])noindex([\s,]|$)/i.test(robots ?? ""),
    viewport: meta("viewport"),
    lang: /<html\b[^>]*\blang\s*=\s*["']([^"']+)["']/i.exec(html)?.[1] ?? null,
    h1,
    jsonld,
    jsonldErrors,
    links,
  };
}

/** 内部リンク（href）を、サイト内のパス（末尾スラッシュ・ハッシュ・クエリなし）にそろえる。外部・メール等は null */
export function internalPath(href, base) {
  if (!href || /^(mailto:|tel:|javascript:|#)/i.test(href)) return null;
  let u;
  try { u = new URL(href, base + "/"); } catch { return null; }
  if (u.origin !== new URL(base).origin) return null;
  let p = decodeURIComponent(u.pathname);
  if (!p.endsWith("/") && !/\.[a-z0-9]+$/i.test(p)) p += "/";
  return p;
}

export function parseSitemap(xml) {
  return [...String(xml).matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((m) => decode(m[1].trim()));
}

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

/** out/ のHTMLを読み、パス → 抽出結果の Map にする */
export async function loadSite(outDir) {
  const pages = new Map();
  for await (const file of walk(outDir)) {
    if (!file.endsWith(".html")) continue;
    const rel = relative(outDir, file).split(sep).join("/");
    if (rel === "404.html") continue;
    const path = rel === "index.html" ? "/" : "/" + rel.replace(/index\.html$/, "").replace(/\.html$/, "/");
    pages.set(path, extractPage(await readFile(file, "utf8")));
  }
  let sitemap = [], robots = null;
  try { sitemap = parseSitemap(await readFile(join(outDir, "sitemap.xml"), "utf8")); } catch {}
  try { robots = await readFile(join(outDir, "robots.txt"), "utf8"); } catch {}
  return { pages, sitemap, robots };
}

/** ページの種類（監査の集計単位） */
export function familyOf(path) {
  const m = /^\/([^/]+)\/([^/]+)\/$/.exec(path);
  if (m && ["tools", "alternatives", "compare", "licenses", "blog", "categories"].includes(m[1])) return m[1];
  return path === "/" ? "home" : "other";
}

// titleの長さは検索結果の表示幅（ピクセル）で決まり、Googleがtitleを書き換えることもある。ここは目安（仮説）で、事実ではない
const TITLE_MAX = 70;
const widthOf = (s) => [...s].reduce((n, c) => n + (/[\u0000-ÿ]/.test(c) ? 1 : 2), 0);

/**
 * 監査。issues = 直す必要がある事実、review = 意図的かもしれず、影響範囲を見てから判断するもの。
 * 各項目に、該当ページの件数と例（最大5件）を付ける。
 */
export function audit({ pages, sitemap, robots }, { base = "https://ossalt.jp", archived = new Set() } = {}) {
  const issues = [];
  const review = [];
  const add = (list, code, message, paths) => {
    if (paths.length) list.push({ code, message, count: paths.length, examples: paths.slice(0, 5) });
  };
  // 転送用の小さなページ（掲載をやめたURLの転送。data-source/redirects.json）と、フレームワークの内部ページは、
  // 通常のページの検査から外し、転送先の存在だけを確かめる
  const isInternal = (k) => k === "/404/" || k === "/_not-found/";
  const redirects = [...pages.entries()].filter(([, p]) => p.refresh);
  const entries = [...pages.entries()].filter(([k, p]) => !p.refresh && !isInternal(k));
  const indexable = entries.filter(([, p]) => !p.noindex);
  const sitemapPaths = new Set(sitemap.map((u) => internalPath(u, base)).filter(Boolean));

  add(issues, "title-missing", "titleが無い", entries.filter(([, p]) => !p.title).map(([k]) => k));
  add(issues, "description-missing", "meta descriptionが無い（indexされるページ）", indexable.filter(([, p]) => !p.description).map(([k]) => k));
  add(issues, "canonical-missing", "canonicalが無い（indexされるページ）", indexable.filter(([, p]) => !p.canonical).map(([k]) => k));
  add(
    issues, "canonical-mismatch", "canonicalが自分のURLと一致しない",
    entries.filter(([k, p]) => p.canonical && internalPath(p.canonical, base) !== k).map(([k]) => k)
  );
  add(issues, "h1-count", "h1が1つではない（indexされるページ）", indexable.filter(([, p]) => p.h1.length !== 1).map(([k]) => k));
  add(issues, "viewport-missing", "viewportが無い（モバイル表示）", entries.filter(([, p]) => !p.viewport).map(([k]) => k));
  add(issues, "lang-missing", "html lang が無い", entries.filter(([, p]) => !p.lang).map(([k]) => k));
  add(issues, "jsonld-invalid", "JSON-LDの構文が壊れている", entries.filter(([, p]) => p.jsonldErrors.length).map(([k]) => k));

  // サイトマップ
  add(issues, "sitemap-noindex", "noindex のページがサイトマップに載っている", [...sitemapPaths].filter((p) => pages.get(p)?.noindex));
  add(issues, "sitemap-redirect", "転送ページがサイトマップに載っている", [...sitemapPaths].filter((p) => pages.get(p)?.refresh));
  add(issues, "sitemap-missing-page", "サイトマップのURLに対応するページが出力に無い（404の可能性）", [...sitemapPaths].filter((p) => !pages.has(p) && !isInternal(p)));
  add(
    review, "indexable-not-in-sitemap", "indexされるがサイトマップに載っていない（アーカイブ済みツールなど、意図的な場合がある）",
    indexable.map(([k]) => k).filter((k) => !sitemapPaths.has(k) && !archived.has(k))
  );
  if (archived.size) review.push({ code: "archived-info", message: `アーカイブ済み（開発終了）のツール ${archived.size}件は、サイトマップ・内部リンクの対象外として扱った（意図的な設計。ページ自体はindexされる）`, count: archived.size, examples: [] });
  add(
    issues, "redirect-target-missing", "転送ページの転送先が存在しない",
    redirects.filter(([, p]) => !pages.has(internalPath(p.refresh, base)) || pages.get(internalPath(p.refresh, base))?.refresh).map(([k, p]) => `${k} → ${p.refresh}`)
  );
  add(
    issues, "redirect-canonical-mismatch", "転送ページのcanonicalが転送先と一致しない",
    redirects.filter(([, p]) => p.canonical && internalPath(p.canonical, base) !== internalPath(p.refresh, base)).map(([k]) => k)
  );
  if (!robots) issues.push({ code: "robots-missing", message: "robots.txt が出力に無い", count: 1, examples: [] });
  else {
    if (!/sitemap:\s*\S+/i.test(robots)) issues.push({ code: "robots-sitemap", message: "robots.txt に Sitemap 行が無い", count: 1, examples: [] });
    if (/^\s*disallow:\s*\/\s*$/im.test(robots)) issues.push({ code: "robots-disallow-all", message: "robots.txt が全体を Disallow している", count: 1, examples: [] });
  }

  // 重複
  const dup = (field) => {
    const groups = new Map();
    for (const [k, p] of indexable) if (p[field]) groups.set(p[field], [...(groups.get(p[field]) ?? []), k]);
    return [...groups.values()].filter((g) => g.length > 1);
  };
  const dupTitles = dup("title");
  if (dupTitles.length) review.push({ code: "title-duplicate", message: `同じtitleがindexされる複数のページにある（${dupTitles.length}組）`, count: dupTitles.length, examples: dupTitles.slice(0, 5).map((g) => g.slice(0, 3).join(" , ")) });
  const dupDesc = dup("description");
  if (dupDesc.length) review.push({ code: "description-duplicate", message: `同じdescriptionがindexされる複数のページにある（${dupDesc.length}組）`, count: dupDesc.length, examples: dupDesc.slice(0, 5).map((g) => g.slice(0, 3).join(" , ")) });

  add(review, "title-long", `titleが長い（半角1・全角2で数えて${TITLE_MAX}超。省略される可能性があるという目安で、実際の表示はGSCとSERPで確認）`, indexable.filter(([, p]) => p.title && widthOf(p.title) > TITLE_MAX * 1.0).map(([k]) => k));
  add(review, "description-short", "descriptionが短い（全角換算で50未満）", indexable.filter(([, p]) => p.description && widthOf(p.description) < 50).map(([k]) => k));

  // 内部リンク切れ（出力に存在しないパスへのリンク）
  const broken = new Map();
  const toRedirect = new Map();
  const inbound = new Map(entries.map(([k]) => [k, new Set()]));
  for (const [from, p] of entries) {
    for (const href of p.links) {
      const to = internalPath(href, base);
      if (!to || /\.[a-z0-9]+$/i.test(to)) continue;
      if (!pages.has(to)) {
        // 外部の静的ファイル（/md/…）や API の出力は pages に無い。HTML のページだけを見る
        if (/^\/(md|api\/v1|badge\/|_next|feed)/.test(to)) continue;
        broken.set(to, [...(broken.get(to) ?? []), from]);
      } else if (pages.get(to)?.refresh) {
        toRedirect.set(to, [...(toRedirect.get(to) ?? []), from]);
      } else if (to !== from) inbound.get(to)?.add(from);
    }
  }
  if (broken.size) issues.push({ code: "broken-internal-link", message: `存在しないページへの内部リンク（${broken.size}件のリンク先）`, count: broken.size, examples: [...broken.entries()].slice(0, 5).map(([to, from]) => `${to}（リンク元 ${from.length}件: ${from[0]}）`) });

  if (toRedirect.size) review.push({ code: "link-to-redirect", message: `掲載をやめた（転送ページの）URLへの内部リンク（${toRedirect.size}件のリンク先）。転送先へ直接リンクすると、クローラーの手間が減る`, count: toRedirect.size, examples: [...toRedirect.entries()].slice(0, 5).map(([to, from]) => `${to}（リンク元 ${from.length}件: ${from[0]}）`) });

  // noindex の意図確認：解説の無い比較ページの noindex は意図的（サイトの規則）。それ以外の noindex を列挙する
  const noindexOther = entries.filter(([k, p]) => p.noindex && familyOf(k) !== "compare").map(([k]) => k);
  add(review, "noindex-non-compare", "比較ページ以外で noindex のページ（意図的か確認。診断結果などは意図的）", noindexOther);

  const families = {};
  if (redirects.length) families["転送ページ"] = { pages: redirects.length, indexable: 0, noindex: 0 };
  for (const [k, p] of entries) {
    const f = (families[familyOf(k)] ??= { pages: 0, indexable: 0, noindex: 0 });
    f.pages++; p.noindex ? f.noindex++ : f.indexable++;
  }
  return { archived, pages: entries.length + redirects.length, redirects: redirects.length, indexable: indexable.length, sitemapUrls: sitemap.length, families, issues, review, inbound };
}

/** Linker 用：検索に関わるページ種別ごとの、内部リンク元の数（自分以外）。少ない順 */
export function inboundReport(site, result, { families = ["tools", "alternatives", "compare", "licenses"], limit = 10 } = {}) {
  const out = {};
  for (const fam of families) {
    const rows = [...site.pages.entries()]
      .filter(([k, p]) => familyOf(k) === fam && !p.noindex && !p.refresh && !result.archived?.has(k))
      .map(([k]) => ({ path: k, inbound: result.inbound.get(k)?.size ?? 0 }))
      .sort((a, b) => a.inbound - b.inbound || a.path.localeCompare(b.path));
    const counts = rows.map((r) => r.inbound).sort((a, b) => a - b);
    out[fam] = {
      total: rows.length,
      median: counts.length ? counts[Math.floor(counts.length / 2)] : 0,
      orphans: rows.filter((r) => r.inbound === 0).length,
      lowest: rows.slice(0, limit),
    };
  }
  return out;
}

export function renderAudit(result, inboundSummary, { generatedAt, base }) {
  const L = [];
  L.push("# OSSALT テクニカル・リンク監査（読み取り専用）", "");
  L.push(`- 生成日: ${generatedAt}`, `- 対象: ビルド済みの out/（${base}）`);
  L.push(`- ページ数: ${result.pages}（indexされるもの ${result.indexable}、サイトマップ ${result.sitemapUrls}件）`, "");
  L.push("## ページの種類ごと", "", "| 種類 | ページ | index | noindex |", "| --- | ---: | ---: | ---: |");
  for (const [f, v] of Object.entries(result.families)) L.push(`| ${f} | ${v.pages} | ${v.indexable} | ${v.noindex} |`);
  const section = (title, list, empty) => {
    L.push("", `## ${title}`, "");
    if (!list.length) { L.push(empty); return; }
    for (const i of list) {
      L.push(`- **${i.code}**：${i.message}（${i.count}件）`);
      for (const e of i.examples) L.push(`  - ${e}`);
    }
  };
  section("直す必要がある（事実）", result.issues, "なし。");
  section("影響範囲を見てから判断する（意図的な場合がある）", result.review, "なし。");
  L.push("", "## 内部リンク：リンク元が少ないページ（検索対象の種類ごと）", "");
  for (const [fam, v] of Object.entries(inboundSummary)) {
    L.push(`### ${fam}（${v.total}件、リンク元の中央値 ${v.median}、リンク元ゼロ ${v.orphans}件）`, "");
    for (const r of v.lowest) L.push(`- ${r.path}：${r.inbound}`);
    L.push("");
  }
  L.push("> リンク元の数は、ビルド済みHTMLの本文中の `<a>`（ヘッダー・フッターのナビを含む）から数えた事実です。順位への効果は示しません。", "> 設定（noindex・canonical・robots）は、この結果だけで一括変更せず、影響範囲を調べてから承認を得てください。");
  return L.join("\n") + "\n";
}
