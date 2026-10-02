# MCPサーバーの登録の手引き

ossalt.jp のMCPサーバー（`https://mcp.ossalt.jp/mcp`）を、MCPの一覧サイトに登録して、AIの利用者に見つけてもらうための手引きです。
**申請は運営者が手作業で行います**（自動で送らない）。

## 先に決めておく方針

- **運営者名（GitHubのアカウント名）を、登録先に出さない。**
  GitHubのリポジトリのURLには、アカウント名が入っています。リポジトリのURLを必須とする一覧サイトには、登録しません（下の「見送るもの」）。
- **英語の紹介文を使う。** 一覧サイトの利用者の多くは、英語で探します（日本語の説明は、ossalt.jp のサイトにあります）。
- **一度に多くの場所へ送らない。** 反応を見ながら、公式のレジストリ → 手動で申請できる一覧 の順に進めます。

## 登録の候補

| 登録先 | 方法 | 運営者名が出るか | おすすめ度 |
|---|---|---|---|
| **公式MCPレジストリ**（registry.modelcontextprotocol.io） | `mcp-publisher` というコマンドで、`mcp/server.json` を登録する | **出ない**（ドメイン `jp.ossalt` で認証する場合） | 高 |
| mcp.so | **GitHubに新しいイシューを作って投稿する**（サイトの「投稿」ボタンから） | **出る**（投稿したGitHubのアカウント名が、公開で表示される） | 見送り。運営用のGitHubアカウントを別に作った場合のみ検討 |
| Smithery、Glama など、GitHubのリポジトリを読み込む一覧 | リポジトリを連携する | **出る**（リポジトリのURL） | 見送り |

> ※一覧サイトの仕様や手順は、変わることがあります。作業の前に、各サイトの公式の案内を確認してください。
> ここに書いた内容は、2026年10月時点の理解にもとづく下書きです（作成した環境から、これらのサイトに接続できなかったため、各サイトの最新の画面では確認していません）。

## 1. 公式MCPレジストリへの登録

### 準備したもの

`mcp/server.json` に、登録用のファイルを用意しています。

- 名前：`jp.ossalt/mcp`（`jp.ossalt` は、ドメイン `ossalt.jp` を逆にしたもの）
- 公開先：`https://mcp.ossalt.jp/mcp`（Streamable HTTP）
- リポジトリのURLは**入れていません**（運営者名を出さないため）
- 説明は英語で97文字（上限は100文字）。バージョンは `mcp/package.json` と一致（テストで確認）

### 運営者にお願いしたい作業

名前に `jp.ossalt` を使うには、**ossalt.jp のドメインの持ち主であることを、レジストリに証明**する必要があります。方法は主に2つです。

- **DNSのTXTレコードで証明する：** Cloudflareの「DNS」→「レコード」に、レジストリの指示どおりのTXTレコードを足します。
- **ドメインの下に、認証用のファイルを置く：** `https://ossalt.jp/.well-known/` の下に置きます（その場合は、ファイルの内容を教えてください。サイトに置く作業は、私が行います）。

手順の概要は次のとおりです。細かいコマンドは、公式の案内に従ってください。

1. `mcp-publisher` をインストールします（公式の案内に、方法が書かれています）。
2. 認証用の鍵を作り、公式の案内どおりに、ドメインの認証を行います。**鍵の秘密の部分は、このチャットに貼らず、手元で保管してください。**
3. `mcp/server.json` を指定して、公開（publish）します。
4. 公開後に、レジストリの検索で、`jp.ossalt/mcp` が表示されることを確認します。

## 2. mcp.so への投稿（見送り）

mcp.so の「よくある質問」によると、投稿は**GitHub上に新しいイシューを作る**形です（2026年10月に、運営者がサイトの画面を保存したPDFで確認）。
そのため、投稿者のGitHubのアカウント名が、公開で表示されます。**運営者名を出さない方針と合わないため、今は見送ります。**

運営用のGitHubアカウント（運営者名の入っていないもの）を別に作った場合は、そのアカウントで投稿できます。投稿には、次の内容を書きます。

- 名前：ossalt.jp
- リモートMCPのURL：`https://mcp.ossalt.jp/mcp`（認証なし）
- サイトのURL：`https://ossalt.jp/api/`
- 説明：下の英語の紹介文

### 英語の紹介文（コピーして使う）

**短い説明（1〜2文）**

> Find open-source alternatives to SaaS products (Notion, Slack, Zapier, kintone, freee…) with license, Japanese UI support, Docker support, GitHub activity and OpenSSF Scorecard. Read-only, no authentication.

**長い説明**

> ossalt.jp is a Japanese directory of open-source alternatives to SaaS. This MCP server lets AI assistants search about 380 self-hostable projects by the SaaS they replace, and filter by Japanese UI support, Docker support, and whether the license is a standard open-source license.
>
> Tools: `search_alternatives`, `search_tools`, `get_tool`, `compare_tools`, `list_categories`.
>
> Every result includes a link to the matching ossalt.jp page so answers can cite their source. A `null` value means "not verified", not "unsupported". Data comes from public GitHub data and automated repository checks, and is updated daily. The server is read-only and does not store anything.

**日本語の説明（日本語の一覧に出す場合）**

> SaaSの代わりに自分のサーバーで動かせるオープンソースを、ライセンス・日本語対応・Docker・GitHubの活発さ・セキュリティ評価で探せます。kintone・freee・Chatworkなど、日本のSaaSの代わりにも対応しています。読み取り専用で、認証は不要です。

## 見送るもの

- **Smithery、Glama など、GitHubのリポジトリの連携を前提にする一覧、mcp.so のGitHubでの投稿：** リポジトリのURL（運営者のアカウント名を含む）が、登録先に表示されるため、見送ります。
  リポジトリを、運営者名の入っていない組織（Organization）のものに移した場合は、あらためて検討できます。

## 登録したら

- 登録した場所と日付を、下の表に書き足してください（同じところに何度も申請しないため）。
- 反応を見たいときは、Cloudflareのアクセス状況（「Workers」→ `ossalt-mcp` の利用状況）で、リクエスト数を確認できます。

| 登録した日 | 登録先 | 結果 |
|---|---|---|
| | | |
