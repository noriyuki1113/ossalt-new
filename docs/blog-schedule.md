# ブログの投稿スケジュール

ossalt.jp のブログ（`content/blog/`）と、Zennの記事の予定表です。

## 決めごと

- **ブログは毎週火曜に1本。** SNSの予定（`docs/sns-plan.md` の「火：ブログ」）とそろえています。
- **予約投稿のしくみ：** 記事の `date:` に公開日を書いておくと、その日の朝（日本時間3時ごろ）の自動のデータ更新のあとの再ビルドで公開されます。前の日までは、サイトに出ません。
- **書くのは公開の1週間以上前まで。** 公開日の前に、運営者が内容を確認できるようにするためです。記事の作成は「〇〇の記事を書いて」と頼めば、私が下書きします。
- **Zennは2〜3週間に1本**で、ブログとは別の曜日（週末）にします。同じ内容をブログとZennの両方に載せないでください（重複コンテンツになるため）。
- 年末年始（12月29日の週）は休みます。

## 予定表

| 公開日（火） | 状態 | テーマ | ねらう検索 | 関連ページ |
|---|---|---|---|---|
| 10月6日 | 予約済み | Dockerで試す前に確認すること | docker セルフホスト 注意 | `docker-checklist.md` |
| 10月13日 | 予約済み | SEOツールを自前で | seo ツール オープンソース | `seo-tools-opensource.md` |
| 10月20日 | 予約済み | 社内Wikiを自前で持つなら | 社内wiki オープンソース | `team-wiki-selfhosted.md` |
| 10月27日 | 予約済み | VPS 1台で社内ツールをそろえる | 社内ツール セルフホスト | `small-team-selfhost-stack.md` |
| 11月3日 | 予約済み | Slackの代わりになるチャットの選び方 | slack 代替 / slack 無料 代わり | `slack-alternatives-chat.md` |
| 11月10日 | 予約済み | セルフホストを始めるVPSの選び方 | vps 選び方 セルフホスト | `vps-for-selfhosting.md`（**公開前にVPSの料金を再確認**） |
| 11月17日 | 予約済み | n8nで業務を自動化する前に：Zapierとの違いとライセンス | n8n zapier 違い / n8n 商用利用 | `n8n-license-zapier.md` |
| 11月24日 | 予約済み | 社内でChatGPTのように使えるAIを自前で動かす | chatgpt 社内 自前 / ollama open webui | `private-ai-chat-ollama.md` |
| 12月1日 | 未作成 | 自前で動かすツールのバックアップの基本（restic・Kopia） | セルフホスト バックアップ | `/tools/restic/`、`/tools/kopia/` |
| 12月8日 | 未作成 | Googleフォトから自前の写真の保存に移る（Immich・Ente） | googleフォト 代わり | `/alternatives/google-photos/`、比較ページ |
| 12月15日 | 未作成 | 2026年にGitHubのスターが伸びたOSS（データのまとめ） | oss 2026 人気 | `/trending/`（数字は書く日のデータで集計） |
| 12月22日 | 未作成 | パスワード管理を自前でするときの注意点（Vaultwarden） | vaultwarden 使い方 / bitwarden 自前 | `/tools/vaultwarden/` |
| 1月5日 | 未作成 | （1月に決める） | | |

## Zennの予定

| 目安の日 | 状態 | 記事 |
|---|---|---|
| 10月上旬 | 公開済み | 日本語対応の割合の調査（`docs/zenn/ja-support-survey.md`） |
| 10月17日（土）ごろ | 下書きあり | ライセンスの集計（`docs/zenn/license-survey.md`）。**投稿の前に言い回しを自分の言葉に直す** |
| 11月上旬 | 未作成 | サーバー代0円でサイトを作って運営する方法 |
| 11月下旬 | 未作成 | （Search Consoleの数字を見て決める） |

## 公開日にすること（運営者）

1. 朝、サイトのブログ一覧に記事が出ていることを確かめる。
2. その週のSNSの下書き（`docs/sns/drafts/`）を使って、XとBlueskyでお知らせする。
3. Search Consoleの「URL検査」で、記事のURLのインデックス登録をリクエストする（任意）。
