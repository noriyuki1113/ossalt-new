---
description: "SOPSとは、YAML・JSON・ENVなどのファイルを暗号化したまま編集できる、秘密情報の管理ツールです。できること、HashiCorp Vaultとの違い、向く人と注意点を、公式READMEをもとに整理します。"
updated: "2026-10-29"
at_a_glance:
  what: "YAML・JSON・ENV・INI・バイナリのファイルを、暗号化したまま編集できるツールです。鍵には、各クラウドのKMSやage、PGPを使えます。"
  good_for:
    - "設定ファイルの秘密情報を、暗号化したままGitで管理したい人"
    - "AWS・GCP・Azureなどの鍵管理サービスや、age・PGPの鍵を使える人"
  not_for:
    - "アプリに秘密情報を配る・発行するサーバーが必要な人（SOPSは暗号化したファイルの編集ツールで、HashiCorp Vaultのようなサーバーではありません）"
    - "鍵の管理（KMSやage・PGP）を用意できない人"
  check:
    - "使う鍵（KMS・age・PGP）の管理方法と、鍵をなくしたときの扱い"
    - "ライセンスはMPL-2.0です"
verification:
  status: official
  checked_at: "2026-10-29"
  sources:
    - https://github.com/getsops/sops/blob/HEAD/README.rst
    - https://github.com/getsops/sops/blob/HEAD/LICENSE
  note: "READMEとLICENSEの内容と、この解説を照合した（実機では動かしていない）"
---

SOPS（Secrets OPerationS）は、READMEによると「暗号化されたファイルの編集ツール」です。YAML・JSON・ENV・INI・バイナリの形式に対応し、AWS KMS、GCP KMS、Azure Key Vault、HuaweiCloud KMS、age、PGPで暗号化します。

### HashiCorp Vaultとの違い

HashiCorp Vaultは、秘密情報を保管し、アプリに配るサーバーです。SOPSは、READMEの説明では**ファイルを暗号化したまま編集する道具**です。Vaultの代わりにサーバーを立てるものではなく、設定ファイルの中の秘密情報を、暗号化した状態でリポジトリに置きたい場合の選択肢です（この比較は、READMEの説明からの整理です）。

### 経緯（READMEの記載）

2015年にMozillaのプロジェクトとして始まり、2023年にCNCFのサンドボックスのプロジェクトとして寄贈されました。現在は、新しいメンテナーのグループが管理しています。

### 向いている人

- 設定ファイルの秘密情報を、暗号化してGitで管理したいチーム。

### 向いていない人

- 秘密情報を発行・配布するサーバーが必要な人。
- 鍵の管理を用意できない人。

### 注意点

- ライセンスはMPL-2.0です。
- セキュリティの問題は、GitHubの非公開の報告フォームで知らせるよう、READMEにあります。
- 使い方の詳細は、公式のドキュメント（getsops.io）にあります。

### 出典と確認の範囲

- 確認した資料：公式リポジトリのREADME・LICENSE（2026-10-29）。
- 確認していないこと：実際の操作、各KMSとの連携の手順、Vaultとの機能の細かい比較。
