---
name: ossalt-quality
description: OSSALTのOSS詳細ページの品質監査（OSSALT Quality Intelligence）。「全件品質監査」「変更されたページだけ監査」「〇〇の詳細ページを再監査」「品質の低いページを20件」「改善されたページ」「P0問題の一覧」「品質ダッシュボード」と頼まれたときに使う。
---

# OSSALT Quality Intelligence の運用

最初に `docs/quality-intelligence.md` を読む（基準・保存先・しないこと）。

## 手順
1. `npm run build`（データ・解説・テンプレートを変えたあとは必ず。監査はビルド済みの out/ を読む）
2. 依頼に応じて実行：
   - 全件：`npm run qi:full`（履歴 `quality/history/` に保存される）
   - 差分：`npm run qi:diff`
   - 個別・再監査：`npm run qi:one -- <ツールid>`（前回との比較が出る）
   - 一覧：`npm run qi:report -- --top 20`／`-- --p0`／`-- --improved`
3. ダッシュボードは `reports/quality/latest/dashboard.html`。ユーザーに送るときは SendUserFile で送る（公開しない）。

## 報告の決まり
- 対象件数・監査できた件数・未監査・失敗を必ず書く。黙って除外しない。
- 「未確認」は不合格ではない。点数は確認できた項目だけで出している、と書く。
- Search Console の数値は、公開リポジトリに書かない（reports/ だけ）。
- 本文の修正は、提案までにして、運営者の承認を得てから。架空の体験談・実機検証を書かない。
- 修正したら `quality/fixes.json` に状態を記録し、`qi:one` で再監査して前後を比べる。
