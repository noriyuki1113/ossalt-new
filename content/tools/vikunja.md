---
description: "Vikunjaとは、ToDoやチームのタスクを、リスト・カンバン・ガントチャートなどで管理できる、Asanaの代わりになるオープンソースのタスク管理ツールです。できること、向いている使い方、導入の目安を解説します。"
updated: "2026-11-10"
at_a_glance:
  what: "個人のToDoからチームのタスクまでを、リスト・カンバン・ガントチャート・表で管理するツールです。Asanaの代わりとして使われています。"
  good_for:
    - "個人や小さなチームで、タスクを自分たちのサーバーで管理したい人"
    - "1つのツールで、カンバンとガントチャートの両方を使いたい人"
  not_for:
    - "ソフトウェア開発の課題管理が中心の人（Planeのほうが向いています）"
    - "Trelloのようなカンバンだけでよい人（PLANKAやWeKanも候補です）"
  check:
    - "自分で動かす版は無料です。開発元は、有料のホスティング版（Vikunja Cloud）も案内しています"
    - "使うデータベース（MySQL・MariaDB・PostgreSQL・SQLite に対応）と、バックアップの方法"
    - "ライセンスはAGPL-3.0-or-laterです（desktop/ のフォルダだけGPL-3.0-or-later）"
verification:
  status: official
  checked_at: "2026-11-10"
  sources:
    - https://github.com/go-vikunja/vikunja/blob/HEAD/README.md
    - https://github.com/go-vikunja/vikunja/blob/HEAD/LICENSE
    - https://vikunja.io/docs/installing/
    - https://vikunja.io/docs/caldav/
    - https://vikunja.io/
    - https://vikunja.io/features/
    - https://vikunja.io/pricing
    - https://vikunja.io/pro
    - https://github.com/go-vikunja/vikunja/tree/HEAD/frontend/src/i18n/lang
  note: "README・LICENSE・公式ドキュメント（インストール・CalDAV）・公式サイト（機能・料金・Pro）・翻訳ファイルの一覧と、この解説を照合した（実機では動かしていない）"
---

Vikunja（ヴィクンヤ）は、個人のToDoから、チームのタスクまでを管理できるツールです。同じタスクを、リスト、カンバン、ガントチャート、表など、いくつかの見せ方で扱えます。Asanaの代わりとして使われていて、画面の日本語翻訳もあります。

### できること

- **さまざまな見せ方**：リスト、カンバン、ガントチャート、表を切り替えて、タスクを管理できます。
- **期限・担当・ラベル**：期限、繰り返し、担当者、ラベル、優先度などを設定できます。
- **共有**：プロジェクトをチームや外部の人と共有できます。
- **カレンダーとの連携**：CalDAVという仕組みで、カレンダーのアプリからタスクを扱えます。

### 向いている使い方

- 個人や小さなチームで、タスクを自分たちのサーバーで管理したい。
- 1つのツールで、カンバンとガントチャートの両方を使いたい。

ソフトウェア開発の課題管理なら[Plane](/tools/plane/)、Trelloのようなカンバンだけでよいなら[PLANKA](/tools/planka/)や[WeKan](/tools/wekan/)も候補です。

### 始め方の目安

公式のドキュメントには、インストールの方法として、実行ファイル（zip）、Docker、Debian・RPM・Arch Linux・Alpine などのパッケージ、ソースからの構築、Kubernetes などが案内されています。対応するデータベースは、MySQL・MariaDB・PostgreSQL・SQLite です。公式の実行ファイルとDockerイメージには、SQLiteが含まれています。

- 初期設定ではCORSが有効なため、**Vikunjaに接続する公開URL（`VIKUNJA_SERVICE_PUBLICURL` など）を設定するか、CORSを無効にする必要があります**。公式のドキュメントが、実行ファイル・Docker・各パッケージの導入方法のそれぞれで、この点を注意しています。
- Dockerで使うときは、ファイル（添付など）の保存先をホスト側に置き、コンテナを作り直しても消えないようにするよう、公式が案内しています。PostgreSQL・MySQL・リバースプロキシを組み合わせたDockerの例もあります。
- アップデートの前には、変更履歴（changelog）を読み、手作業が必要な手順がないか確かめるよう、公式が注意しています。

### 他のサービスからの移行

開発元のサイトによると、Todoist・Trello・Microsoft To-Doなどからの取り込みが、Vikunjaの画面から行えます。取り込める範囲は、公式の説明で確かめてください。

### 費用とライセンス

- 自分のサーバーで動かす版は、無料で使えます（開発元のサイトの説明）。SSO（OpenID Connect）やLDAPも、無料版に含まれると案内されています。
- 開発元は、運用を任せられる有料のホスティング版（Vikunja Cloud）を案内しています。
- 自分で動かす向けには、有料の「Vikunja Pro」があります。開発元のサイトによると、監査ログ・管理パネル・時間の記録などを足すもので、無料版の機能を取り去るものではなく、ライセンスも同じAGPLv3です。**限定ベータ（private beta）の表示があります**（2026-11-10確認）。
- READMEによると、リポジトリの大部分は **AGPL-3.0-or-later** です。`desktop/` のフォルダだけは、GPL-3.0-or-laterです。AGPLでは、改変したものを、ネットワーク越しに他の人へ提供する場合、そのソースを公開する必要があります。

### 注意点

- 日本語の画面の翻訳があります。ただし、翻訳の範囲は、公式の資料では確認していません。
- 有料のプランの内容と料金は、変わることがあります。導入の前に、公式の最新の案内を見てください。

### 出典と確認の範囲

- 確認した資料：公式リポジトリのREADME・LICENSE、公式ドキュメント（インストール）、公式サイト、料金のページ、Vikunja Pro のページ、翻訳ファイルの一覧（2026-11-10）。
- 確認していないこと：実際の導入、性能・使い勝手、他のツールとの機能の細かい比較、有料プランの内容と料金。
