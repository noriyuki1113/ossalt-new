---
description: "PhoenixとLangfuseの違いを比べます。どちらもLangSmithの代わりに、AIアプリの動きを記録して評価できます。ライセンスが違い、PhoenixはElastic License 2.0、LangfuseはMIT（eeフォルダを除く）です。"
updated: "2026-11-09"
---

**結論：ライセンスの条件を気にせず、記録と評価を自分のサーバーで動かしたいならLangfuse、評価と実験を中心に、Pythonの環境で手軽に始めたいならPhoenixです。ただしPhoenixのライセンスには条件があります。**

- **Phoenixを選ぶ場合**：AIアプリの観測と評価のツールです。LLMの呼び出しの流れを記録し、回答の評価や、RAGの検索の結果の確認に使えます。Dockerやコンテナ（Helm）で動かせます。
- **Langfuseを選ぶ場合**：LLMアプリの記録と評価のツールです。AIの呼び出しの流れ、かかった時間と費用を記録し、回答の質を評価して改善に役立てられます。Dockerでの導入方法を確認できています。

**ライセンスが違います**：PhoenixはElastic License 2.0（ELv2）で、一般的なオープンソースのライセンスではありません。ELv2には、サービスとして第三者に提供することなどに制限があります。社内で使うのと、サービスとして提供するのとで扱いが違うので、公式のLICENSEで確認してください。LangfuseはMITですが、公式のREADMEでは、`ee` フォルダは別の扱いです。

**共通の点**：どちらも、Dockerでの導入方法を確認できています。画面の日本語翻訳は、データでは確認できていません。AIの入力や出力には、個人情報や機密が含まれることがあります。記録の保存先と、アクセスの権限に気をつけてください。手間をかけたくないなら、LangSmithのままのほうが楽です。

詳しくは[Phoenixとは](/tools/arize-phoenix/)、[Langfuseとは](/tools/langfuse/)、[LangSmithの代替](/alternatives/langsmith/)のページを参照してください。
