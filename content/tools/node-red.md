---
description: "Node-REDとは、部品（ノード）を線でつないで、イベントで動く処理を組める、ローコードの開発ツールです。できること、始め方、向く人と注意点を、公式READMEをもとに整理します。"
updated: "2026-10-29"
at_a_glance:
  what: "部品（ノード）をつないで、イベントで動くアプリや連携を作る、ローコードの開発ツールです。"
  good_for:
    - "画面で処理をつなぎながら、データの流れを作りたい人"
    - "公開されている部品（ノード）やフローを再利用したい人"
  not_for:
    - "クラウドのサービス連携を、設定だけで済ませたい人（Zapierのような完成した連携のサービスではありません）"
    - "Node.jsの環境を用意できない人（READMEの導入は npm を使います）"
  check:
    - "Node.jsとnpmの環境"
    - "公開されているノードを使うときの、提供元と更新状況の確認"
    - "ライセンスはApache-2.0です"
verification:
  status: official
  checked_at: "2026-10-29"
  sources:
    - https://github.com/node-red/node-red/blob/HEAD/README.md
    - https://github.com/node-red/node-red/blob/HEAD/LICENSE
  note: "READMEとLICENSEの内容と、この解説を照合した（実機では動かしていない）"
---

Node-RED（ノードレッド）は、READMEで「イベント駆動のアプリケーションのための、ローコードのプログラミング」と説明されています。OpenJS Foundationのプロジェクトです。

### 始め方（READMEのクイックスタート）

1. `sudo npm install -g --unsafe-perm node-red` でインストールします。
2. `node-red` を実行します。
3. `http://localhost:1880` を開きます。

詳しい手順は、公式ドキュメント（nodered.org/docs/getting-started/）に案内されています。

### 周辺の情報（READMEの案内）

- ノードの検索：公式の「Node-RED Library」（flows.nodered.org）で、追加のノードや共有されたフロー、ノードの集まりを探せます。
- 問い合わせ：フォーラムとSlackが案内されています。

### 向いている人

- データの流れを、画面で組み立てたい人。
- ノードを追加して、機能を広げたい人。

### 向いていない人

- 完成したクラウド連携を、設定だけで使いたい人。Zapierのようなサービスとは、作り方が違います。
- Node.jsを使える環境がない人。

### 注意点

- ライセンスはApache-2.0です（OpenJS Foundationと貢献者の著作権）。
- 追加のノードは、公開されている部品です。使う前に、提供元と更新状況を確認してください（READMEには、この点の記載はありません。一般的な注意です）。

### 出典と確認の範囲

- 確認した資料：公式リポジトリのREADME・LICENSE（2026-10-29）。
- 確認していないこと：実際の導入、性能、Zapierとの機能比較。
