---
updated: "2026-10-01"
---

サーバーやアプリの監視のツールは、役割ごとに組み合わせて使うのが一般的です。1つのツールですべてをまかなうDatadogのようなサービスとは、ここが大きく違います。

- **死活監視（動いているかの確認）**：まず始めるなら[Uptime Kuma](/tools/uptime-kuma/)が手軽です。止まったときに通知が届きます。
- **数値の監視**：CPUやメモリ、応答時間などの数値を集めるなら[Prometheus](/tools/prometheus/)や[VictoriaMetrics](/tools/victoria-metrics/)、サーバー1台をすぐに詳しく見たいなら[Netdata](/tools/netdata/)があります。
- **見える化**：集めたデータをダッシュボードにするなら[Grafana](/tools/grafana/)が定番です。
- **エラーの追跡**：アプリで起きたエラーを集めて分析するなら[Sentry](/tools/sentry/)です。
- **まとめて扱う**：数値・ログ・処理の流れ（トレース）をまとめて扱うなら、[SigNoz](/tools/signoz/)や[OpenObserve](/tools/openobserve/)が候補です。

### 選ぶときのポイント

- **監視の仕組みを、監視対象と同じ場所に置かない**：監視しているサーバーが止まると、通知も止まってしまいます。
- **ライセンス**：SentryはFSL 1.1で、一般的なオープンソースライセンスではありません。

[Datadogの代替](/alternatives/datadog/)や[Sentryの代替](/alternatives/sentry/)のページも参考にしてください。
