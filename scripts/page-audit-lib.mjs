/**
 * ページ監査の純粋関数（ブラウザ・ネットワークを使わない。テストしやすいように、実行部分（page-audit.mjs）と分けている）。
 * 判定は「HTMLに書かれている事実」だけ。順位・流入への影響は推測しない。
 */

const decode = (s) => String(s ?? "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i")) ?? tag.match(new RegExp(`${name}\\s*=\\s*'([^']*)'`, "i"));
  return m ? decode(m[1]) : null;
};
const metaContent = (html, key, value) => {
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    if ((attr(m[0], key) ?? "").toLowerCase() === value.toLowerCase()) return attr(m[0], "content");
  }
  return null;
};

/** HTMLから、検索エンジンに関わる事実を取り出す */
export function extractFacts(html) {
  const title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) ?? [])[1] ?? "").trim();
  const canonicalTag = (html.match(/<link\b[^>]*rel\s*=\s*"canonical"[^>]*>/i) ?? [])[0];
  const body = (html.match(/<body[\s\S]*<\/body>/i) ?? [html])[0];
  const text = decode(body.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const jsonLd = [...html.matchAll(/<script[^>]*type\s*=\s*"application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1].trim());
  return {
    title,
    description: metaContent(html, "name", "description"),
    canonical: canonicalTag ? attr(canonicalTag, "href") : null,
    robots: metaContent(html, "name", "robots"),
    h1: [...html.matchAll(/<h1\b[\s\S]*?<\/h1>/gi)].length,
    og: { title: metaContent(html, "property", "og:title"), description: metaContent(html, "property", "og:description"), image: metaContent(html, "property", "og:image"), url: metaContent(html, "property", "og:url") },
    refresh: /<meta[^>]+http-equiv\s*=\s*"refresh"/i.test(html),
    images: { total: images.length, noAlt: images.filter((t) => attr(t, "alt") === null).length, noSize: images.filter((t) => !attr(t, "width") || !attr(t, "height")).length },
    jsonLd,
    text,
  };
}

const KNOWN_TYPES = new Set(["WebSite", "ItemList", "BreadcrumbList", "FAQPage", "Article", "BlogPosting", "SoftwareApplication", "Organization", "CollectionPage", "WebPage", "Person", "Review", "AggregateRating", "TechArticle"]);
const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

/** JSON-LD の構文と、Googleのリッチリザルトで要求される基本項目、可視テキストとの一致を調べる */
export function validateJsonLd(blocks, { pageText = "" } = {}) {
  const problems = [];
  const types = [];
  blocks.forEach((raw, i) => {
    let data;
    try { data = JSON.parse(raw); } catch (e) { problems.push({ id: "jsonld-syntax", message: `JSON-LD #${i + 1} がJSONとして読めない（${e.message.slice(0, 60)}）` }); return; }
    for (const node of asArray(data["@graph"] ?? data)) {
      const t = node["@type"];
      const typeList = asArray(t);
      if (typeList.length === 0) { problems.push({ id: "jsonld-type", message: `JSON-LD #${i + 1} に @type がない` }); continue; }
      types.push(...typeList);
      if (!/schema\.org/.test(String(data["@context"] ?? node["@context"] ?? ""))) problems.push({ id: "jsonld-context", message: `JSON-LD #${i + 1} の @context が schema.org でない` });
      for (const ty of typeList) if (!KNOWN_TYPES.has(ty)) problems.push({ id: "jsonld-unknown-type", message: `想定外の @type: ${ty}（意図的か確認）` });
      if (typeList.includes("BreadcrumbList")) {
        const items = asArray(node.itemListElement);
        if (items.length === 0) problems.push({ id: "breadcrumb-empty", message: "BreadcrumbList に itemListElement がない" });
        items.forEach((it, idx) => {
          if (it.position !== idx + 1) problems.push({ id: "breadcrumb-position", message: `BreadcrumbList の position が ${idx + 1} でない（${it.position}）` });
          const name = it.name ?? it.item?.name;
          if (!name) problems.push({ id: "breadcrumb-name", message: `BreadcrumbList ${idx + 1} 番目に name がない` });
          if (idx < items.length - 1 && !(typeof it.item === "string" ? it.item : it.item?.["@id"])) problems.push({ id: "breadcrumb-item", message: `BreadcrumbList ${idx + 1} 番目に item（URL）がない` });
        });
      }
      if (typeList.includes("ItemList") && typeof node.numberOfItems === "number" && node.numberOfItems !== asArray(node.itemListElement).length) {
        problems.push({ id: "itemlist-count", message: `ItemList の numberOfItems（${node.numberOfItems}）と要素数（${asArray(node.itemListElement).length}）が違う` });
      }
      if (typeList.includes("FAQPage")) {
        for (const q of asArray(node.mainEntity)) {
          const ans = q.acceptedAnswer?.text;
          if (!q.name || !ans) problems.push({ id: "faq-incomplete", message: "FAQPage の質問に name か acceptedAnswer.text がない" });
          else if (pageText && !pageText.includes(String(q.name).replace(/\s+/g, " ").trim())) problems.push({ id: "faq-not-visible", message: `FAQPage の質問がページ本文に見当たらない: ${String(q.name).slice(0, 40)}`, });
        }
      }
      if (typeList.includes("WebSite") && node.potentialAction) {
        const target = typeof node.potentialAction.target === "string" ? node.potentialAction.target : node.potentialAction.target?.urlTemplate;
        if (!target || !/\{search_term_string\}/.test(target)) problems.push({ id: "searchaction-target", message: "WebSite の SearchAction の target に {search_term_string} がない" });
      }
      if (typeList.some((x) => x === "Review" || x === "AggregateRating") || node.aggregateRating || node.review) {
        problems.push({ id: "jsonld-rating", message: "レビュー・評価のマークアップがある。実在する評価データに基づくか確認（架空の評価は不可）" });
      }
    }
  });
  return { types: [...new Set(types)], problems };
}

const widthOf = (s) => [...s].reduce((n, c) => n + (c.charCodeAt(0) > 0xff ? 2 : 1), 0);
export const titleWidth = widthOf;

/** 1ページ分の、HTMLの事実からの指摘（重要度・根拠つき） */
export function pageIssues({ url, expectedCanonical, facts }) {
  const out = [];
  const add = (id, severity, message, evidence) => out.push({ id, severity, url, message, evidence });
  if (!facts.title) add("title-missing", "high", "titleが無い", "<title> が空または無い");
  else if (titleWidth(facts.title) > 70) add("title-long", "low", "titleが長い（半角1・全角2で70超。省略される可能性があるという目安）", `${facts.title}（幅${titleWidth(facts.title)}）`);
  if (!facts.description) add("description-missing", "medium", "meta descriptionが無い", "meta name=description がない");
  else if (titleWidth(facts.description) < 40) add("description-short", "low", "descriptionが短い（半角換算40未満）", facts.description);
  if (!facts.canonical) add("canonical-missing", "high", "canonicalが無い", "link rel=canonical がない");
  else if (expectedCanonical && facts.canonical.replace(/\/?$/, "/") !== expectedCanonical.replace(/\/?$/, "/")) add("canonical-mismatch", "high", "canonicalが、このページのURLと違う", `canonical=${facts.canonical} / 期待=${expectedCanonical}`);
  if (facts.robots && /noindex/i.test(facts.robots)) add("noindex", "high", "noindexになっている（意図的か確認）", `robots=${facts.robots}`);
  if (facts.refresh) add("meta-refresh", "medium", "meta refreshの転送ページ", "http-equiv=refresh がある");
  if (facts.h1 !== 1) add("h1-count", facts.h1 === 0 ? "high" : "medium", `h1が${facts.h1}個（1個が望ましい）`, `h1=${facts.h1}`);
  if (!facts.og.title || !facts.og.image) add("og-incomplete", "low", "Open Graph（title・image）が不足", JSON.stringify(facts.og));
  if (facts.images.noAlt > 0) add("img-no-alt", "medium", `alt属性が無い画像が${facts.images.noAlt}件（装飾なら alt=""）`, `img=${facts.images.total}`);
  if (facts.images.noSize > 0) add("img-no-size", "low", `width/heightが無い画像が${facts.images.noSize}件（レイアウトのずれの原因）`, `img=${facts.images.total}`);
  const ld = validateJsonLd(facts.jsonLd, { pageText: facts.text });
  for (const p of ld.problems) add(p.id, p.id === "jsonld-syntax" ? "high" : "medium", p.message, "JSON-LD");
  return { issues: out, jsonLdTypes: ld.types };
}

/** ページ間の重複（title・description） */
export function duplicateIssues(pages) {
  const out = [];
  for (const key of ["title", "description"]) {
    const map = new Map();
    for (const p of pages) {
      const v = p.facts?.[key];
      if (!v) continue;
      map.set(v, [...(map.get(v) ?? []), p.url]);
    }
    for (const [v, urls] of map) if (urls.length > 1) out.push({ id: `${key}-duplicate`, severity: "medium", url: urls[0], message: `${key}が${urls.length}ページで同じ`, evidence: `${v.slice(0, 80)} … ${urls.join(", ")}` });
  }
  return out;
}

export const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

export function renderMarkdown({ generatedAt, base, pages, issues, env }) {
  const sorted = [...issues].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.url.localeCompare(b.url));
  const count = (s) => issues.filter((i) => i.severity === s).length;
  const lines = [
    "# OSSALT ページ監査（ブラウザ）", "",
    `- 生成: ${generatedAt}`, `- 対象: ${base}（${pages.length}ページ）`, `- 測定条件: ${env}`,
    `- 指摘: 重大 ${count("high")}件／中 ${count("medium")}件／軽微 ${count("low")}件`, "",
    "> LCP・CLSは、この環境での**ラボ値**（制限なし・1回の測定）。実ユーザーの値（Core Web Vitals）ではない。合否の判断には、公開後の実測（Search Console・計測）を使う。", "",
    "## 指摘", "",
  ];
  if (sorted.length === 0) lines.push("なし。", "");
  for (const i of sorted) lines.push(`- **[${i.severity}] ${i.id}** ${i.url}：${i.message}`, `  - 証拠: ${String(i.evidence).replace(/\n/g, " ").slice(0, 300)}`, `  - 再現: 監査対象のURLを開き、「${i.id}」の項目を確認（\`node scripts/page-audit.mjs --only ${i.url}\`）`);
  lines.push("", "## ページごとの結果", "", "| URL | title幅 | h1 | JSON-LD | axe（重大・深刻） | 横スクロール | LCP(ms) | CLS | コンソールエラー |", "| --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |");
  for (const p of pages) lines.push(`| ${p.url} | ${p.facts ? titleWidth(p.facts.title) : "—"} | ${p.facts?.h1 ?? "—"} | ${(p.jsonLdTypes ?? []).join("・") || "—"} | ${p.axe ?? "—"} | ${p.overflow ?? "—"} | ${p.lcp ?? "—"} | ${p.cls ?? "—"} | ${p.consoleErrors ?? "—"} |`);
  return lines.join("\n") + "\n";
}
