---
description: "HoppscotchとInsomniaの違いを比べます。どちらもPostmanの代わりになるAPIクライアントのオープンソースですが、Hoppscotchはブラウザですぐ使えてチームのサーバーを自前で置ける作り、Insomniaは多くの方式に対応したデスクトップのアプリです。"
updated: "2026-10-06"
---

**結論：インストールせずにブラウザですぐ使いたい、チームの作業場所を自分のサーバーに置きたいならHoppscotch、REST・GraphQL・gRPCなど多くの方式を1つのデスクトップのアプリで扱い、APIの設計もしたいならInsomniaです。**

- **Hoppscotchを選ぶ場合**：ブラウザで開くだけで使えます。自分のサーバーで動かせば、チームでリクエストのまとまり（コレクション）を共有する場所にできます。デスクトップのアプリもあり、画面の日本語翻訳も確認できています。
- **Insomniaを選ぶ場合**：REST、GraphQL、gRPC、WebSocketなどに対応し、OpenAPIの仕様書の編集もできます。保存先を、手元だけ・Git・Insomniaのクラウドから選べます。

**Insomniaの注意点**：過去のバージョンの更新で、アカウントでのログインを求める変更が議論になったことがあります。手元だけで使う設定ができるかを、導入のときに確認してください。

**共通の点**：どちらも、Postmanのコレクションの読み込みに対応しています。ライセンスはHoppscotchがMIT、InsomniaがApache-2.0です。

詳しくは[Hoppscotchとは](/tools/hoppscotch/)、[Insomniaとは](/tools/insomnia/)、[Postmanの代替](/alternatives/postman/)のページを参照してください。
