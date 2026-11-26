---
description: "Magentoとは、自分のサーバーで動かすオープンソースのEC（電子商取引）の基盤、Magento Open Sourceです。複数の店舗やサイトを1つの管理画面で扱えます。できること、Shopifyとの違い、導入の目安と、Adobe Commerceとの関係などの注意点を解説します。"
updated: "2026-11-26"
at_a_glance:
  what: "Magento Open Sourceは、PHPで作られたECの基盤です。商品・注文・決済などの基本の機能を持ち、複数の店舗・サイトを1つの管理画面で扱えます。有料のAdobe Commerceとは別の版です。"
  good_for:
    - "商品数や店舗数が多く、販売の仕組みを細かく作り込みたい人"
    - "コードとデータを自社で持ち、サーバーも自分で用意できる人"
  not_for:
    - "開発やサーバーの運用をせずに、すぐにネットショップを開きたい人（Shopifyのようなサービスのほうが早く始められます）"
    - "小さな規模の店を、少ない手間で運営したい人"
  check:
    - "使いたい機能が、オープンソースの範囲か、有料のAdobe Commerceや有料の拡張機能か"
    - "使う版のシステム要件（PHP、データベース、検索エンジンなど）を満たせるか"
    - "ライセンスはOSL-3.0です"
verification:
  status: official
  checked_at: "2026-11-26"
  sources:
    - https://github.com/magento/magento2/blob/HEAD/README.md
    - https://github.com/magento/magento2/blob/HEAD/LICENSE.txt
    - https://experienceleague.adobe.com/en/docs/commerce-operations/installation-guide/system-requirements
    - https://experienceleague.adobe.com/en/docs/commerce-operations/installation-guide/composer
    - https://experienceleague.adobe.com/en/docs/commerce-admin/start/storefront/enhanced-experiences
  note: "公式GitHubのREADME・LICENSE.txtと、Adobeの公式ドキュメント（システム要件、導入手順、ストアフロントの機能）と、この解説の機能・導入の方法・ライセンスの記述を照合した。実機では動かしていない"
---

Magento（マジェント）は、自分のサーバーで動かす**オープンソースのECの基盤**です。正式にはMagento Open Sourceといいます。公式のGitHubのREADMEでは、基本的なECの機能で、独自のオンラインストアを土台から作るためのソフトと説明されています。PHPで作られています。

### できること

- **お店の基本の機能**：商品の管理、注文の処理、複数の支払い方法、クーポンや価格ルールによる販促があります。
- **複数の店舗・サイト**：複数のサイトや店舗、言語ごとの表示（ビュー）を、1つの管理画面で扱えます。
- **コンテンツと集客**：Page Builderでページを作れます。SEOの設定やカスタムURL、メタデータなどもあります。
- **拡張**：本体はモジュール、テーマ、言語パッケージでできていて、機能を足したり変えたりできます。
- 画面の日本語翻訳を確認できています。

### Shopifyとの違い

Shopifyは、登録するだけで店を開けるサービスです。Magento Open Sourceは、**コードとデータ、サーバーを自社で持つための基盤**で、自由度が高い代わりに、開発と運用の体制が必要です。同じPHPの候補の[WooCommerce](/tools/woocommerce/)は、WordPressに載せて使う形です。Magentoは、複数の店舗やサイトを1つの管理画面で扱う構成を公式に前面に出している点が特徴です。

### 始め方の目安

公式の導入手順では、自分のサーバー環境に置く前提で、Composerで `magento/project-community-edition` のプロジェクトを作り、コマンドラインで `bin/magento setup:install` を実行します。その前に、Commerce Marketplaceの認証キーの取得が必要です。前提になるソフトは版ごとに変わります（2.4.8系ならPHP 8.3または8.4、MySQL 8.4またはMariaDB 11.4、OpenSearchなど）。使う版の要件を公式ドキュメントで確認してください。

### 注意点

- 構成するソフトが多く、手間は小さくありません。開発の体制がない場合は、Shopifyのようなサービスのままのほうが安く済むことが多いです。
- **有料のAdobe Commerceと混同しないでください。** 公式のGitHubのREADMEでも、クラウドの基盤やAIを使ったマーチャンダイジングを含む高機能な版として、Adobe Commerce（有料）が別に案内されています。このサイトの掲載リンク先もAdobe Commerceのページです。使いたい機能が、オープンソースの範囲か、有料の版や拡張機能かを確認してください。
- 日本向けの決済や配送、税の扱いが自社の要件に合うかは、導入の前に公式の情報で確認してください。
- ライセンスはOSL-3.0です。公式のREADMEとLICENSE.txtでは、各ソースファイルはOSL 3.0か、Adobeとの注文の条件のどちらかでライセンスされ、注文の条件がある場合はそちらが優先すると書かれています。

[Shopifyの代替](/alternatives/shopify/)のページで、ほかの候補も比べられます。
