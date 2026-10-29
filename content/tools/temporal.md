---
description: "Temporalとは、アプリの処理（ワークフロー）を、障害が起きても確実に実行し続ける「永続的な実行」の基盤です。できること、向く人、導入前の確認点を、公式READMEをもとに整理します。"
updated: "2026-10-29"
at_a_glance:
  what: "アプリの処理（ワークフロー）を、一時的な障害があっても自動で再試行しながら実行し続ける、永続的な実行（durable execution）の基盤です。"
  good_for:
    - "処理の失敗や中断があっても、確実に最後まで実行したい開発者"
    - "Goなどでワークフローを書いて、実行の状況を画面で確認したい人"
  not_for:
    - "プログラムを書かずに、画面だけで自動化したい人（開発者向けの基盤です）"
    - "単純な定期実行だけでよい人（READMEは、ワークフローとワーカーの実装が前提です）"
  check:
    - "使うプログラミング言語に対応したSDKがあるか（公式ドキュメントで確認）"
    - "本番の構成（データベースなど）は公式ドキュメントで確認する"
    - "ライセンスはMITです"
verification:
  status: official
  checked_at: "2026-10-29"
  sources:
    - https://github.com/temporalio/temporal/blob/HEAD/README.md
    - https://github.com/temporalio/temporal/blob/HEAD/LICENSE
  note: "READMEとLICENSEの内容と、この解説を照合した（実機では動かしていない）"
---

Temporal（テンポラル）は、READMEで「durable execution platform（永続的な実行の基盤）」と説明されています。開発者が、生産性を落とさずに、拡張できて信頼できるアプリを作れるようにするものです。

Temporalのサーバーは、アプリの処理の単位である「ワークフロー」を、粘り強く実行します。一時的な障害を自動で扱い、失敗した処理を再試行します。READMEによると、UberのCadenceから分かれた技術で、Cadenceの作者たちが作った会社（Temporal Technologies）が開発しています。

### できること（READMEの範囲）

- ワークフローの実行：サーバーが、ワークフローを耐障害的に実行します。
- 開発用サーバーの起動：`brew install temporal` のあと `temporal server start-dev` で、手元で試せます。
- コマンドライン（CLI）：`temporal workflow list` などで、状態を見られます。
- Web画面：`http://localhost:8233` で、動いているワークフローを確認できます。
- サンプル：GoとJavaのサンプルが公開されています。

このリポジトリは**サーバーのソースコード**です。ワークフローなどを書くには、公式がサポートする言語のSDKを使う、とREADMEにあります。

### 向いている人

- 処理が途中で止まっても、確実に続きから実行したい開発者。

### 向いていない人

- コードを書かずに、画面で自動化を組みたい人。Zapier のような画面中心のツールとは、使い方が違います（READMEの対象は開発者です）。

### 注意点

- ライセンスはMITです。
- 本番の構成や運用は、このページでは扱いません。公式ドキュメント（docs.temporal.io）で確認してください。

### 出典と確認の範囲

- 確認した資料：公式リポジトリのREADME・LICENSE（2026-10-29）。
- 確認していないこと：実際の導入、性能、本番運用の手順。
