---
description: "Vaultwardenとは、パスワード管理のBitwardenと互換性があり、公式のアプリをそのまま使える、軽量なオープンソースのサーバーです。できること、公式のBitwardenとの関係、自前で動かすときの注意点を解説します。"
updated: "2026-11-10"
at_a_glance:
  what: "Bitwardenと互換性のあるパスワード管理サーバーを、軽く動かせるようにしたツールです（非公式）。Bitwardenの公式のアプリをそのまま使えます。"
  good_for:
    - "小さなサーバーや自宅のサーバーで、パスワード管理を動かしたい人"
    - "軽さを優先したい人"
  not_for:
    - "公式のサポートや企業向けの機能が必要な人（公式のBitwardenが目安です）"
    - "バックアップと更新を続けられない人（止まったりデータが壊れたりすると、すべてのパスワードに影響します）"
  check:
    - "HTTPSで接続できるようにする（公式の説明では、ウェブ画面に必要。リバースプロキシの利用が推奨されています）"
    - "定期的なバックアップと、戻せることの確認"
    - "ライセンスはAGPL-3.0です"
verification:
  status: official
  checked_at: "2026-11-10"
  sources:
    - https://github.com/dani-garcia/vaultwarden/blob/HEAD/README.md
    - https://github.com/dani-garcia/vaultwarden/blob/HEAD/LICENSE.txt
    - https://github.com/dani-garcia/vaultwarden/wiki/Using-Docker-Compose
    - https://github.com/dani-garcia/vaultwarden/wiki/Enabling-admin-page
    - https://github.com/dani-garcia/vaultwarden/wiki/Updating-the-vaultwarden-image
    - https://github.com/dani-garcia/vaultwarden/wiki/Disable-registration-of-new-users
  note: "README・LICENSE・公式Wiki（Docker Compose・管理画面・更新・新規登録の無効化）と、この解説の機能・導入手順・ライセンスの記述を照合した。実機では動かしていない"
---

Vaultwarden（ボールトウォーデン）は、パスワード管理サービス「Bitwarden」と互換性のあるサーバーを、軽く動かせるようにしたツールです。Bitwardenの公式のアプリやブラウザの拡張機能を、そのまま使えます。READMEは、多くの資源を使う公式のサーバーを動かすのが向かない場合の、自前での運用に向いていると説明しています。

### できること

- **パスワードの保存と同期**：パスワードやメモなどを保存し、パソコンやスマートフォンの間で同期できます。
- **公式のアプリが使える**：Bitwardenの公式のアプリ（パソコン・スマートフォン・ブラウザの拡張機能）から、Vaultwardenのサーバーにつなげます。
- **共有**：家族やチームで、パスワードを共有する仕組みを使えます。

### 公式のBitwardenとの関係

VaultwardenはBitwardenの公式の製品ではなく、有志が作っている非公式の互換サーバーです。Bitwarden自体も自前のサーバーで動かせますが、必要なサーバーの性能が大きめです。軽さを優先するならVaultwarden、公式のサポートや企業向けの機能が必要なら公式のBitwardenを選ぶのが目安です。

### 始め方の目安

公式の資料では、コンテナのイメージ（`vaultwarden/server`）で動かす方法が推奨されています。`compose.yaml` の最小の例では、データを置く場所（`/data`）をホストのフォルダにつなぎ、公開用のドメインを `DOMAIN` に指定します（[公式のDocker Composeの案内](https://github.com/dani-garcia/vaultwarden/wiki/Using-Docker-Compose)）。更新は、新しいイメージを取得して起動し直す手順です。

- **HTTPS**：READMEによると、ウェブ画面（Web Vault）は、ブラウザの暗号機能のために、HTTPSの安全な接続でしか動きません。TLSには対応していますが、リバースプロキシを置くことが勧められています。
- **新規登録**：公式の例には、最初のアカウントを作ったら、新規登録を無効にするよう書かれています（`SIGNUPS_ALLOWED` を `false` に）。公開したままにすると、知らない人が登録できてしまいます。
- **管理画面**：設定の確認や、利用者の管理ができる管理画面があります。使うには `ADMIN_TOKEN` を設定します。**先にHTTPSにすること**が強く勧められ、トークンは、公式のコマンド（`vaultwarden hash`）で作ったハッシュで設定する方法が案内されています。使わないときは、設定しないままにして無効にできます（[管理画面の案内](https://github.com/dani-garcia/vaultwarden/wiki/Enabling-admin-page)）。
- **バックアップ**：READMEには、データの消失について開発側は責任を負えないと書かれ、ファイルとデータベースの定期的なバックアップが強く勧められています。

### 注意点

- **パスワードを預ける場所であることを忘れない**：Vaultwardenが止まったり、データが壊れたりすると、すべてのパスワードに影響します。定期的なバックアップと、戻せることの確認を必ず行ってください。
- **HTTPSが必須**：READMEによると、ウェブ画面は、HTTPSで接続できないと動きません。
- **アップデートを続ける**：セキュリティに関わるツールなので、更新を確実に適用しましょう。
- **ライセンス**：AGPL-3.0です。
