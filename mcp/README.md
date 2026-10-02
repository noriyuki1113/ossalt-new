# ossalt.jp MCP サーバー

[ossalt.jp](https://ossalt.jp/) のデータを、Claude や ChatGPT などのAIから直接使えるようにする
[MCP](https://modelcontextprotocol.io/) サーバーです。
「Notionの代わりになる、日本語の画面があってDockerで動かせるOSSは？」のような質問に、
ライセンス・日本語対応・Docker・GitHubの活発さ・セキュリティ評価のデータで答えられるようになります。

データは ossalt.jp の公開API（https://ossalt.jp/api/v1/）を読むだけで、読み取り専用です。依存ライブラリはありません。

## 使えるツール

| ツール | 内容 |
|---|---|
| `search_alternatives` | SaaSの名前（Notion、Slack、kintone、チャットワーク など）から代わりになるOSSを探す。日本語・Docker・一般的なOSSのみ で絞り込める |
| `search_tools` | OSSを名前・代替対象・カテゴリで検索する |
| `get_tool` | OSSの詳細（ライセンス、日本語対応、スターの伸び、セキュリティ評価、比較ページ） |
| `compare_tools` | 2〜4件のOSSを並べて比べる |
| `list_categories` | カテゴリの一覧 |

各結果には ossalt.jp のページのURL（`page_url`）が入っています。`null` は「未確認」で、「非対応」という意味ではありません。

## 使い方

### A. リモートMCP（URLを登録するだけ）

Cloudflare Workers で公開している場合は、AIのアプリのコネクタ（カスタムコネクタ）の設定に、次のURLを登録します。

```
https://<公開先>/mcp
```

### B. 手元で動かす（Claude Desktop など）

Node.js 18以上が必要です。このフォルダを手元に置き、設定ファイルに次のように書きます。

```json
{
  "mcpServers": {
    "ossalt": {
      "command": "node",
      "args": ["/path/to/ossalt-new/mcp/bin/ossalt-mcp.mjs"]
    }
  }
}
```

## 開発

```sh
node --test mcp/test/*.test.mjs   # テスト
OSSALT_API_BASE=http://localhost:4173/api/v1 node mcp/bin/ossalt-mcp.mjs   # 手元のデータで試す
```

- `src/core.mjs` … ツールの定義と処理、JSON-RPC の処理（通信方式に依存しない部分）
- `bin/ossalt-mcp.mjs` … stdio 版
- `src/worker.mjs` … Cloudflare Workers 版（Streamable HTTP、状態を持たない形）
- 公開は `.github/workflows/deploy-mcp.yml`（Secrets の設定が必要）
