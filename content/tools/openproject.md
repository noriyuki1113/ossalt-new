---
description: "OpenProjectとは、ガントチャート、課題管理、アジャイルのボードを1つにまとめた、自社で動かせるプロジェクト管理ツールです。できること、Jiraとの違い、必要なサーバーの性能と注意点を解説します。"
updated: "2026-11-14"
at_a_glance:
  what: "計画（ガントチャート）、課題やバグの管理、カンバンやスクラムのボード、工数と費用の記録、Wiki、会議の議事録までを1つで扱う、Webのプロジェクト管理ツールです。"
  good_for:
    - "ガントチャートで計画と進み具合を管理したい人"
    - "プロジェクトのデータを、自社のサーバーに置きたい人"
  not_for:
    - "数人のチームで、軽いタスク管理だけをしたい人（機能が多く、サーバーにもそれなりの性能が要ります）"
    - "サーバーの管理をしたくない人（公式のクラウド版は有料です。14日間の無料の試用があります）"
  check:
    - "使いたい機能が、無料のCommunity版に含まれるか（一部は有料のEnterprise版の機能です）"
    - "ライセンスはGPL-3.0です"
verification:
  status: official
  checked_at: "2026-11-14"
  sources:
    - https://github.com/opf/openproject/blob/HEAD/README.md
    - https://github.com/opf/openproject/blob/HEAD/LICENSE
    - https://www.openproject.org/docs/installation-and-operations/installation/docker/
    - https://www.openproject.org/docs/installation-and-operations/system-requirements/
    - https://www.openproject.org/enterprise-edition/
  note: "README、LICENSE、公式ドキュメント（Dockerでの導入・必要な環境）、Enterprise版の案内と、この解説の機能・導入手順・必要な性能・ライセンスの記述を照合した。実機では動かしていない"
---

OpenProject（オープンプロジェクト）は、**プロジェクトの計画から課題の管理までを1つで行える**、Webのプロジェクト管理ツールです。公式のREADMEでは、Jira、MS Project、Monday、Asanaなどの代わりに、データを自分で管理しながら使えるツールとして紹介されています。

### できること

- **ガントチャート**：作業の予定と、作業どうしの関係を、ガントチャートで計画できます。
- **アジャイルのボード**：カンバン、スクラムのボードで作業を管理できます。
- **課題とバグの管理**：作業（ワークパッケージ）として、タスクやバグを登録・分担できます。
- **工数と費用**：作業時間の記録、費用の集計、予算の管理ができます。
- **情報の共有**：Wiki、フォーラム、ニュース、会議のアジェンダと議事録があります。
- **連携**：Nextcloud、GitHub、GitLabなどと連携できます。
- 画面の日本語翻訳と、Dockerでの導入方法を確認できています。

### Jiraとの違い

Jiraは、外部のサービスとして使う課題管理のツールです。OpenProjectは、**自社のサーバーで動かせて、ガントチャートでの計画が標準で使える**のが違いです。開発チームの課題管理が中心ならJiraに近い使い方もできますが、計画の管理を重く見る組織に向いています。ほかのOSSとの違いは、[Taigaとの比較](/compare/openproject-vs-taiga/)も参考にしてください。

### 始め方の目安

公式の案内では、Dockerでの導入が推奨されています。お試しなら、データベースなども入った「all-in-one」のコンテナを1つ起動し、ブラウザで `http://localhost:8080` を開きます。初期の管理者は、ログイン名・パスワードとも `admin` です（すぐに変更してください）。起動には、秘密の値 `SECRET_KEY_BASE` が必要で、**毎回同じ値を使わないと、ログインの情報や暗号化したデータが読めなくなる**と書かれています。本番で使う場合は、データを残すフォルダを指定し、HTTPSで公開するよう案内されています。

必要な性能の目安は、利用者200人までの1台のサーバーで、4コアのCPU、メモリ4GB、空きディスク20GBです。

### 注意点

- 機能の一部は、有料のEnterprise版の追加機能です。使いたい機能がCommunity版に含まれるかを、公式の料金のページで確認してください。
- Dockerのコンテナでは、Gitなどのリポジトリを、OpenProjectから作って管理する機能は使えないと書かれています。
- ライセンスはGPL-3.0です。

[Jiraの代替](/alternatives/jira/)のページで、ほかの候補も比べられます。
