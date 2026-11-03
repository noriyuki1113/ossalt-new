---
description: "Brunoとは、APIのリクエストを、普通のファイルとしてフォルダに保存できる、クラウドに依存しないオープンソースのAPIクライアントです。できること、Postmanとの違い、Gitでチームと共有する方法と、有料版の考え方を解説します。"
updated: "2026-11-01"
at_a_glance:
  what: "APIのリクエストをテキストファイルで保存し、Gitで共有できるAPIクライアントです。"
  good_for:
    - "APIのリクエストをコードと一緒にGitで管理したいチーム"
    - "手元のコレクションをCLIでも実行したい人"
  not_for:
    - "サービス側のクラウド同期でコレクションを共有したいチーム"
  check:
    - "既存のリクエスト・認証・テストが移行後も動くか"
    - "必要な機能が無料版に含まれるか"
    - "秘密の値をGitや実行結果に残さない運用"
verification:
  status: official
  checked_at: "2026-11-01"
  sources:
    - https://github.com/usebruno/bruno/blob/e559194058d7802627ce692b90358d5f6b9deabc/readme.md
    - https://github.com/usebruno/bruno/blob/e559194058d7802627ce692b90358d5f6b9deabc/packages/bruno-cli/readme.md
    - https://github.com/usebruno/bruno/blob/e559194058d7802627ce692b90358d5f6b9deabc/license.md
  note: "公式README・CLIのREADME・MITライセンスを照合。アプリの実機利用・移行・CLI実行は未検証。"
---

Bruno（ブルーノ）は、APIにリクエストを送って、結果を確かめるためのアプリです。Postmanの代わりを探すときの候補になります。最大の特徴は、リクエストの内容を、**Bruというテキスト形式で、自分のパソコンのフォルダに保存する**ことです。公式READMEは、クラウド同期を追加する予定はないと説明しています。Mac・Windows・Linux向けの配布と、日本語訳のREADMEがあります。

### できること

- **リクエストの送信と確認**：URLや送るデータを入力して、APIの応答を確かめられます。
- **ファイルでの管理**：リクエストのまとまり（コレクション）が、フォルダとファイルになります。
- **Gitでの共有**：ファイルなので、Gitで管理して、チームで共有できます。変更の履歴も、Gitで追えます。
- **環境ごとの切り替え**：開発用・本番用など、接続先や値を、環境ごとに切り替えられます。
- **コマンドでの実行**：コマンド（CLI）で、リクエストを自動で実行して、テストに使えます。

### Postmanとの違い

Postmanからの乗り換えで確認したいのは、共有方法です。Brunoは、**ファイルとして手元に置き、Gitで共有する**考え方です。リクエストの定義をコードと一緒に管理したい場合に向いています。クラウド同期による共有を続けたいチームは、現在のサービスを使い続ける選択肢も含めて検討してください。ブラウザで使う候補には、[Hoppscotch](/tools/hoppscotch/)があります（[BrunoとHoppscotchの違い](/compare/bruno-vs-hoppscotch/)、[BrunoとInsomniaの違い](/compare/bruno-vs-insomnia/)）。

### 導入前に少数のリクエストで試すこと

次は、ファイル管理とCLIの仕組みを踏まえた、当サイトの確認手順の提案です。移行の成功を実測したものではありません。

1. 代表的なリクエストを選び、接続先・認証・応答・既存のテストを確認します。移行元と完全に互換だとは決めつけないでください。
2. 開発用と本番用の値を分け、秘密の値を含めずにチームへ共有できるか確かめます。Gitへ入れる前に差分を確認します。
3. 自動テストにも使う場合は、CLIの実行結果と失敗時の扱いを確認します。公式資料には、コレクションのフォルダで `bru run` を使う例や、`--env Local` で環境を選ぶ例があります。

Dockerの案内は**CLIを動かすためのもの**です。ブラウザで共同利用するサーバー版として説明されているものではありません。また、クラウドへ定義を同期しない設計でも、リクエストは指定したAPIへ送られます。送信先や送るデータの確認は必要です。

### 注意点

- **APIの鍵（トークン）やパスワードを、Gitに入れないよう注意してください。** ファイルとして保存されるので、うっかりリポジトリに含めてしまうと、漏れます。秘密の値は、環境の設定を、Gitの対象から外して管理しましょう。
- 無償で使える版（MIT）のほかに、追加の機能を持つ有料の版があります。必要な機能が、無償の版にあるかを確認してください。

[Postmanの代替](/alternatives/postman/)のページで、ほかの候補も比べられます。

### 出典と確認の範囲

2026年11月1日に、[公式README](https://github.com/usebruno/bruno/blob/e559194058d7802627ce692b90358d5f6b9deabc/readme.md)、[CLIのREADME](https://github.com/usebruno/bruno/blob/e559194058d7802627ce692b90358d5f6b9deabc/packages/bruno-cli/readme.md)、[ライセンス](https://github.com/usebruno/bruno/blob/e559194058d7802627ce692b90358d5f6b9deabc/license.md)を確認しました。無料版と有料版の詳細な機能差、Postmanからの移行結果、実際のアプリやCLIの動作は未検証です。必要な機能は[公式の料金ページ](https://www.usebruno.com/pricing)で確認してください。
