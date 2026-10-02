import { API_BASE, BASE, DATA_NOTICE, builtAt, json } from "@/lib/agent-data";

export const dynamic = "force-static";

export function GET() {
  return json({
    name: "ossalt.jp データAPI",
    description: "SaaSの代わりになるオープンソースのデータ（ライセンス・日本語対応・Docker・GitHubの活発さ・セキュリティ評価）。静的なJSONファイルで、認証は不要です。",
    version: "v1",
    updated_at: builtAt(),
    docs: `${BASE}/api/`,
    endpoints: {
      tools: `${API_BASE}/tools.json`,
      tool: `${API_BASE}/tools/{id}.json`,
      alternatives: `${API_BASE}/alternatives.json`,
      alternative: `${API_BASE}/alternatives/{slug}.json`,
      categories: `${API_BASE}/categories.json`,
      tool_markdown: `${BASE}/md/tools/{id}.md`,
      alternative_markdown: `${BASE}/md/alternatives/{slug}.md`,
    },
    mcp: { url: "https://mcp.ossalt.jp/mcp", transport: "streamable-http", auth: "none" },
    notice: DATA_NOTICE,
  });
}
