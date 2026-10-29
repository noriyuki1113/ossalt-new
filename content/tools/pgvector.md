---
description: "pgvectorとは、PostgreSQLにベクトルの類似検索を追加する、オープンソースの拡張機能です。できること、導入の流れ、Pineconeとの違い、向く人と注意点を、公式READMEをもとに整理します。"
updated: "2026-10-29"
at_a_glance:
  what: "PostgreSQLに、ベクトルの類似検索を追加する拡張機能です。ベクトルを、ほかのデータと同じデータベースに保存できます。"
  good_for:
    - "すでにPostgreSQLを使っていて、AIの埋め込み（ベクトル）を同じデータベースで扱いたい人"
    - "トランザクションやJOINなど、PostgreSQLの機能と組み合わせて検索したい人"
  not_for:
    - "PostgreSQLを使わない人（PostgreSQLの拡張機能です）"
    - "データベースの運用を任せたい人（Pineconeのようなマネージドのサービスではなく、自分で入れて運用します）"
  check:
    - "対応するPostgreSQLの版（READMEではPostgres 13以上）"
    - "ベクトルが多い場合の拡張（READMEは量子化などの方法を案内しています）"
    - "ライセンスはPostgreSQLライセンスです"
verification:
  status: official
  checked_at: "2026-10-29"
  sources:
    - https://github.com/pgvector/pgvector/blob/HEAD/README.md
    - https://github.com/pgvector/pgvector/blob/HEAD/LICENSE
  note: "READMEとLICENSEの内容と、この解説を照合した（実機では動かしていない）"
---

pgvectorは、READMEで「Postgresのための、オープンソースのベクトル類似検索」と説明されています。ベクトルを、ほかのデータと一緒に保存できます。

### できること（READMEの記載）

- 正確な近傍検索と、近似の近傍検索。
- 単精度・半精度・バイナリ・スパースのベクトル。
- L2距離・内積・コサイン距離・L1距離・ハミング距離・ジャカード距離。
- PostgreSQLのクライアントがある、どの言語からでも使える。
- そのうえで、ACID準拠、ポイントインタイムリカバリ、JOINなど、PostgreSQLの機能を使える。

### 導入の流れ（READMEの記載）

LinuxとMacでは、ソースからコンパイルしてインストールします（Postgres 13以上）。Docker、Homebrew、PGXN、APT、Yum、pkg、APK、conda-forgeでも入れられ、Postgres.appには最初から入っています。Windowsでは、Visual StudioのC++の環境でビルドします。

入れたあとは、使うデータベースごとに1回 `CREATE EXTENSION vector;` を実行し、`vector(3)` のような列を作って使います。

### Pineconeとの違い

Pineconeは、ベクトル検索のマネージドのサービスです。pgvectorは、自分のPostgreSQLに入れる拡張機能です。運用は自分で行いますが、既存のデータと同じ場所で扱えます（この比較は、READMEの説明からの整理です）。

### 注意点

- ライセンスはPostgreSQLライセンスです。

### 出典と確認の範囲

- 確認した資料：公式リポジトリのREADME・LICENSE（2026-10-29）。
- 確認していないこと：実際の導入、検索の性能、Pineconeとの機能の細かい比較。
