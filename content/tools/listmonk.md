---
description: "listmonkとは、ニュースレターとメーリングリストを管理できる、自分のサーバーで動かすオープンソースです。できること、導入の流れ、向く人と注意点を、公式READMEをもとに整理します。"
updated: "2026-10-29"
at_a_glance:
  what: "ニュースレターとメーリングリストを管理する、自分のサーバーで動かすオープンソースです。1つの実行ファイルで動きます。"
  good_for:
    - "ニュースレターや一斉配信の宛先を、自分のサーバーで管理したい人"
    - "Dockerまたは実行ファイルで、手軽に始めたい人"
  not_for:
    - "PostgreSQLを用意して運用できない人（データの保存先にPostgreSQLを使います）"
    - "メールの配信そのものを、すべて任せたい人（配信の設定は自分で行います）"
  check:
    - "PostgreSQLの用意とバックアップ"
    - "ライセンスはAGPL-3.0です。改変して外部に提供する場合は、ソースの公開が必要です"
    - "メールの送信設定（READMEは詳細を公式ドキュメントに案内しています）"
verification:
  status: official
  checked_at: "2026-10-29"
  sources:
    - https://github.com/knadh/listmonk/blob/HEAD/README.md
    - https://github.com/knadh/listmonk/blob/HEAD/LICENSE
  note: "READMEとLICENSEの内容と、この解説を照合した（実機では動かしていない）"
---

listmonk（リストモンク）は、READMEによると「単体で動く、自分のサーバーで運用する、ニュースレターとメーリングリストの管理ツール」です。速く、機能が多く、1つの実行ファイル（バイナリ）にまとまっていると説明されています。データの保存先には、PostgreSQLを使います。

### 導入の流れ（READMEの記載）

**Dockerの場合**
1. 公式のdocker-compose.ymlをダウンロードします。
2. `docker compose up -d` で起動します。
3. `http://localhost:9000` を開きます。

**実行ファイルの場合**
1. 最新のリリースをダウンロードして展開します。
2. `./listmonk --new-config` で設定ファイル（config.toml）を作り、編集します。
3. `./listmonk --install` で、PostgreSQLの準備をします（既存のデータベースの更新は `--upgrade`。何度実行しても副作用はない、とREADMEにあります）。
4. `./listmonk` を実行して、`http://localhost:9000` を開きます。

詳しい手順は、公式のインストールの説明（listmonk.app/docs/installation）に案内されています。公式のデモ（demo.listmonk.app）もあります。

### 向いている人

- 購読者のリストと一斉配信を、自分のサーバーで管理したい人。
- 実行ファイル1つで動く、軽い構成を好む人。

### 向いていない人

- データベース（PostgreSQL）の用意と、バックアップを担当できない人。

### 注意点

- ライセンスはAGPL-3.0です。
- 開発に使われている技術は、バックエンドがGo、フロントエンドがVueとBuefyだとREADMEにあります。

### 出典と確認の範囲

- 確認した資料：公式リポジトリのREADME・LICENSE（2026-10-29）。
- 確認していないこと：実際の導入、メールの到達率、他のサービスとの機能比較。
