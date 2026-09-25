#!/usr/bin/env node
/**
 * 検索用の別名（カタカナ表記等）を追加する。
 *
 * ここに入れるのは日本語圏での一般的なカタカナ転写であり、ツールの
 * 仕様・実績に関する事実の主張ではないため、他のデータ項目と違って
 * 「確認できないので null」という制約の対象にはしていない
 * （間違っていても実害が無く、検索の利便性のためだけに使う）。
 * とはいえ根拠のない当て字は避け、一般的に定着している表記のみ入れる。
 *
 * data-source/tools.json を直接編集しないという方針を守るため、
 * このスクリプト経由で追記する。
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TOOLS_PATH = path.join(ROOT, "data-source", "tools.json");

const ALIASES = {
  excalidraw: ["エクスカリドロー", "えくすかりどろー"],
  n8n: ["エヌエイトエヌ"],
  supabase: ["スーパーベース"],
  grafana: ["グラファナ"],
  gitea: ["ギテア"],
  penpot: ["ペンポット"],
  jellyfin: ["ゼリーフィン"],
  nextcloud: ["ネクストクラウド"],
  metabase: ["メタベース"],
  directus: ["ディレクタス"],
  strapi: ["ストラピ"],
  ghost: ["ゴースト"],
  appflowy: ["アップフロウィー"],
  affine: ["アフィン"],
  logseq: ["ログシーク", "ログシーケ"],
  joplin: ["ジョプリン"],
  outline: ["アウトライン"],
  mattermost: ["マターモスト"],
  "rocket-chat": ["ロケットチャット"],
  chatwoot: ["チャットウート"],
  vaultwarden: ["ボルトウォーデン"],
  authentik: ["オーセンティック"],
  keycloak: ["キークローク"],
  coolify: ["クーリファイ"],
  dokploy: ["ドックプロイ"],
  ollama: ["オラマ"],
  dify: ["ディファイ"],
  langflow: ["ラングフロー"],
  "open-webui": ["オープンウェブユーアイ"],
  syncthing: ["シンクシング"],
  rustdesk: ["ラストデスク"],
  "uptime-kuma": ["アップタイムクマ"],
  hoppscotch: ["ホップスコッチ"],
  vikunja: ["ビクーニャ"],
  focalboard: ["フォーカルボード"],
  planka: ["プランカ"],
  budibase: ["ブディベース"],
  nocodb: ["ノコディービー"],
  baserow: ["ベースロウ"],
  "cal-com": ["カルドットコム"],
};

const raw = JSON.parse(fs.readFileSync(TOOLS_PATH, "utf8"));
const isWrapped = !Array.isArray(raw) && Array.isArray(raw.tools);
const tools = isWrapped ? raw.tools : raw;

let updated = 0;
for (const t of tools) {
  const aliases = ALIASES[t.id];
  if (aliases) {
    t.aliases = aliases;
    updated++;
  }
}

fs.writeFileSync(TOOLS_PATH, JSON.stringify(isWrapped ? { ...raw, tools } : tools, null, 1) + "\n");
console.log(`別名を設定: ${updated}件（辞書に${Object.keys(ALIASES).length}件登録、一致したもののみ反映）`);
