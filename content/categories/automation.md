---
updated: "2026-10-01"
---

業務の自動化のツールは、誰が何を自動化するかで選び方が変わります。

- **サービスどうしをつなぐ自動化**：「フォームの回答を表に記録してチャットに通知する」のような自動化なら、[n8n](/tools/n8n/)、[Activepieces](/tools/activepieces/)、[Node-RED](/tools/node-red/)、[Huginn](/tools/huginn/)が候補です。Zapierの代わりになります。
- **データ処理の実行基盤**：定期的なデータの集計や、多くの処理を順番に実行する仕組みなら、[Apache Airflow](/tools/airflow/)、[Prefect](/tools/prefect/)、[Dagster](/tools/dagster/)、[Kestra](/tools/kestra/)が候補です。主にエンジニアが使います。
- **社内向けのスクリプトと画面**：[Windmill](/tools/windmill/)は、スクリプトから社内向けの画面や自動化を作れます。

### 選ぶときのポイント

- **作る人と直す人**：自動化は、止まったときに直せる人が必要です。作った人しか分からない状態は避けましょう。
- **ライセンス**：n8nはSustainable Use Licenseで、一般的なオープンソースライセンスではありません。社内で使うことはできますが、他社向けに提供する使い方には制限があります。

[Zapierの代替](/alternatives/zapier/)のページでは、Zapierのままのほうがよい場合も整理しています。
