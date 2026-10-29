---
description: "Krayin CRMとは、LaravelとVue.jsで作られた、顧客管理（CRM）のオープンソースです。できること、必要な環境、導入の流れ、向く人と注意点を、公式READMEをもとに整理します。"
updated: "2026-10-29"
at_a_glance:
  what: "PHPのフレームワーク（Laravel）とVue.jsで作られた、顧客管理（CRM）のオープンソースです。顧客のライフサイクル全体を管理する、と説明されています。"
  good_for:
    - "PHP（Laravel）の環境があり、CRMを自分のサーバーで運用したい人"
    - "項目を自分たちで追加（カスタム属性）して使いたい人"
  not_for:
    - "PHP・Composer・データベースの運用ができない人"
    - "HubSpotのような、マーケティングの自動化まで含めた機能を求める人（READMEの機能の説明は管理画面・ダッシュボード・カスタム属性などです）"
  check:
    - "必要な環境（READMEの要件：PHP 8.3以上、RAM 3GB以上、MySQL 8.0.32以上またはMariaDB 11.4以上など）"
    - "本番では開発用の依存を外す（composer install --no-dev）"
    - "ライセンスはMITです"
verification:
  status: official
  checked_at: "2026-10-29"
  sources:
    - https://github.com/krayin/laravel-crm/blob/HEAD/README.md
    - https://github.com/krayin/laravel-crm/blob/HEAD/LICENSE
  note: "READMEとLICENSEの内容と、この解説を照合した（実機では動かしていない）"
---

Krayin CRM（クライン）は、READMEによると、Laravel（PHPのフレームワーク）とVue.jsで作られた、CRMのフレームワークです。「中小企業から大企業まで、顧客のライフサイクル全体を管理するための、無料のオープンソースのLaravel製CRM」と説明されています。

### 機能（READMEの記載）

- 分かりやすい管理画面とダッシュボード。
- カスタム属性（項目の追加）。
- モジュール式の作り。
- SendGrid経由のメールの取り込み。

詳しい機能は、公式サイト（krayincrm.com/features/）に案内されています。公式のデモ（demo.krayincrm.com）もあります。

### 必要な環境（READMEの要件）

- サーバー：Apache 2 または NGINX。
- RAM：3GB以上。
- PHP：8.3以上。
- Composer：2.5以上。
- MySQLは8.0.32以上、MariaDBは11.4 LTS以上（11.8 LTS推奨）。

### 導入の流れ

READMEによると、Composerでプロジェクトを作り、`.env` のAPP_URL・メール・データベースを設定し、`php artisan krayin-crm:install` を実行します。Dockerでの導入の案内（公式ドキュメント）もあります。本番に出す前に、開発用の依存を外す（`composer install --no-dev`）ことが推奨されています。

### 向いている人

- PHP（Laravel）の環境に慣れていて、CRMを自分のサーバーで動かしたい人。

### 向いていない人

- PHPとデータベースの運用を担当できない人。

### 注意点

- ライセンスはMITです。
- セキュリティの問題は、公開の場で報告せず、メールで連絡するようにとREADMEにあります。
- READMEには、HubSpotとの機能比較の記載はありません。HubSpotの代わりになるかは、機能を確認して判断してください。

### 出典と確認の範囲

- 確認した資料：公式リポジトリのREADME・LICENSE（2026-10-29）。
- 確認していないこと：実際の導入、性能、HubSpotとの機能比較。
