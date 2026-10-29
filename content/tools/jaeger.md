---
description: "Jaegerとは、サービス間の処理の流れを追いかける、分散トレーシングのオープンソースです。できること、始め方、Datadogとの違い、向く人と注意点を、公式READMEをもとに整理します。"
updated: "2026-10-29"
at_a_glance:
  what: "複数のサービスにまたがる処理の流れ（トレース）を集めて表示する、分散トレーシングの基盤です。CNCFの卒業プロジェクトです。"
  good_for:
    - "マイクロサービスなどで、処理の遅れや失敗の場所を、サービスをまたいで追いたい人"
    - "OpenTelemetryでトレースを送る構成を取りたい人"
  not_for:
    - "ログやメトリクスを含む監視全体を、1つで置き換えたい人（Jaegerは分散トレーシングの基盤です）"
    - "保存先（ElasticsearchやCassandraなど）を運用できない人（試用の構成はメモリ上の保存です）"
  check:
    - "本番の保存先と構成（公式のGetting Startedを確認）"
    - "ライセンスはApache-2.0です"
verification:
  status: official
  checked_at: "2026-10-29"
  sources:
    - https://github.com/jaegertracing/jaeger/blob/HEAD/README.md
    - https://github.com/jaegertracing/jaeger/blob/HEAD/LICENSE
  note: "READMEとLICENSEの内容と、この解説を照合した（実機では動かしていない）"
---

Jaeger（イエーガー）は、READMEで「分散トレーシングのシステム」と説明されています。Uber Technologiesが作り、CNCFに寄贈されました。CNCFで7番目のトップレベルのプロジェクトで、2019年10月に卒業しています。現在はJaeger v2が公開されています。

### 始め方（READMEの記載）

Dockerで、すべてを1つにまとめた構成（画面・収集・検索・メモリ上の保存）を動かせます。画面は `http://localhost:16686`、トレースはOTLP（gRPCは4317番、HTTPは4318番）で送ります。本番の構成は、公式のGetting Startedを確認するよう案内されています。

### 仕組み（READMEの構成図）

アプリのOpenTelemetry SDKからJaeger Collectorにトレースを送り、保存先に書き込みます。Jaeger Query Serviceが保存先を読み、Jaeger UIで表示します。保存先には、ElasticsearchやOpenSearch、Cassandraなどが案内されています（各保存先の保守の方針に従う、とREADMEにあります）。

### Datadogとの違い

Datadogは、ログ・メトリクス・トレースなどをまとめた監視のサービスです。Jaegerは、その中の**分散トレーシング**を担います（この比較は、READMEの説明からの整理です）。

### 注意点

- ライセンスはApache-2.0です。
- 設定の項目を廃止するときは、少なくとも3か月か、2つのマイナーバージョンの猶予を置く方針が、READMEにあります。

### 出典と確認の範囲

- 確認した資料：公式リポジトリのREADME・LICENSE（2026-10-29）。
- 確認していないこと：実際の導入、性能、Datadogとの機能の細かい比較。
