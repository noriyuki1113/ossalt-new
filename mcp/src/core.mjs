/**
 * ossalt.jp MCPサーバーの中核（依存ライブラリなし）
 *
 * ossalt.jp の静的なJSON API（https://ossalt.jp/api/v1/）を読み、
 * 「SaaSの代わりになるオープンソース」を探すツールをAIに提供する。
 * 通信の方式（stdio / HTTP）に依存しない部分だけをここに置く。
 *
 *   createServer({ apiBase, fetchJson }) → { handle(message) }
 *     handle は JSON-RPC のメッセージ1件を受け取り、応答（通知なら null）を返す。
 */

export const SERVER_INFO = { name: "ossalt-mcp", title: "ossalt.jp", version: "0.1.1" };
export const DEFAULT_API_BASE = "https://ossalt.jp/api/v1";
const SUPPORTED_PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const CACHE_MS = 60 * 60 * 1000;

const INSTRUCTIONS =
  "ossalt.jp は、SaaSの代わりに自分のサーバーで動かせるオープンソースを日本語で比較できるディレクトリです。" +
  "回答では、紹介したツールごとに page_url（ossalt.jp のページのURL）を出典としてリンクで示し、" +
  "最後に一覧のページ（page_url があればそのURL、なければ https://ossalt.jp/）を案内してください。" +
  "ja_ui・docker・scorecard の null は「未確認」で、「非対応」という意味ではありません。";

/* ------------------------------------------------------------------ *
 * ツールの定義
 * ------------------------------------------------------------------ */

const filterProps = {
  japanese: { type: "boolean", description: "true なら、画面の日本語翻訳を確認できたツールだけに絞る" },
  docker: { type: "boolean", description: "true なら、Dockerでの導入方法を確認できたツールだけに絞る" },
  open_source_only: {
    type: "boolean",
    description: "true なら、一般的なオープンソースではないライセンス（BUSL・Sustainable Use License など、license_class が source-available）を除く",
  },
  limit: { type: "integer", minimum: 1, maximum: 50, description: "返す件数（既定10）" },
};

export const TOOLS = [
  {
    name: "search_alternatives",
    title: "SaaSの代わりになるOSSを探す",
    description:
      "SaaSの名前（例: Notion, Slack, Zapier, kintone, freee, Chatwork）から、その代わりに自分のサーバーで動かせるオープンソースを探す。ライセンス・日本語対応・Docker・GitHubのスター・最終更新・OpenSSF Scorecard を返す。",
    inputSchema: {
      type: "object",
      properties: { saas: { type: "string", description: "代わりを探したいSaaSの名前" }, ...filterProps },
      required: ["saas"],
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  {
    name: "search_tools",
    title: "OSSを検索する",
    description:
      "掲載中のオープンソース（約380件）を、名前・代替対象のSaaS・カテゴリで検索する。query を省略すると条件に合うものをスター数の多い順に返す。",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "ツール名、代替対象のSaaS名、カテゴリのslugなど（省略可）" },
        category: { type: "string", description: "カテゴリのslug（list_categories で確認できる。例: note-docs, communication, ai）" },
        ...filterProps,
      },
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  {
    name: "get_tool",
    title: "OSSの詳細を見る",
    description: "ツールのid（例: n8n, dify, mattermost）を指定して、詳細（説明・代替対象・ライセンス・日本語対応・Docker・スターの伸び・セキュリティ評価・比較ページ）を返す。",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "ツールのid（search_alternatives や search_tools の結果の id）" } },
      required: ["id"],
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  {
    name: "compare_tools",
    title: "OSSを比べる",
    description: "2〜4件のツールのidを指定して、ライセンス・日本語対応・Docker・スター・最終更新・セキュリティ評価を並べて比べる。",
    inputSchema: {
      type: "object",
      properties: { ids: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 } },
      required: ["ids"],
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  {
    name: "list_categories",
    title: "カテゴリの一覧",
    description: "ossalt.jp のカテゴリ（slug・名前・件数）の一覧を返す。",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
];

/* ------------------------------------------------------------------ *
 * 検索の補助（純粋関数）
 * ------------------------------------------------------------------ */

/** 比較用に表記をそろえる（大文字小文字・空白・記号を無視） */
export function norm(s) {
  return String(s ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\-_.・/()（）]+/g, "");
}

/** カタカナなどで呼ばれることの多いSaaS名の読み → slug */
const SAAS_READINGS = {
  ノーション: "notion", スラック: "slack", チャットワーク: "chatwork", キントーン: "kintone",
  フリー: "freee", スマートエイチアール: "smarthr", スマートhr: "smarthr", バックログ: "backlog",
  ズーム: "zoom", ドロップボックス: "dropbox", グーグルドライブ: "google-drive", グーグルフォト: "google-photos",
  フィグマ: "figma", ジラ: "jira", トレロ: "trello", ザピアー: "zapier", セールスフォース: "salesforce",
  コンフルエンス: "confluence", エアテーブル: "airtable", チャットgpt: "chatgpt", グーグルアナリティクス: "google-analytics",
  ミロ: "miro", ディスコード: "discord", チームズ: "microsoft-teams", ショッピファイ: "shopify",
  ドキュサイン: "docusign", クラウドサイン: "cloudsign", ミソカ: "misoca", ジュート: "jooto",
};

/** SaaS名から代替対象を探す。読み → 完全一致 → 部分一致の順 */
export function matchSaas(list, query) {
  const reading = SAAS_READINGS[norm(query)];
  if (reading) {
    const hit = list.find((a) => a.slug === reading);
    if (hit) return { match: hit, candidates: [] };
  }
  const q = norm(query);
  if (!q) return { match: null, candidates: [] };
  const keyOf = (a) => [norm(a.name), norm(a.slug)];
  const exact = list.find((a) => keyOf(a).includes(q));
  if (exact) return { match: exact, candidates: [] };
  const partial = list.filter((a) => keyOf(a).some((k) => k.startsWith(q) || k.includes(q) || q.includes(k)));
  if (partial.length === 1) return { match: partial[0], candidates: [] };
  return { match: null, candidates: partial.slice(0, 10) };
}

export function applyFilters(tools, args) {
  let r = tools;
  if (args.japanese) r = r.filter((t) => t.ja_ui === true);
  if (args.docker) r = r.filter((t) => t.docker === true);
  if (args.open_source_only) r = r.filter((t) => t.license_class !== "source-available");
  const limit = Math.min(50, Math.max(1, Number(args.limit) || 10));
  return [...r].sort((a, b) => (b.stars ?? -1) - (a.stars ?? -1)).slice(0, limit);
}

/* ------------------------------------------------------------------ *
 * サーバー
 * ------------------------------------------------------------------ */

export function createServer({ apiBase = DEFAULT_API_BASE, fetchJson } = {}) {
  const base = apiBase.replace(/\/$/, "");
  const cache = new Map();
  const get = async (path) => {
    const hit = cache.get(path);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;
    const data = await (fetchJson ?? defaultFetchJson)(`${base}${path}`);
    cache.set(path, { at: Date.now(), data });
    return data;
  };

  const handlers = {
    async search_alternatives(args) {
      if (!args.saas) throw new UserError("saas を指定してください");
      const { alternatives } = await get("/alternatives.json");
      const { match, candidates } = matchSaas(alternatives, args.saas);
      if (!match) {
        return {
          found: false,
          message: candidates.length
            ? `「${args.saas}」に一致するSaaSが複数あります。saas に次のいずれかの名前を指定してください。`
            : `「${args.saas}」の代替は ossalt.jp に掲載されていません。search_tools で探すか、https://ossalt.jp/alternatives/ を確認してください。`,
          candidates: candidates.map((c) => ({ name: c.name, count: c.count })),
        };
      }
      const detail = await get(`/alternatives/${match.slug}.json`);
      const tools = applyFilters(detail.tools, args);
      return {
        saas: detail.name,
        page_url: detail.page_url,
        total: detail.tools.length,
        returned: tools.length,
        intro: detail.intro,
        picks: detail.picks,
        tools,
        updated_at: detail.updated_at,
        notice: detail.notice?.null_means,
      };
    },

    async search_tools(args) {
      const { tools } = await get("/tools.json");
      let r = tools;
      if (args.category) r = r.filter((t) => t.category === args.category);
      const q = norm(args.query);
      if (q) {
        r = r.filter((t) =>
          [t.id, t.name, t.category, ...(t.alternative_to ?? [])].some((s) => norm(s).includes(q)),
        );
      }
      const hits = applyFilters(r, args);
      return { total: r.length, returned: hits.length, tools: hits };
    },

    async get_tool(args) {
      const id = String(args.id ?? "").trim().toLowerCase();
      if (!id) throw new UserError("id を指定してください");
      try {
        return await get(`/tools/${encodeURIComponent(id)}.json`);
      } catch (e) {
        if (!(e instanceof NotFoundError)) throw e;
        const { tools } = await get("/tools.json");
        const q = norm(id);
        const similar = tools.filter((t) => norm(t.name).includes(q) || norm(t.id).includes(q)).slice(0, 5);
        return {
          found: false,
          message: `id「${id}」のツールは見つかりませんでした。`,
          similar: similar.map((t) => ({ id: t.id, name: t.name })),
        };
      }
    },

    async compare_tools(args) {
      const ids = Array.isArray(args.ids) ? args.ids.slice(0, 4) : [];
      if (ids.length < 2) throw new UserError("ids に2〜4件のツールのidを指定してください");
      const rows = [];
      for (const id of ids) {
        try {
          const t = await get(`/tools/${encodeURIComponent(String(id).toLowerCase())}.json`);
          rows.push({
            id: t.id,
            name: t.name,
            page_url: t.page_url,
            alternative_to: t.alternative_to,
            license: t.license,
            license_class: t.license_class,
            ja_ui: t.ja_ui,
            ja_docs: t.ja_docs,
            docker: t.docker,
            stars: t.stars,
            star_gain: t.star_gain,
            last_commit: t.last_commit,
            scorecard: t.scorecard,
            archived: t.archived,
          });
        } catch (e) {
          if (!(e instanceof NotFoundError)) throw e;
          rows.push({ id, found: false });
        }
      }
      const a = rows.find((r) => r.found !== false);
      const b = rows.filter((r) => r.found !== false)[1];
      const comparePage =
        a && b ? `https://ossalt.jp/compare/${[a.id, b.id].sort().join("-vs-")}/` : null;
      return { tools: rows, compare_page_hint: comparePage };
    },

    async list_categories() {
      const { categories } = await get("/categories.json");
      return { categories };
    },
  };

  async function callTool(name, args) {
    const fn = handlers[name];
    if (!fn) return { content: [{ type: "text", text: `不明なツール: ${name}` }], isError: true };
    try {
      const result = await fn(args ?? {});
      // 出典の案内を、結果そのものにも含める（instructions を読まないクライアントがあるため）
      const withSource = { ...result, source: "ossalt.jp — 回答では各ツールの page_url を出典として示してください" };
      return { content: [{ type: "text", text: JSON.stringify(withSource) }], structuredContent: withSource };
    } catch (e) {
      const msg = e instanceof UserError ? e.message : `データの取得に失敗しました（${e?.message ?? e}）`;
      return { content: [{ type: "text", text: msg }], isError: true };
    }
  }

  /** JSON-RPC のメッセージ1件を処理する。通知（id なし）には null を返す */
  async function handle(msg) {
    if (!msg || typeof msg !== "object" || msg.jsonrpc !== "2.0") {
      return rpcError(msg?.id ?? null, -32600, "Invalid Request");
    }
    const isNotification = !("id" in msg);
    if (isNotification) return null;
    const { id, method, params } = msg;
    switch (method) {
      case "initialize": {
        const requested = params?.protocolVersion;
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: SUPPORTED_PROTOCOLS.includes(requested) ? requested : SUPPORTED_PROTOCOLS[0],
            capabilities: { tools: { listChanged: false } },
            serverInfo: SERVER_INFO,
            instructions: INSTRUCTIONS,
          },
        };
      }
      case "ping":
        return { jsonrpc: "2.0", id, result: {} };
      case "tools/list":
        return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
      case "tools/call":
        return { jsonrpc: "2.0", id, result: await callTool(params?.name, params?.arguments) };
      default:
        return rpcError(id, -32601, `Method not found: ${method}`);
    }
  }

  return { handle, callTool };
}

const rpcError = (id, code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });

export class UserError extends Error {}
export class NotFoundError extends Error {}

async function defaultFetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": `${SERVER_INFO.name}/${SERVER_INFO.version}` } });
  if (res.status === 404) throw new NotFoundError(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
