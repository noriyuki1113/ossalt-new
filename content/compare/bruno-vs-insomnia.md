---
description: "BrunoとInsomniaの違いを比べます。どちらもPostmanの代わりになるAPIクライアントのアプリですが、Brunoはリクエストをファイルで持ちGitで共有する作り、InsomniaはGraphQLやgRPCなど多くの方式に対応し、保存先を選べる作りです。"
updated: "2026-10-06"
---

**結論：アカウントやクラウドを使わずに、リクエストの定義をGitでコードと一緒に管理したいならBruno、REST以外にGraphQL・gRPC・WebSocketなども1つのアプリで試したいならInsomniaです。**

- **Brunoを選ぶ場合**：リクエストを、パソコンの中のテキストファイルとして保存します。Gitで変更の履歴を残し、プルリクエストで見直しながらチームで共有できます。クラウドへの保存の仕組みは持ちません。
- **Insomniaを選ぶ場合**：REST、GraphQL、gRPC、WebSocket、SSEなどに対応しています。保存先として、手元だけ、Git、Insomniaのクラウドを選べます。APIの設計（OpenAPIの編集）の機能もあります。

**Insomniaの注意点**：Insomniaは、APIゲートウェイのKongが開発しています。過去のバージョンの更新で、アカウントでのログインを求める変更が議論になったことがあります。使う前に、手元だけで使う設定ができるかを確認してください。

**共通の点**：どちらも、Postmanのコレクションの読み込みに対応しています。ライセンスはBrunoがMIT、InsomniaがApache-2.0です。

詳しくは[Brunoとは](/tools/bruno/)、[Postmanの代替](/alternatives/postman/)のページを参照してください。
