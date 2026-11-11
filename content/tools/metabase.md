---
description: "Metabaseとは、SQLを書かなくても社内のデータを集計し、グラフやダッシュボードで共有できる、Tableauの代わりになるオープンソースのBIツールです。できること、本番で使うときの設定、無料版と有料版の関係を解説します。"
updated: "2026-11-04"
at_a_glance:
  what: "社内のデータベースにつないで、データを集計し、グラフやダッシュボードにして共有するBIツールです。SQLを書かなくても集計できます。"
  good_for:
    - "エンジニアでない人も含めて、画面でデータを集計したいチーム"
    - "集計の結果を、ダッシュボードで共有したい人"
  not_for:
    - "権限を細かく管理したい人（追加した有料の版で提供されています）"
    - "設定の保存先を、内蔵のデータベースのまま本番で使いたい人（本番ではPostgreSQLなどの別のデータベースにします）"
  check:
    - "本番では、設定の保存先を別のデータベースにする"
    - "つなぐデータベースには、読み取りだけができるアカウントを用意する"
    - "ライセンスはAGPL-3.0です"
verification:
  status: official
  checked_at: "2026-11-11"
  sources:
    - https://github.com/metabase/metabase
    - https://www.metabase.com/docs/latest/installation-and-operation/running-metabase-on-docker
    - https://www.metabase.com/docs/latest/installation-and-operation/migrating-from-h2
    - https://www.metabase.com/license/
    - https://www.metabase.com/pricing/
    - https://www.metabase.com/docs/latest/databases/connecting
    - https://www.metabase.com/docs/latest/databases/users-roles-privileges
    - https://www.metabase.com/docs/latest/questions/alerts
    - https://github.com/metabase/metabase/tree/master/locales
  note: "README、公式ドキュメント（Docker・H2からの移行・データベースの接続・読み取り専用アカウント・通知）、ライセンスの案内、料金のページ、翻訳ファイルの一覧と、この解説の機能・導入手順・ライセンスの記述を照合した。ライセンスの案内のページは、取得できた写しが2026-07-17付けと古い。Tableauとの比較の評価は、照合の対象外。実機では動かしていない"
---

Metabase（メタベース）は、社内のデータベースにつないで、データを集計し、グラフやダッシュボードにして共有するためのBIツールです。SQLを書かなくても、画面で条件を選ぶだけで集計できるので、エンジニアでない人も使いやすいのが特徴です。画面の日本語翻訳もあります。

### できること

- **質問の形での集計**：「月ごとの売上」「地域ごとの会員数」のような集計を、画面で条件を選んで作れます。必要ならSQLでも書けます。
- **ダッシュボード**：作ったグラフや表を並べて、チームで共有できます。
- **定期的な通知**：決まった時間に、集計の結果をメールやチャットで送れます。
- **多くのデータベースに対応**：PostgreSQL、MySQL、BigQueryなど、多くのデータの置き場所につなげます。

### 試し方と、本番で使うときの設定

公式のDockerの手順では、次のコマンドでオープンソース版を起動し、`http://localhost:3000` で開けます（[Dockerでの実行](https://www.metabase.com/docs/latest/installation-and-operation/running-metabase-on-docker)）。

```
docker pull metabase/metabase:latest
docker run -d -p 3000:3000 --name metabase metabase/metabase
```

ただし、これは試すための設定です。Metabaseは、自分の設定（作った質問、ダッシュボード、コレクションなど）を、内蔵のH2データベースにファイルとして保存します。**コンテナを削除すると、これらが失われる**と書かれています。

本番で使う場合は、公式の説明に沿って、設定の保存先をPostgreSQLなどの別のデータベースにします。環境変数（`MB_DB_TYPE`・`MB_DB_HOST` など）で接続先を渡す例が示されています。すでにH2で使い始めた場合は、公式の[H2から本番用データベースへの移行手順](https://www.metabase.com/docs/latest/installation-and-operation/migrating-from-h2)があります。パスワードは、Dockerのシークレットでファイルから渡す方法も案内されています。

### 無料版と有料版

オープンソース版（AGPL）のほかに、権限の細かい管理などを追加した、有料のPro・Enterprise版があります。公式のライセンスの説明では、Enterprise版はソースが公開されていますが、**商用ライセンスがないと、Enterpriseの機能は使えません**。Dockerのイメージも、オープンソース版とEnterprise版で別です。

自分のアプリにMetabaseのグラフを埋め込む場合は、条件が分かれます。AGPLに従う、「Powered by Metabase」のロゴを残す埋め込み用のライセンスに従う、または商用ライセンスを買う、のいずれかです（[ライセンスの案内](https://www.metabase.com/license/)）。社内で使うだけか、外に見せるかで、必要な条件が変わります。

### 注意点

- 社内のデータベースにつなぐときは、Metabase用に、読み取りだけができるアカウントを用意すると安全です。

[Tableauの代替](/alternatives/tableau/)のページも参考にしてください。
