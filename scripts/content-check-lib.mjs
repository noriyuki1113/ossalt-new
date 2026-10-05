/**
 * 手書きの解説（content/）が、最新の掲載データと食い違っていないかを調べる（純粋関数のみ）
 *
 * 解説は一度書くと、データが変わっても自動では直らない。たとえば
 * ライセンスの変更、アーカイブ、日本語対応の確認状況の変化、
 * 比較の組み合わせからの脱落（＝ページが生成されなくなる）などを、
 * 毎週の点検で拾い、人（またはClaude）が直す候補として一覧にする。
 *
 * 判定は「明らかな食い違い」だけに絞り、推測で警告を増やさない。
 */

/** 本文から「ライセンスはXです」のXを取り出す（英数字で始まるものだけ） */
export function extractLicenseClaims(text) {
  const out = [];
  const re = /ライセンスは(?:、当サイトのデータでは)?([A-Za-z][A-Za-z0-9.+\- ]*[A-Za-z0-9.+])/g;
  for (const m of text.matchAll(re)) out.push(m[1].trim());
  return out;
}

const norm = (s) => String(s ?? "").toLowerCase().replace(/[\s_]/g, "");

/** 書かれたライセンスが、データのライセンス表記と合っているか */
export function licenseMatches(claim, dataLicense) {
  if (!dataLicense) return true; // データ側が未取得なら判定しない
  return norm(dataLicense).includes(norm(claim));
}

const JA_CLAIM = /画面の日本語翻訳(?:も|を|と|は)?(?:[^。]{0,20})?確認できています/;
const DOCKER_CLAIM = /Dockerでの導入方法(?:も|を)?確認できています/;

/** 本文の中のサイト内リンク（/tools/x/ など）を取り出す */
export function extractLinks(text) {
  const out = [];
  for (const m of text.matchAll(/\]\((\/(tools|compare|alternatives|blog|categories)\/([^/)#]+)\/)\)/g)) {
    out.push({ href: m[1], kind: m[2], slug: m[3] });
  }
  return out;
}

/**
 * 本文を文に分け、ほかのツールのページへのリンクを含む文を除く。
 * 「[Meilisearch](/tools/meilisearch/)は…ライセンスはMITです」のように、
 * 別のツールについて書いた文を、このツールの記述として判定しないため。
 */
export function ownSentences(text, slug) {
  return text
    .split(/[。\n]/)
    .filter((s) => {
      for (const m of s.matchAll(/\(\/tools\/([^/)]+)\/\)/g)) if (m[1] !== slug) return false;
      return true;
    })
    .join("。\n");
}

const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

/**
 * 点検の本体。
 * @param {object} p
 * @param {Array<{kind:"tool"|"compare"|"alternative"|"category"|"blog", slug:string, text:string, updated?:string, date?:string}>} p.docs
 * @param {Map<string, object>} p.tools       id → ツール（アーカイブ済みも含む）
 * @param {Set<string>} p.pairs               生成される比較ページのslug
 * @param {Set<string>} p.alternatives        生成される代替ページのslug
 * @param {Set<string>} p.categories          カテゴリのslug
 * @param {Map<string, string>} p.blogDates   ブログのslug → 公開日
 * @param {string} p.today                    YYYY-MM-DD
 * @param {number} [p.reviewDays]             この日数より前に更新した解説を「見直しの時期」にする
 */
export function checkContent({ docs, tools, pairs, alternatives, categories, blogDates, today, reviewDays = 180 }) {
  const issues = [];
  const add = (level, doc, message) => issues.push({ level, kind: doc.kind, slug: doc.slug, message });

  for (const doc of docs) {
    // --- ツールの解説 ---
    if (doc.kind === "tool") {
      const t = tools.get(doc.slug);
      if (!t) {
        add("要対応", doc, "掲載データにないツールの解説です（ページが生成されません）");
        continue;
      }
      // 解説の中でアーカイブや更新の間隔に触れていれば、対応済みとみなす
      if (t.github_archived && !/アーカイブ/.test(doc.text)) add("要対応", doc, "リポジトリがアーカイブされました。開発終了の旨を解説に書くか、表現を見直してください");
      const own = ownSentences(doc.text, doc.slug);
      for (const c of extractLicenseClaims(own)) {
        if (!licenseMatches(c, t.license)) {
          add("要対応", doc, `解説では「ライセンスは${c}」ですが、データは「${t.license}」です`);
        }
      }
      if (JA_CLAIM.test(own) && t.ja_ui !== true) {
        add("要確認", doc, "解説では画面の日本語翻訳を「確認できています」と書いていますが、データでは確認できていません");
      }
      if (DOCKER_CLAIM.test(own) && t.docker_available !== true) {
        add("要確認", doc, "解説ではDockerでの導入方法を「確認できています」と書いていますが、データでは確認できていません");
      }
      if (!t.github_archived && t.freshness_days != null && t.freshness_days > 365 && !/1年以上|更新の間隔|開発の状況|アーカイブ/.test(doc.text)) {
        add("要確認", doc, `最後の更新から${t.freshness_days}日たっています。開発の状況を解説に書くか確認してください`);
      }
    }

    // --- 比較の解説 ---
    if (doc.kind === "compare") {
      if (!pairs.has(doc.slug)) {
        add("要対応", doc, "比較の組み合わせから外れたため、このページは生成されていません（健全度の順位の変化など）");
      }
      for (const id of doc.slug.split("-vs-")) {
        const t = tools.get(id);
        if (t?.github_archived) add("要対応", doc, `${t.name} がアーカイブされました`);
      }
    }

    // --- 見直しの時期 ---
    if (doc.updated && doc.kind !== "blog" && daysBetween(doc.updated, today) > reviewDays) {
      add("見直し", doc, `最終更新から${daysBetween(doc.updated, today)}日たっています`);
    }

    // --- サイト内リンク ---
    const myDate = doc.kind === "blog" ? doc.date : today;
    for (const l of extractLinks(doc.text)) {
      let ok = true;
      if (l.kind === "tools") {
        ok = tools.has(l.slug);
        const lt = tools.get(l.slug);
        if (lt?.github_archived && l.slug !== doc.slug && !(doc.kind === "compare" && doc.slug.split("-vs-").includes(l.slug))) {
          add("要確認", doc, `アーカイブされたツールへのリンクがあります（${lt.name}）。おすすめとして紹介していないか確認してください`);
        }
      }
      else if (l.kind === "compare") ok = pairs.has(l.slug);
      else if (l.kind === "alternatives") ok = alternatives.has(l.slug) || l.slug === "japan";
      else if (l.kind === "categories") ok = categories.has(l.slug);
      else if (l.kind === "blog") {
        const d = blogDates.get(l.slug);
        if (!d) ok = false;
        else if (myDate && d > myDate) {
          add("要対応", doc, `まだ公開されていない記事（${l.slug}、${d}公開）へのリンクがあります`);
          continue;
        }
      }
      if (!ok) add("要対応", doc, `リンク切れ：${l.href}`);
    }
  }

  const order = { 要対応: 0, 要確認: 1, 見直し: 2 };
  return issues.sort((a, b) => order[a.level] - order[b.level] || a.kind.localeCompare(b.kind) || a.slug.localeCompare(b.slug));
}

const KIND_PATH = { tool: "content/tools", compare: "content/compare", alternative: "content/alternatives", category: "content/categories", blog: "content/blog" };

/** 点検の結果をMarkdownの報告にする */
export function renderReport(issues, { today, counts }) {
  const lines = [
    "# 解説の点検レポート",
    "",
    `${today} 時点の掲載データと、手書きの解説（content/）を突き合わせた結果です。毎週月曜に自動で更新されます（ワークフロー「解説の点検」）。`,
    "",
    `点検した解説：ツール${counts.tool}件・比較${counts.compare}件・代替${counts.alternative}件・カテゴリ${counts.category}件・ブログ${counts.blog}本`,
    "",
  ];
  if (!issues.length) {
    lines.push("**食い違いは見つかりませんでした。**", "");
    return lines.join("\n");
  }
  const byLevel = (lv) => issues.filter((i) => i.level === lv);
  const sections = [
    ["要対応", "ページの内容がデータと食い違っている、またはページやリンクが壊れているもの。優先して直してください。"],
    ["要確認", "データの確認状況と書き方が合っていない可能性があるもの。"],
    ["見直し", "書いてから時間がたった解説。内容が今も正しいかを確認してください。"],
  ];
  for (const [lv, desc] of sections) {
    const list = byLevel(lv);
    lines.push(`## ${lv}（${list.length}件）`, "", desc, "");
    if (!list.length) {
      lines.push("なし", "");
      continue;
    }
    for (const i of list) lines.push(`- \`${KIND_PATH[i.kind]}/${i.slug}.md\`：${i.message}`);
    lines.push("");
  }
  lines.push("直すときは、Claudeに「解説の点検レポートの要対応を直して」と頼めます。");
  return lines.join("\n") + "\n";
}
