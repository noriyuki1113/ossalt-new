---
description: "PlankaとWekanの違いを比べます。どちらもTrelloの代わりに自分のサーバーで動かせるカンバンです。ライセンスが大きく違い、PlankaはPLANKA Community License、WekanはMITです。"
updated: "2026-11-09"
---

**結論：Trelloに近い操作感と、日本語の画面を重視するならPlanka、ライセンスの条件を気にせず、自由に使いたいならWekanです。**

- **Plankaを選ぶ場合**：Trelloに近い操作感のカンバンで、複数人の操作がリアルタイムに反映されます。画面の日本語翻訳とDockerでの導入方法を確認できています。
- **Wekanを選ぶ場合**：MITライセンスのカンバンです。公式のREADMEでは、既定ではFerretDB（SQLite）で動き、別のデータベースサーバーがなくても使えます。Dockerでの導入方法を確認できています。画面の日本語翻訳は、当サイトのデータでは確認できていません。

**ライセンスが違います**：PlankaのライセンスはPLANKA Community Licenseで、一般的なオープンソースのライセンスではありません。公式のREADMEでは「fair-code」と説明され、`.pe.` の付くファイルなどの「Pro／Enterprise」の部分は、別の商用ライセンスが必要です。自分や自社で使うのと、サービスとして提供するのとでは扱いが違うので、公式のライセンスの案内で確認してください。WekanはMITで、条件が少なく、単純です。

**選ぶときのコツ**：当サイトの掲載データでは、Wekanは公開された脆弱性の情報が89件、Plankaは4件です。どちらも、更新をこまめに適用してください。手間をかけたくないなら、Trelloのままのほうが楽です。

詳しくは[Plankaとは](/tools/planka/)、[Wekanとは](/tools/wekan/)、[Trelloの代替](/alternatives/trello/)のページを参照してください。
