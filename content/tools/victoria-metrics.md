---
description: "VictoriaMetricsとは、サーバーやアプリの数値（メトリクス）を保存する、Prometheus互換の時系列データベースです。少ない資源で多くのデータを扱えることを特長にしています。できること、Datadogとの違い、始め方と注意点を解説します。"
updated: "2026-11-14"
at_a_glance:
  what: "CPUの使用率やリクエスト数などの数値を、時刻と一緒に保存して検索するためのデータベースです。Prometheusの長期の保存先や、置き換えとして使えます。"
  good_for:
    - "Prometheusのデータを長く保存したい人、置き換えたい人"
    - "1つの実行ファイルで、手軽に監視のデータの保存先を用意したい人"
  not_for:
    - "ログ・トレース・画面まで、1つのサービスでまとめて使いたい人（画面はGrafanaなどを組み合わせます）"
    - "サーバーの管理をしたくない人"
  check:
    - "保存期間の初期値は1か月です。必要な期間と容量を決める"
    - "ライセンスはApache-2.0です（Enterprise版は別）"
verification:
  status: official
  checked_at: "2026-11-14"
  sources:
    - https://github.com/VictoriaMetrics/VictoriaMetrics/blob/HEAD/README.md
    - https://github.com/VictoriaMetrics/VictoriaMetrics/blob/HEAD/LICENSE
    - https://docs.victoriametrics.com/victoriametrics/quick-start/
    - https://docs.victoriametrics.com/victoriametrics/single-server-victoriametrics/
  note: "README、LICENSE、公式ドキュメント（クイックスタート・シングルノード版）と、この解説の機能・導入手順・ポート番号・保存期間・ライセンスの記述を照合した。実機では動かしていない"
---

VictoriaMetrics（ヴィクトリアメトリクス）は、サーバーやアプリの数値（メトリクス）を保存するための**時系列データベース**です。公式のREADMEでは、Prometheusの長期の保存先として、またPrometheusやGraphiteの置き換えとして、Grafanaから使えると説明されています。

### できること

- **Prometheus互換**：PromQLと、独自に拡張したMetricsQLで検索できます。Prometheusのremote writeでデータを受け取れます。
- **いろいろな送り方に対応**：InfluxDB、Graphite、OpenTSDB、OpenTelemetry、DataDogのエージェントなど、多くの形式でデータを受け取れると書かれています。
- **1つの実行ファイル**：外部への依存がなく、設定はコマンドの引数で行います。初期値も調整済みと説明されています。
- **画面（vmui）**：組み込みの画面で、データの検索や、使われている指標の確認ができます。
- **2つの構成**：1台で動かすシングルノード版と、規模を広げられるクラスター版があり、どちらもオープンソースです。

Dockerでの導入方法を確認できています。

### Datadogとの違い

Datadogは、監視のための外部のサービスです。VictoriaMetricsは、**メトリクスの保存と検索に絞った部品**で、データを自分のサーバーに置けます。グラフの画面は[Grafana](/tools/grafana/)、データの収集は[Prometheus](/tools/prometheus/)や付属のvmagentを組み合わせて、監視の仕組みを作るのが一般的です。

### 始め方の目安

公式のクイックスタートでは、実行ファイルをダウンロードして1つのコマンドで起動するだけで試せると書かれています。Dockerでは、公式のイメージ（`victoriametrics/victoria-metrics`）を、ポート8428で起動します。起動したら、ブラウザで `http://サーバーのアドレス:8428/vmui` を開くと画面が表示されます。データは `-storageDataPath` で指定したフォルダ（初期値は `victoria-metrics-data`）に置かれます。

### 注意点

- **保存期間の初期値は1か月（31日）**です。それより長く残すには、`-retentionPeriod`（例：`-retentionPeriod=90d`）を設定します。
- ディスクの空きが設定した値より少なくなると、**読み取り専用になり、新しいデータを受け付けなくなる**と書かれています。必要な容量を見積もり、ディスクの使用量を監視してください。
- 異常の検知、バックアップの自動化、データごとの保存期間などは、Enterprise版の機能です（公式は無料の試用ライセンスも案内しています）。
- ライセンスはApache-2.0です（シングルノード版とクラスター版）。

[Datadogの代替](/alternatives/datadog/)のページで、ほかの候補も比べられます。
