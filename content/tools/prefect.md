---
description: "Prefectとは、Pythonでデータ処理の流れ（パイプライン）を組み、スケジュールや再試行つきで動かせる、ワークフロー管理のフレームワークです。できること、導入の流れ、向く人と注意点を、公式READMEをもとに整理します。"
updated: "2026-10-29"
at_a_glance:
  what: "Pythonのスクリプトを、スケジュール・キャッシュ・再試行・イベントでの自動実行つきの、本番のワークフローにするフレームワークです。"
  good_for:
    - "Pythonでデータ処理を書いていて、定期実行や再試行を足したいデータ担当者"
    - "処理の状況を、画面で確認したい人"
  not_for:
    - "Pythonを書かない人（READMEの使い方は、Pythonのコードが前提です）"
    - "画面だけで連携を作りたい人（Zapierのようなノーコードのサービスではありません）"
  check:
    - "Python 3.11以上が必要です"
    - "自分のサーバーで動かす場合は、Prefectサーバーを用意する（公式の自前運用の説明を確認）"
    - "ライセンスはApache-2.0です"
verification:
  status: official
  checked_at: "2026-10-29"
  sources:
    - https://github.com/PrefectHQ/prefect/blob/HEAD/README.md
    - https://github.com/PrefectHQ/prefect/blob/HEAD/LICENSE
  note: "READMEとLICENSEの内容と、この解説を照合した（実機では動かしていない）"
---

Prefect（プリフェクト）は、READMEで「Pythonでデータパイプラインを作るための、ワークフロー管理のフレームワーク」と説明されています。スクリプトを、本番のワークフローに引き上げる、最も簡単な方法だとされています。スケジュール、キャッシュ、再試行、イベントでの自動実行などの機能があります。

### 導入の流れ（READMEの記載）

1. Python 3.11以上を用意し、`pip install -U prefect`（または `uv add prefect`）でインストールします。
2. Pythonのファイルに、`flow` と `task` のデコレーターを付けて、処理を書きます（READMEにサンプルがあります）。
3. `prefect server start` でPrefectサーバーを起動し、`http://localhost:4200` で実行の状況を見ます。
4. 定期実行するには、`serve` を使い、cron式でスケジュールを指定します。

実行の状況は、自分のサーバーで動かすPrefectサーバーか、公式のクラウド（Prefect Cloud）で追えます。

### 向いている人

- Pythonで処理を書き、スケジュールや再試行を足したい人。

### 向いていない人

- Pythonを書かない人。READMEの使い方は、Pythonのコードが前提です。
- 画面だけで連携を組みたい人。Zapierとは、使い方が違います。

### 注意点

- ライセンスはApache-2.0です。
- 公式のクラウド版（Prefect Cloud）もあります。自前で運用する場合との違いは、公式の説明で確認してください。

### 出典と確認の範囲

- 確認した資料：公式リポジトリのREADME・LICENSE（2026-10-29）。
- 確認していないこと：実際の導入、性能、Zapierとの機能比較、クラウド版の料金。
