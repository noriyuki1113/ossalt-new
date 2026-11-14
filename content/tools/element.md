---
description: "Elementとは、Matrixという公開の仕組みで動くチャットのアプリです。自社のサーバーと組み合わせて、社内のチャットを自分で管理できます。できること、Slackとの違い、導入の注意点を解説します。"
updated: "2026-11-14"
at_a_glance:
  what: "Matrix（分散型のチャットの仕組み）のサーバーにつないで使う、チャットのアプリです。ブラウザ版とデスクトップ版があり、ここで扱うのはブラウザ版（Element Web）です。"
  good_for:
    - "社内のチャットのデータを、自社のサーバーに置きたい人"
    - "ほかの組織のMatrixのサーバーとも、つないで会話したい人"
  not_for:
    - "1つのものを入れるだけで、チャットを始めたい人（Elementは画面のアプリで、別にMatrixのサーバーが必要です）"
    - "サーバーの管理をしたくない人"
  check:
    - "Matrixのサーバー（Synapseなど）を、別に用意する"
    - "ライセンスはAGPL-3.0・GPL-3.0・有料の商用ライセンスから選べます"
verification:
  status: official
  checked_at: "2026-11-14"
  sources:
    - https://github.com/element-hq/element-web/blob/HEAD/README.md
    - https://github.com/element-hq/element-web/blob/HEAD/LICENSE-AGPL-3.0
    - https://github.com/element-hq/element-web/blob/HEAD/LICENSE-GPL-3.0
    - https://github.com/element-hq/element-web/blob/HEAD/docs/install.md
    - https://github.com/element-hq/element-web/blob/HEAD/apps/web/README.md
  note: "README、ライセンスのファイル、公式の導入の手順と安全上の注意と、この解説の機能・対応する環境・導入の方法・ライセンスの記述を照合した。実機では動かしていない"
---

Element（エレメント）は、**Matrix（マトリックス）という公開の仕組みで動くチャットのアプリ**です。Matrixは、組織ごとにサーバーを持ちながら、サーバーどうしをつないで会話できる、分散型のチャットの仕組みです。公式のREADMEでは、ElementはMatrixのWebとデスクトップのクライアントと説明されています。

### できること

- **ブラウザとデスクトップで使う**：ブラウザ版（Element Web）と、デスクトップ版（Element Desktop）があります。スマホでは、公式は新しいアプリ（Element X）を勧めています。
- **自分で配信できる**：Element Webは、Webサーバーに置くだけの静的なファイルとして配信できます。公式のファイル（tarball）、Debian・Ubuntu向けのパッケージ、Dockerのイメージが用意されています。
- **サーバーどうしの連携**：Matrixの仕組みにより、ほかの組織のMatrixのサーバーの利用者とも会話できます。
- 画面の日本語翻訳と、Dockerでの導入方法を確認できています。

### Slackとの違い

Slackは、外部のサービスとして使うチャットです。Element（とMatrixのサーバー）は、**会話のデータを自社のサーバーに置ける**のが違いです。その代わり、Elementは画面のアプリにすぎないので、会話を保存するMatrixのサーバー（[Synapse](/tools/synapse/)など）も自分で動かします。2つを用意・管理する手間を考えておきましょう。1つで完結するチャットなら、[Mattermost](/tools/mattermost/)なども候補です。

### 導入の注意点

公式の導入の手順では、次の点が強調されています。

- **HTTPSで配信する**：チャットの安全のためと、ブラウザの音声・ビデオの通話はHTTPSでないと使えないためです。
- **Matrixのサーバーと同じドメインで動かさない**：同じドメインだと、悪意のある内容によるクロスサイトスクリプティング（XSS）の危険があるため、勧められていません。
- 設定は `config.json` で行います（つなぐMatrixのサーバーなど）。

公式のREADMEでは、ブラウザの対応も決められています。デスクトップのChrome・Firefox・Edgeの最新の2つのメジャーバージョンと、Safariの最新の2つのバージョンが正式な対応です。

### 注意点

- 開発の元は、Element社（New Vector Ltd）です。
- ライセンスはAGPL-3.0（3以降）、GPL-3.0（3以降）、Element社との有料の商用ライセンスの3つから選べます（当サイトのデータではAGPL-3.0と表示しています）。

[Slackの代替](/alternatives/slack/)や[Chatworkの代替](/alternatives/chatwork/)のページで、ほかの候補も比べられます。
