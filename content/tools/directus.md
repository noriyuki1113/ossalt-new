---
description: "Directusとは、既存のデータベースの上に、管理画面とAPIを自動で作るオープンソースのデータ基盤（ヘッドレスCMS）です。できること、Strapiとの違い、ライセンスの注意点を解説します。"
updated: "2026-11-11"
verification:
  status: official
  checked_at: "2026-11-11"
  sources:
    - https://github.com/directus/directus
    - https://github.com/directus/directus/blob/main/license
    - https://directus.io/mscl
    - https://directus.io/pricing
    - https://docs.directus.io/
    - https://directus.io/docs/guides/files/upload
    - https://directus.io/docs/guides/files/manage
    - https://github.com/directus/directus/tree/main/app/src/lang/translations
    - https://github.com/strapi/strapi
  note: "README、ライセンス文（MSCL 1.0）、料金のページ、公式ドキュメント、翻訳ファイルの一覧と、この解説の機能・ライセンス・費用の条件の記述を照合した。「以前はBSL 1.1だった」という記述は、公式資料で確認できなかったため削った。Strapiの記述は、StrapiのREADMEで確認した。料金のページは、取得できた写しが2026-09-10付けと古い（条件はREADMEでも確認）。実機では動かしていない"
---

Directus（ディレクタス）は、PostgreSQLやMySQLなどの**データベースに、管理画面とAPIを後から付ける**ためのソフトです。WebサイトやアプリのコンテンツをAPIで配信するヘッドレスCMSとして使えるほか、社内のデータを管理する画面としても使えます。

### できること

- **データベースをそのまま使う**：既存のSQLデータベースにつなぐと、その構造をもとにAPI（RESTとGraphQL）が自動で作られ、管理画面も使えます。既存の表の作りを変えないかどうかは、公式では確認できませんでした。
- **管理画面**：エンジニアでない人も、データの追加や編集、ファイルの管理をブラウザで行えます。
- **権限の管理**：役割ごとに、見られるデータや操作できる範囲を、細かく決められます。
- **自動の処理（フロー）**：データが追加されたときに通知する、といった処理を、画面で組めます。
- 画面の日本語翻訳と、Dockerでの導入方法を確認できています。

### Strapiとの違い

[Strapi](/tools/strapi/)は、管理画面でコンテンツの型を定義すると、APIが自動で作られる作りで、Node.jsのコードで拡張していきます。Directusは、**すでにあるデータベースに後から管理画面を付けられる**のが大きな違いです（「[DirectusとStrapiの違い](/compare/directus-vs-strapi/)」）。

### 注意点

- **ライセンスは、一般的なオープンソースライセンスではありません。** Directusは「Monospace Sustainable Core License（MSCL）1.0」という、ソース公開型のライセンスを採用しています。ライセンス文の要点は次のとおりです（2026年10月時点）。
  - **Competing Use以外の目的であれば、使えます。** ライセンス文は、内部での利用とアクセス、非営利の教育、非営利の研究、導入やホスティングの専門サービスの提供を、許可される目的として挙げています。
  - **Directusの開発元の有料のサービスと競合する形で、Directus自体を他社に提供すること（Competing Use）は禁止**されています。
  - ライセンスキーで保護された機能を、キーなしで使えるように改変することは禁止されています。
  - 各バージョンは、公開から4年後に、GPL-3.0でも使えるようになります。
- **組織の規模によって、費用の条件が変わります。** READMEでは、年間の売上が500万ドル未満、かつ従業員が50人未満の組織は、「Open Innovation Grant」に申し込むと無料で使えると案内されています。誰でも使える無料の範囲（Free Core Tier）もあります。条件を超える組織が、高度な機能やエンタープライズ向けの機能を使う場合は、商用のライセンスが必要です。
- 条件は変わることがあります。**導入の前に、公式のライセンスの案内と料金のページで、自社が当てはまる条件を確認してください。**
- データベースを直接扱うため、権限の設定を誤ると、見せたくないデータがAPIから見えてしまいます。公開の前に、権限を必ず確認しましょう。
- 自分で動かす場合、データベースとアップロードしたファイルの両方のバックアップを取ってください。

[Contentfulの代替](/alternatives/contentful/)のページで、ほかの候補も比べられます。
