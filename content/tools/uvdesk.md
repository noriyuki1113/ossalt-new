---
description: "UVdeskとは、問い合わせのメールをチケットにして管理できる、オープンソースのヘルプデスクです。よくある質問を載せるナレッジベースも備えます。できること、Zendeskとの違い、必要な環境と注意点を解説します。"
updated: "2026-11-14"
at_a_glance:
  what: "お客さまからの問い合わせメールをチケットにして、担当者で分担・対応するためのヘルプデスクです。よくある質問を載せるナレッジベースと、お客さま向けのサポートページも作れます。"
  good_for:
    - "担当者やチケットの数に制限のないヘルプデスクを、自社で動かしたい人"
    - "PHP（Symfony）のアプリを、自分で動かして手を入れられる人"
  not_for:
    - "チャットや電話の窓口まで、1つのサービスでまとめたい人"
    - "サーバーの管理をしたくない人"
  check:
    - "PHP 8.1と、IMAP・Mailparseの拡張を用意できるか"
    - "ライセンスはOSL-3.0です"
verification:
  status: official
  checked_at: "2026-11-14"
  sources:
    - https://github.com/uvdesk/community-skeleton/blob/HEAD/README.md
    - https://github.com/uvdesk/community-skeleton/blob/HEAD/LICENSE.txt
  note: "README、LICENSEと、この解説の機能・必要な環境・導入の方法・ライセンスの記述を照合した。実機では動かしていない"
---

UVdesk（ユーブイデスク）は、問い合わせの対応を管理するための**ヘルプデスク**です。公式のREADMEでは、PHPのフレームワーク「Symfony」で作られ、自分で手を入れやすい作りのヘルプデスクと説明されています。開発はUVdeskのチームが進め、Webkul社が支えています。

### できること

- **メールをチケットにする**：届いた問い合わせのメールを、チケットに変えて管理できます。メールボックスの連携の数に上限はないと書かれています。
- **担当の分担**：担当者・グループ・チームの数に制限はなく、担当者ごとの権限や、担当者だけが見られるメモを使えます。
- **返信の効率化**：よく使う返信の保存、定型の処理を自動で行うワークフロー、メールのテンプレートがあります。
- **ナレッジベース**：記事・カテゴリ・フォルダでよくある質問を整理し、お客さま向けのサポートページに載せられます。
- **多言語**：翻訳の仕組みがあり、複数の言語で使えると書かれています。

### Zendeskとの違い

Zendeskは、外部のサービスとして使うヘルプデスクです。UVdeskは、**自分のサーバーで動かし、担当者の数に制限がない**のが違いです。一方で、サーバーやメールの連携の管理は自分で行います。ほかのOSSと比べるなら、[Zammadとの比較](/compare/uvdesk-vs-zammad/)や[osTicketとの比較](/compare/osticket-vs-uvdesk/)も参考になります。

### 必要な環境と始め方

READMEでは、次の環境が挙げられています。

- PHP 8.1、ApacheかNGINX、MySQL 5.7.23以上、Composer 2以上
- PHPの拡張のIMAPとMailparse（メールを読み込むため）
- メモリ4GB以上

導入は、Composerで `composer create-project uvdesk/community-skeleton helpdesk-project` とするか、公式のzipを取得して展開します。そのあと、ターミナルのコマンド（`php bin/console uvdesk:configure-helpdesk`）か、ブラウザで開く**初期設定の画面（Webインストーラー）**で設定します。Dockerで動かす方法も、READMEから案内されています。

### 注意点

- 追加の機能（モジュール）は、Webkulのストアで案内されています。費用や対応する版は、公式の案内で確認してください。
- 画面の日本語翻訳があるかは、まだ確認できていません。
- ライセンスはOSL-3.0です。GPLやMITとは条件が違うライセンスなので、改変したものを配る場合などは、条件を確認してください。

[Zendeskの代替](/alternatives/zendesk/)のページで、ほかの候補も比べられます。
