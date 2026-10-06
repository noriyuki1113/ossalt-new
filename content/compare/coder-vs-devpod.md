---
description: "code-serverとDevPodの違いを比べます。どちらもGitHub Codespacesの代わりの候補になる開発環境のオープンソースですが、code-serverはサーバーで動くVS Codeをブラウザから使う道具、DevPodは好きな場所に開発用のコンテナを作る道具です。"
updated: "2026-10-06"
---

**結論：自分のサーバーでVS Codeを動かして、どの端末からでもブラウザで同じ開発環境を使いたいならcode-server、手元のパソコンやクラウドなど、好きな場所に、設定ファイル（devcontainer）どおりの開発環境を作りたいならDevPodです。**

- **code-serverを選ぶ場合**：サーバーでVS Codeを動かし、ブラウザからアクセスして使います。タブレットや性能の低いパソコンからでも、サーバーの性能で開発できます。画面の日本語翻訳とDockerでの導入方法を確認できています。
- **DevPodを選ぶ場合**：GitHub Codespacesと同じdevcontainerの設定を使って、手元のDocker、クラウドの仮想マシン、Kubernetesなど、好きな場所に開発環境を作ります。エディタは手元のVS CodeなどからSSHでつなぎます。

**DevPodの注意**：当サイトのデータでは、DevPodの最後の更新から300日以上たっています。新しく使う場合は、開発の状況を確認してください。

**ライセンス**：code-serverはMIT、DevPodはMPL-2.0です。

詳しくは[code-serverとは](/tools/coder/)、[GitHub Codespacesの代替](/alternatives/github-codespaces/)のページを参照してください。
