#!/usr/bin/env node
/**
 * サイト用データの生成
 *
 *   data-source/tools.json   … パイプラインの出力（正規化済みツールデータ）
 *   data-source/github.json  … （任意）GitHubメタデータの追加分
 *   ↓
 *   public/data/tools.json / categories.json / meta.json
 *
 * 使い方:
 *   node scripts/build-data.mjs
 *
 * データを増やすときは data-source/tools.json に行を足して再実行するだけでよい。
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "data-source");
const OUT = path.join(ROOT, "public", "data");

/** ツールID → カテゴリslug */
const CATEGORY_OF = {
  "note-docs": ["appflowy", "affine", "outline", "docmost"],
  communication: ["mattermost", "rocket-chat"],
  project: ["plane", "taiga", "vikunja"],
  database: ["nocodb", "baserow", "nocobase"],
  cms: ["ghost", "directus"],
  analytics: ["umami", "plausible", "matomo", "posthog"],
  observability: ["grafana", "glitchtip"],
  security: ["keycloak", "vaultwarden"],
  devtools: ["gitea", "coolify", "supabase", "hoppscotch"],
  automation: ["n8n", "activepieces"],
  files: ["nextcloud", "immich"],
  design: ["excalidraw", "penpot"],
  nocode: ["budibase", "metabase"],
  marketing: ["formbricks", "listmonk"],
  support: ["chatwoot"],
  scheduling: ["cal-com"],
  crm: ["twenty"],
  documents: ["stirling-pdf"],
};

const CATEGORY_META = {
  "note-docs": ["ノート・ドキュメント", "社内Wikiやドキュメント共有を自前で運用するためのツール。"],
  communication: ["チャット・コミュニケーション", "SlackやTeamsの代わりに、社内チャットを自社サーバで動かす。"],
  project: ["プロジェクト管理", "タスク管理・課題管理を自前で。日本のチームの運用にも合わせやすい。"],
  database: ["データベース・表作成", "Airtableのような表形式のデータ管理を、社内に置く。"],
  cms: ["CMS・コンテンツ管理", "コーポレートサイトやブログの裏側を自前で持つ。"],
  analytics: ["アクセス解析・プロダクト分析", "Cookieに依存せず、計測データを自社に留める。"],
  observability: ["監視・エラー追跡", "障害の検知と原因追跡を、外部サービスに依存せず行う。"],
  security: ["認証・パスワード管理", "ID基盤とパスワード保管庫。ここは自前運用の効果が大きい領域。"],
  devtools: ["開発・デプロイ基盤", "Gitホスティング、デプロイ、バックエンド。開発の土台を自前で。"],
  automation: ["業務自動化", "Zapier的な連携を、実行回数を気にせず使う。"],
  files: ["ファイル管理・写真", "クラウドストレージと写真のバックアップを、自分のディスクに。"],
  design: ["デザイン・図解", "ホワイトボードとデザインツール。共同編集を自前で。"],
  nocode: ["ローコード・BI", "社内ツールとダッシュボードを、少ない工数で内製する。"],
  marketing: ["マーケティング・フォーム", "アンケート、メール配信、流入計測まわり。"],
  support: ["カスタマーサポート", "問い合わせ対応を、外部SaaSに預けず運用する。"],
  scheduling: ["予約・スケジュール", "面談予約の受付を自前で。ドメインも自分のものにできる。"],
  crm: ["CRM・営業", "顧客情報は最も外に出したくないデータ。自前運用の価値が大きい。"],
  documents: ["PDF・文書処理", "PDFの結合・変換・編集を、外部サービスに送らずに処理する。"],
  office: ["オフィス・グループウェア", "文書作成や統合業務の基盤を自前で持つ。既存のSaaSと併用もしやすい。"],
  email: ["メール", "メールサーバと配信を自前で運用する。ドメインと送信履歴を自分で管理できる。"],
  hr: ["人事・勤怠・採用", "従業員情報、勤怠、採用の管理を社内に置く。"],
  accounting: ["会計・請求書・経費", "請求書の発行や入出金の管理を、外部サービスに預けずに行う。"],
  legal: ["電子契約・法務", "契約の締結と書類の保管を自前で運用する。"],
  backup: ["バックアップ", "世代管理と復元を自分でコントロールする。"],
  ai: ["AI・LLM基盤", "生成AIを自前のサーバで動かす。入力内容を外部に送らずに使える。"],
  video: ["ビデオ会議・配信", "会議と配信の基盤を自前で持つ。参加者数の課金から離れられる。"],
  ecommerce: ["EC・決済", "自社サイトでの販売と決済を、手数料に縛られずに構築する。"],
  translation: ["翻訳", "機密文書を外部APIへ送らずに翻訳する。"],
};

const idToCategory = new Map();
for (const [cat, ids] of Object.entries(CATEGORY_OF)) {
  for (const id of ids) idToCategory.set(id, cat);
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function pick(obj, keys) {
  for (const k of keys) {
    if (obj[k] != null) return obj[k];
  }
  return null;
}

const raw = readJson(path.join(SRC, "tools.json"), null);
if (!Array.isArray(raw) || raw.length === 0) {
  console.error("data-source/tools.json が見つからないか空です。");
  process.exit(1);
}

// GitHubの追加メタデータ（contributors / watchers など）を任意でマージ
const gh = readJson(path.join(SRC, "github.json"), {});
let ghList = [];
if (Array.isArray(gh)) ghList = gh;
else if (Array.isArray(gh.tools)) ghList = gh.tools;
else if (gh && typeof gh === "object") {
  // リポジトリ名などをキーにしたオブジェクト形式にも対応
  ghList = Object.entries(gh).map(([key, v]) =>
    v && typeof v === "object" ? { _key: key, ...v } : { _key: key }
  );
}
const ghById = new Map();
for (const g of ghList) {
  for (const key of [g.id, g.slug, g.repo, g._github_repo, g._key, g.name]) {
    if (key) ghById.set(String(key), g);
  }
}

const now = Date.now();
const tools = raw.map((t) => {
  const id = String(t.id ?? t.slug);
  const extra = ghById.get(id) ?? {};
  const lastCommit = pick(t, ["last_commit", "lastCommit"]) ?? null;
  const freshness =
    extra.freshness_days ??
    (lastCommit
      ? Math.max(0, Math.floor((now - new Date(lastCommit).getTime()) / 86400000))
      : null);

  return {
    id,
    name: t.name ?? id,
    url: t.url ?? "",
    github_url: t.github_url ?? "",
    description_ja: t.description_ja ?? null,
    description_en: t.description_en ?? null,
    category: t.category ?? idToCategory.get(id) ?? "other",
    primary_competitor: t.primary_competitor ?? "",
    primary_competitor_ja: t.primary_competitor_ja ?? null,
    stars_num: pick(t, ["stars_num"]) ?? pick(extra, ["stars_num", "stars"]),
    forks_num: pick(t, ["forks_num"]) ?? pick(extra, ["forks_num", "forks"]),
    contributors_num:
      pick(t, ["contributors_num", "contributors"]) ??
      pick(extra, ["contributors_num", "contributors"]),
    watchers_num:
      pick(t, ["watchers_num", "watchers"]) ??
      pick(extra, ["watchers_num", "watchers"]),
    language: t.language ?? null,
    license: t.license ?? null,
    last_commit: lastCommit,
    created_at: t.created_at ?? null,
    freshness_days: freshness,
    scorecard_score: pick(t, ["scorecard_score"]) ?? null,
    scorecard_date: t.scorecard_date ?? null,
    scorecard_checks: t.scorecard_checks ?? null,
    security_md: t.security_md ?? null,
    dependabot_configured: t.dependabot_configured ?? null,
    latest_release_at: t.latest_release_at ?? null,
    releases_12mo: t.releases_12mo ?? null,
    advisories_count: t.advisories_count ?? null,
    // 自動判定（fetch-github-api.mjs）済みならその値。未判定のものは旧データの手入力値のうち
    // true だけを残す（旧データの false には、公式にDocker配布しているツールが含まれていたため出さない）
    docker_available: t.docker_checked_at ? t.docker_available ?? null : t.docker_available === true ? true : null,
    github_archived: Boolean(t.github_archived),
    health_score: pick(t, ["health_score"]) ?? null,
    topics: Array.isArray(t.topics) ? t.topics : [],
    languages: Array.isArray(t.languages) ? t.languages : [],
    ja_docs: t.ja_docs ?? null,
    aliases: Array.isArray(t.aliases) ? t.aliases : [],
  };
});

// 健全度スコアが無い場合は式から再計算する。
// ただし式はスター・フォーク・コントリビュータ・ウォッチャーの4項目を前提とするため、
// いずれかが未取得のときは再計算しない（一部だけの値を合計として出さない）。
for (const t of tools) {
  const complete =
    t.stars_num != null &&
    t.forks_num != null &&
    t.contributors_num != null &&
    t.watchers_num != null;
  if (t.health_score == null && complete) {
    t.health_score =
      t.stars_num * 0.25 +
      (t.forks_num ?? 0) * 0.5 +
      (t.contributors_num ?? 0) * 0.5 +
      (t.watchers_num ?? 0) * 0.25 -
      Math.min(t.freshness_days ?? 90, 90) * 0.5;
  }
}

tools.sort((a, b) => (b.health_score ?? -1) - (a.health_score ?? -1));

const counts = {};
for (const t of tools) counts[t.category] = (counts[t.category] ?? 0) + 1;

const categories = Object.entries(CATEGORY_META).map(([slug, [nameJa, ledeJa]]) => ({
  slug,
  nameJa,
  ledeJa,
  count: counts[slug] ?? 0,
}));

const scored = tools.filter((t) => t.scorecard_score != null).length;

/**
 * 健全度スコアの分布（パーセンタイル）。
 * /guide/ の「健全度スコアの読み方」節が、この値を使って目安を表示する。
 * ツールが増減すれば自動で動くよう、固定値をどこにも書かない。
 *
 * パーセンタイルは「最近隣（nearest-rank）法」で求める。
 * 昇順ソート済み配列の index = ceil(p/100 * n) - 1（0始まりに補正）。
 */
function percentile(sortedAsc, p) {
  const n = sortedAsc.length;
  if (n === 0) return null;
  const idx = Math.min(n - 1, Math.max(0, Math.ceil((p / 100) * n) - 1));
  return sortedAsc[idx];
}

const healthScores = tools
  .map((t) => t.health_score)
  .filter((v) => v != null)
  .sort((a, b) => a - b);

// 「更新の新しさ」の減点は最終コミットから90日で頭打ち（最大-45点）になる。
// 90日以内にコミットがある件数を出し、/guide/ でこの限界（91日でも2年放置でも
// 減点が同じ）を説明するときに使う。
const within90dCount = tools.filter(
  (t) => t.freshness_days != null && t.freshness_days <= 90
).length;

const health =
  healthScores.length > 0
    ? {
        count: healthScores.length,
        min: healthScores[0],
        p10: percentile(healthScores, 10),
        p25: percentile(healthScores, 25),
        p50: percentile(healthScores, 50),
        p75: percentile(healthScores, 75),
        p90: percentile(healthScores, 90),
        p95: percentile(healthScores, 95),
        max: healthScores[healthScores.length - 1],
        within_90d_count: within90dCount,
      }
    : null;

const meta = {
  built_at: new Date().toISOString(),
  tool_count: tools.length,
  scored_count: scored,
  unrated_count: tools.length - scored,
  with_contributors: tools.filter((t) => t.contributors_num != null).length,
  with_watchers: tools.filter((t) => t.watchers_num != null).length,
  categories: categories.length,
  competitors: new Set(tools.map((t) => t.primary_competitor).filter(Boolean)).size,
  health,
};

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "tools.json"), JSON.stringify(tools, null, 1));
fs.writeFileSync(path.join(OUT, "categories.json"), JSON.stringify(categories, null, 1));
fs.writeFileSync(path.join(OUT, "meta.json"), JSON.stringify(meta, null, 1));

// 為替レート（円換算表示用）。基準日つきでそのまま公開データに含める。
const fx = readJson(path.join(SRC, "fx.json"), null);
if (fx) fs.writeFileSync(path.join(OUT, "fx.json"), JSON.stringify(fx, null, 1));

console.log("書き出し完了:", OUT);
console.log(JSON.stringify(meta, null, 1));
const uncategorized = tools.filter((t) => t.category === "other").map((t) => t.id);
if (uncategorized.length) console.warn("カテゴリ未割当:", uncategorized.join(", "));
