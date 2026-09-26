---
description: "Trelloの代わりに自前で動かせるオープンソースのカンバン。WeKan・Planka・Kanboard・Focalboardを、機能の多さ・軽さ・ライセンスの違いから比較します。"
updated: "2026-09-26"
intro: "Trelloの代替は、カンバン方式のタスク管理を自社サーバーで運用したい場合の選択肢です。カード・リスト・ボードという基本の形はどれも共通なので、違いは周辺の機能と運用のしやすさに表れます。"
picks:
  - tool: wekan
    fit: "Trelloに近い機能をひととおり備え、日本語表示でも使いたい"
  - tool: planka
    fit: "Trelloに近い操作感と、複数人の操作がすぐ反映される画面を重視したい"
  - tool: kanboard
    fit: "小さなサーバーで軽く動く、シンプルなカンバンにしたい"
  - tool: focalboard
    fit: "Mattermostと組み合わせて、チャットとタスクをまとめたい"
---

## 選び方

- **機能の多さ**：WeKanは機能が多く、Trelloの主な使い方をひととおりカバーします。Kanboardは機能を絞った軽量型で、PHPだけで動きます。
- **ライセンス**：WeKanとKanboardはMIT、FocalboardはApache-2.0です。Plankaは独自の「PLANKA Community License」で、一般的なオープンソースライセンスではありません（サイトのデータ時点）。
- **更新状況**：Focalboardは、ほかの候補より更新の間隔が空いています。採用前に、ツールのページで最終コミット日を確認しましょう。

## 移行するときの注意

- TrelloはボードをJSON形式で書き出せます。WeKanのように、TrelloのJSONを取り込めるツールもあります（対応範囲は公式で確認してください）。
- Power-Up（拡張機能）で追加していた機能は、移行先に代わりの機能があるかを先に確かめましょう。
- 担当者やコメントの紐付けは、ユーザーを作り直す必要があるため崩れやすい部分です。
