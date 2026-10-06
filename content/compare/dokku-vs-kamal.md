---
description: "DokkuとKamalの違いを比べます。どちらもHerokuの代わりに、自分のサーバーへアプリを公開できるオープンソースですが、Dokkuはサーバーに入れてgit pushで受け取る小さなPaaS、Kamalは手元からSSHでサーバーへコンテナを配る道具です。"
updated: "2026-10-06"
---

**結論：Herokuと同じように、git pushでアプリを公開し、データベースもプラグインで用意したいならDokku、手元のパソコンやCIから、1台または複数のサーバーへ、Dockerのコンテナを止めずに入れ替えたいならKamalです。**

- **Dokkuを選ぶ場合**：サーバーにDokkuを入れておき、git pushでアプリを受け取って公開します。Herokuのbuildpackも使え、PostgreSQLなどのデータベースや、HTTPSの設定をプラグインで追加できます。
- **Kamalを選ぶ場合**：Ruby on Railsの開発元が作った道具で、サーバーに常駐する管理の仕組みを置かず、手元からSSHでつないで、コンテナを配り、入れ替えます。止めずに新しい版へ切り替えたり、複数のサーバーへ同時に配ったりできます。設定は1つのYAMLのファイルにまとめます。

**選ぶときのコツ**：Herokuの使い方に近いのはDokkuです。すでにDockerのイメージを作っていて、自分たちの手順で配りたいならKamalが合います。画面で操作したい場合は、[Coolify](/tools/coolify/)や[Dokploy](/tools/dokploy/)も候補です（「[CapRoverとDokkuの違い](/compare/caprover-vs-dokku/)」）。

**ライセンス**：どちらもMITです。

詳しくは[Dokkuとは](/tools/dokku/)、[Herokuの代替](/alternatives/heroku/)のページを参照してください。
