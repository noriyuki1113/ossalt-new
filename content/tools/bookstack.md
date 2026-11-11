---
description: "BookStackとは、「本・章・ページ」の階層でマニュアルや手順書を整理できる、オープンソースの社内Wikiです。できること、向いている使い方、Wiki.jsとの違い、導入の目安を解説します。"
updated: "2026-11-11"
verification:
  status: official
  checked_at: "2026-11-11"
  sources:
    - https://github.com/BookStackApp/BookStack
    - https://github.com/BookStackApp/BookStack/blob/development/LICENSE
    - https://github.com/BookStackApp/BookStack/blob/development/lang/ja/common.php
    - https://www.bookstackapp.com/docs/user/content-overview/
    - https://www.bookstackapp.com/docs/user/wysiwyg-editor
    - https://www.bookstackapp.com/docs/user/markdown-editor
    - https://www.bookstackapp.com/docs/user/roles-and-permissions
    - https://www.bookstackapp.com/docs/user/searching/
    - https://www.bookstackapp.com/docs/admin/installation/
  note: "BookStackのREADME・LICENSE・日本語の翻訳ファイル・公式ドキュメント（内容の構成、編集画面、権限、検索、インストール）と、この解説の記述を照合した。構成（棚・本・章・ページ）、WYSIWYGとMarkdownの編集画面、役割ごとの権限、検索、変更履歴の確認・復元（公式のデモの履歴画面の文言）、PHPとMySQL/MariaDB、MITライセンスは公式の資料と一致した。Dockerは公式のインストールの手引きでコミュニティ提供の構成として案内されている。「ログインの連携を細かく設定したい場合はWiki.js」は、BookStackの公式がOpenID Connect・SAML 2.0・LDAPに対応しているため削除した。Wiki.jsとの使い分けは編集上の判断で、公式の記述ではない。実機では動かしていない"
---

BookStack（ブックスタック）は、社内の手順書やマニュアルを作るためのWikiのツールです。情報を「棚・本・章・ページ」という、本のような階層で整理するのが特徴で、どこに何を書けばよいかが分かりやすくなっています。画面の日本語翻訳もあります。

### できること

- **本のような階層での整理**：本の中に章、章の中にページ、という形で情報をまとめます。
- **書きやすい編集画面**：見たままの形で書く編集画面のほか、Markdownでも書けます。
- **権限の管理**：役割ごとに、見られる本や編集できるページを設定できます。
- **検索と変更の履歴**：ページの中身を検索でき、変更の履歴から前の版に戻せます。

### 向いている使い方

- 業務のマニュアルや手順書を、部署ごとに整理して置いておきたい。
- エンジニアでないメンバーにも、迷わず書いてもらいたい。

ページの構成を自由に作りたい場合は、[Wiki.js](/tools/wikijs/)も比べてみてください。

### 始め方の目安

PHPで作られていて、データベース（MySQLまたはMariaDB）と組み合わせて動かします。Dockerで動かす方法もあります。

### 注意点

- ライセンスはMITです。

ほかの社内Wikiとの比較は、[Confluenceの代替](/alternatives/confluence/)のページを参考にしてください。
