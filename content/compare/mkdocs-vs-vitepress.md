---
description: "MkDocsとVitePressの違いを比べます。どちらもMarkdownから文書のサイトを作るツールで、GitBookの代わりに使えます。MkDocsはPython製、VitePressはVue製で、更新の状況が違います。"
updated: "2026-10-24"
---

**結論：Pythonの環境で、設定ファイルとMarkdownだけで軽く作りたいならMkDocs、Vue／Viteの環境で、検索を内蔵した文書サイトを作りたいならVitePressです。**

- **MkDocsを選ぶ場合**：設定ファイルとMarkdownから文書のサイトを作ります。動作が軽く、画面の日本語翻訳も確認できています。Pythonの環境に慣れたチームに向きます。
- **VitePressを選ぶ場合**：Markdownから高速な文書サイトを作り、検索を内蔵します。日本語の公式ドキュメントがあります。Vueの部品をページの中で使えるので、JavaScriptの環境に慣れたチームに向きます。

**更新の状況に注意してください**：当サイトの掲載データでは、MkDocsの最後の更新は368日前で、直近の1年のリリースはありません。VitePressは4日前で、直近の1年のリリースは8回です。長く使い続ける文書のサイトなら、更新の状況は選ぶ理由になります。MkDocsを使う場合は、公式のリポジトリで最新の状況を確認してください。

**共通の点**：どちらも、文書を静的なファイルとして書き出します。ログインや、画面から編集する機能はありません。画面で編集したいなら、GitBookのままのほうが楽な場合があります。

**ライセンス**：MkDocsはBSD-2-Clause、VitePressはMITです。

ほかの候補との違いは「[DocusaurusとMkDocsの違い](/compare/docusaurus-vs-mkdocs/)」「[DocusaurusとVitePressの違い](/compare/docusaurus-vs-vitepress/)」も参照してください。詳しくは[MkDocsとは](/tools/mkdocs/)、[VitePressとは](/tools/vitepress/)、[GitBookの代替](/alternatives/gitbook/)のページを参照してください。
