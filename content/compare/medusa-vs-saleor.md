---
description: "MedusaとSaleorの違いを比べます。どちらもShopifyの代わりになるヘッドレス型のECの基盤ですが、MedusaはNode.js（TypeScript）、SaleorはPython（Django）とGraphQLで作られていて、開発チームの得意な言語で選ぶのが基本です。"
updated: "2026-10-06"
---

**結論：できることは近く、どちらも開発者が作り込むための基盤です。TypeScriptやNode.jsが得意なチームならMedusa、PythonやGraphQLが得意なチームならSaleorが扱いやすいです。**

- **Medusaを選ぶ場合**：Node.js（TypeScript）で作られていて、商品、在庫、注文、決済などの機能をAPIで提供します。機能をコードで追加・変更しやすい作りです。管理画面の日本語翻訳も確認できています。
- **Saleorを選ぶ場合**：Python（Django）で作られていて、APIはGraphQLで提供されます。複数の通貨やチャネル、倉庫を扱う機能を備えています。

**共通の注意点**：どちらも、お客さまが見るお店の画面は、自分たちで作る前提です。日本でよく使われる決済の手段や配送、特定商取引法にもとづく表記などは、自分たちで対応する必要があります。開発の体制がない場合は、Shopifyなどのサービスのほうが、結果として安く済むことが多いです。

**ライセンス**：MedusaはMIT、SaleorはBSD-3-Clauseで、どちらも許容型です。

詳しくは[Medusaとは](/tools/medusa/)、[Shopifyの代替](/alternatives/shopify/)のページを参照してください。
