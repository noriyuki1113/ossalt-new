/**
 * ossalt.jp MCPサーバー（Cloudflare Workers版・リモートMCP）
 *
 * Streamable HTTP の「状態を持たない」形で動かす:
 *   POST /mcp  … JSON-RPC のメッセージを受け、JSON で応答（通知だけなら 202）
 *   GET  /mcp  … 405（サーバーからの通知の流れは使わない）
 *   GET  /     … 説明のテキスト
 *
 * データは ossalt.jp の静的なJSON APIを読むだけで、保存するものはない（読み取り専用）。
 */
import { createServer, DEFAULT_API_BASE, SERVER_INFO } from "./core.mjs";

let server;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...CORS } });

export default {
  async fetch(request, env) {
    server ??= createServer({ apiBase: env?.OSSALT_API_BASE || DEFAULT_API_BASE });
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    if (url.pathname === "/" && request.method === "GET") {
      return new Response(
        `${SERVER_INFO.title} MCP server ${SERVER_INFO.version}\n\nMCP endpoint: ${url.origin}/mcp\nDocs: https://ossalt.jp/api/\n`,
        { headers: { "Content-Type": "text/plain; charset=utf-8", ...CORS } },
      );
    }

    if (url.pathname !== "/mcp") return new Response("Not found", { status: 404, headers: CORS });
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { Allow: "POST", ...CORS } });

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
    }
    const batch = Array.isArray(body) ? body : [body];
    const results = (await Promise.all(batch.map((m) => server.handle(m)))).filter(Boolean);
    if (results.length === 0) return new Response(null, { status: 202, headers: CORS });
    return json(Array.isArray(body) ? results : results[0]);
  },
};
