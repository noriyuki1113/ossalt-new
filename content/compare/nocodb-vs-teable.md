---
description: "NocoDBとTeableの違いを比べます。どちらもAirtableの代わりに、表計算のような画面でデータを管理できるオープンソースですが、ライセンスに大きな違いがあります。NocoDBは独自のライセンス、TeableはAGPL-3.0です。"
updated: "2026-10-06"
---

**結論：既存のデータベースを、表の画面ですぐに扱いたい、利用の例や情報の多さを重視するならNocoDB、一般的なオープンソースのライセンスで、PostgreSQLの上に大量の行を扱える表の画面を持ちたいならTeableです。**

- **NocoDBを選ぶ場合**：MySQLやPostgreSQLなどのデータベースを、表、カンバン、ギャラリー、フォームなどの画面で扱えます。APIも自動で作られます。GitHubのスターも多く、情報が見つけやすいツールです。
- **Teableを選ぶ場合**：PostgreSQLの上に作られた、表計算のような画面のデータベースです。行の多い表でも、動作の速さを保つことに力を入れています。SQLで直接データを扱えるのも特徴です。

**ライセンスの違い**：NocoDBはSustainable Use Licenseで、**一般的なオープンソースライセンスではありません**。社内で使うことは認められていますが、他社向けのサービスとして提供することなどに制限があります。TeableはAGPL-3.0です。

**共通の点**：どちらも、画面の日本語翻訳とDockerでの導入方法を確認できています。

詳しくは[NocoDBとは](/tools/nocodb/)、[NocoBaseとNocoDBの違い](/compare/nocobase-vs-nocodb/)、[Airtableの代替](/alternatives/airtable/)のページを参照してください。
