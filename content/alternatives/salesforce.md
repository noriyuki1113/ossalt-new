---
description: "Salesforceの代わりに自前で動かせるオープンソースのCRM。Frappe CRM・EspoCRM・SuiteCRM・Odooなどを、CRM専用か業務全体を扱うか、ライセンスの違いから比較します。"
updated: "2026-09-26"
intro: "Salesforceの代替は、顧客や商談の情報を自社サーバーで管理したい場合の選択肢です。利用者数に応じた課金から離れられる一方、Salesforceほどの作り込みやエコシステムは期待できません。どこまでの業務を載せるかを先に決めるのが大切です。"
picks:
  - tool: frappe-crm
    fit: "商談・顧客・問い合わせを、シンプルな画面で管理したい"
  - tool: espocrm
    fit: "項目を自分で追加しながら、日本語表示で使いたい"
  - tool: suitecrm
    fit: "長く使われてきた、機能の多いCRMを使いたい"
  - tool: odoo
    fit: "CRMだけでなく、会計・在庫・人事まで1つの基盤にまとめたい"
---

## 選び方

- **CRM専用か、業務全体か**：Frappe CRM・EspoCRM・SuiteCRMは顧客管理と営業支援に絞ったツールです。OdooとERPNextは、会計・在庫・製造・人事までを扱う業務基盤（ERP）で、CRMはその一部という位置づけです。
- **Odooの版に注意**：Odooには無償のCommunity版と有償のEnterprise版があり、一部の機能はEnterprise版にしかありません。必要な機能がどちらに含まれるか確認しましょう。
- **ライセンス**：SuiteCRM・Frappe CRM・EspoCRMはAGPL-3.0、ERPNextはGPL-3.0、Odoo（Community版）はLGPL-3.0です。

## 移行するときの注意

- 取引先・担当者・商談のデータは、Salesforceから書き出して移行先に取り込みます。独自に追加した項目は、移行先で先に同じ項目を作っておきましょう。
- Salesforce上で作り込んだ自動化やカスタマイズは、移行先で作り直しになります。まず、本当に使っているものを洗い出しましょう。
- 他のシステム（マーケティングツール、会計、問い合わせ管理など）との連携を一覧にし、移行先でつなぎ直す方法を確認してください。
