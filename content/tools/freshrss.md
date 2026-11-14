---
description: "FreshRSSとは、ニュースやブログの更新（RSS）を、自分のサーバーでまとめて読めるRSSリーダーです。スマホのアプリとも既読の状態を同期できます。できること、Feedlyとの違い、必要な環境と注意点を解説します。"
updated: "2026-11-14"
at_a_glance:
  what: "ブログやニュースサイトの更新（RSS・Atom）を集めて読む、Webのアプリです。複数の利用者で使え、スマホのアプリからも読めます。"
  good_for:
    - "読んでいるサイトの一覧や既読の状態を、自分のサーバーに置きたい人"
    - "小さなサーバー（Raspberry Piなど）で、軽く動かしたい人"
  not_for:
    - "サーバーの管理をしたくない人"
  check:
    - "スマホのアプリで読む場合は、API用のパスワードの設定が必要です"
    - "ライセンスはAGPL-3.0です"
verification:
  status: official
  checked_at: "2026-11-14"
  sources:
    - https://github.com/FreshRSS/FreshRSS/blob/HEAD/README.md
    - https://github.com/FreshRSS/FreshRSS/blob/HEAD/LICENSE.txt
    - https://freshrss.github.io/FreshRSS/en/admins/01_Index.html
    - https://freshrss.github.io/FreshRSS/en/users/06_Mobile_access.html
  note: "README、LICENSE、公式ドキュメント（管理者向けの目次・スマホでの利用）と、この解説の機能・必要な環境・導入の方法・ライセンスの記述を照合した。実機では動かしていない"
---

FreshRSS（フレッシュアールエスエス）は、ブログやニュースサイトの更新（RSS・Atom）を集めて読むための、**自分のサーバーで動かすRSSリーダー**です。公式のREADMEでは、軽くて使いやすく、多くの言語に翻訳されていると説明されています。

### できること

- **複数の利用者**：1つのサーバーを、複数の人で使えます。ログインせずに読める公開の設定もあります。
- **スマホのアプリで読む**：Google Reader互換のAPIと、Fever互換のAPIに対応していて、Android・iPhone・パソコンのアプリから読めます。公式は、Google Reader互換のAPIのほうが機能が多いと案内しています。
- **すぐに届く更新**：WebSubに対応したサイト（WordPressなど）からは、更新をすぐに受け取れます。
- **RSSがないサイト**：XPathを使った簡単な読み取り（スクレイピング）で、RSSがないサイトも追いかけられます。
- **整理と共有**：タグを付けたり、選んだ記事をHTML・RSS・OPMLで共有したりできます。拡張機能も使えます。
- 画面の日本語翻訳と、Dockerでの導入方法を確認できています。

### Feedlyとの違い

Feedlyは、外部のサービスとして使うRSSリーダーです。FreshRSSは、**読んでいるサイトの一覧や既読の状態を、自分のサーバーに置ける**のが違いです。一方で、サーバーの用意と更新は自分で行います。ほかのOSSと比べるなら、[Minifluxとの比較](/compare/freshrss-vs-miniflux/)も参考になります。

### 必要な環境と始め方

READMEでは、次の環境が挙げられています。公式は、Raspberry Pi 1でも動いたと書いています。

- Webサーバー（Apache 2.4以上を推奨。nginx、lighttpdも可）
- PHP 8.2以上と、いくつかの拡張
- データベースは、PostgreSQL 10以上、SQLite、MariaDB 10.6以上、MySQL 8.0以上のどれか

手で入れる場合は、ファイルをサーバーに置き、**Webに公開するのは `./p/` のフォルダだけ**にして、ブラウザで開いて案内に沿って設定します。Dockerなどの自動の導入方法も案内されています。

### 注意点

- `./data/` のフォルダには、個人のデータがすべて入っています。Webから見えないようにしてください。
- 更新の仕方は2種類あります。新しい機能と修正がすぐ入る `edge` と、更新が少ない `latest` です。公式は、`latest` は**修正が古い版にさかのぼって入らないため、安全面では不利**と書いています。
- ライセンスはAGPL-3.0です。

[Feedlyの代替](/alternatives/feedly/)のページで、ほかの候補も比べられます。
