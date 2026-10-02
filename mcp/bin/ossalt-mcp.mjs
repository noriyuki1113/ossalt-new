#!/usr/bin/env node
/**
 * ossalt.jp MCPサーバー（stdio版）
 *
 * Claude Desktop などの設定に次のように書いて使う:
 *   { "mcpServers": { "ossalt": { "command": "node", "args": ["/path/to/mcp/bin/ossalt-mcp.mjs"] } } }
 *
 * 環境変数 OSSALT_API_BASE でデータの取得先を変えられる（既定 https://ossalt.jp/api/v1）。
 * 標準出力は通信に使うため、ログは標準エラー出力に出す。
 */
import { createInterface } from "node:readline";
import { createServer, DEFAULT_API_BASE } from "../src/core.mjs";

const server = createServer({ apiBase: process.env.OSSALT_API_BASE || DEFAULT_API_BASE });
const rl = createInterface({ input: process.stdin });

// メッセージは届いた順に処理する（応答の順序を保ち、終了時に処理中のものを待てるように）
let queue = Promise.resolve();
rl.on("line", (line) => {
  queue = queue.then(() => processLine(line)).catch((e) => console.error("ossalt-mcp:", e));
});

async function processLine(line) {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }) + "\n");
    return;
  }
  const batch = Array.isArray(msg) ? msg : [msg];
  for (const m of batch) {
    const res = await server.handle(m);
    if (res) process.stdout.write(JSON.stringify(res) + "\n");
  }
}
rl.on("close", () => queue.then(() => process.exit(0)));
console.error("ossalt-mcp: started (stdio)");
