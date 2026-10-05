---
description: "Dokkuとは、Herokuのように、git pushでアプリを公開できる仕組みを、自分のサーバーに作れるオープンソースの小さなPaaSです。できること、CapRover・Coolifyとの違い、使うときの注意点を解説します。"
updated: "2026-10-06"
---

Dokku（ドック）は、**Herokuと同じように、git pushでアプリを公開できる**仕組みを、自分のサーバーに作るソフトです。Dockerを使い、1台の小さなVPSでも軽く動きます。

### できること

- **git pushでデプロイ**：Gitのリポジトリをサーバーに送るだけで、アプリが作られて公開されます。
- **Herokuと同じ作り方**：Herokuのbuildpackや、Dockerfileを使ってアプリを作れます。Herokuから移るときの手間が少ない作りです。
- **プラグイン**：PostgreSQL、MySQL、Redisなどのデータベースや、Let's EncryptでのHTTPSの設定を、プラグインで追加できます。
- **ドメインと環境変数**：アプリごとのドメインや環境変数を、コマンドで設定できます。

### CapRover・Coolifyとの違い

[CapRover](/tools/caprover/)や[Coolify](/tools/coolify/)、[Dokploy](/tools/dokploy/)は、**Webの管理画面から操作する**作りです。Dokkuは、**コマンドで操作する**作りで、画面は付属していません。Herokuのコマンドの操作に慣れている人や、シンプルな構成を好む人に向いています（「[CapRoverとDokkuの違い](/compare/caprover-vs-dokku/)」）。

### 注意点

- 基本は1台のサーバーで動かす前提です。複数のサーバーへの自動のスケールはありません。
- サーバー自体のアップデート、バックアップ（特にデータベース）、監視は、自分たちで行う必要があります。
- 画面で管理したい場合は、ほかのツールを選ぶか、別の管理画面を組み合わせます。
- ライセンスはMITです。

[Herokuの代替](/alternatives/heroku/)のページで、ほかの候補も比べられます。
