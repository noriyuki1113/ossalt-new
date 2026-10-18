# autodev 進捗メモ

セッション間の引き継ぎ用（Coding Agent と run.mjs が追記する）。状態の正は `autodev/tasks.json` と Git の履歴。

## AD-002（Cost Lab の入力エラー表示）
- globals.css の `.costlab__error` と `.input[aria-invalid]` を調整（左線・太字・折り返し・スマホで16px入力）。cost-lab.ts は未変更。
- 単体153件・build・E2E "Cost Lab"（desktop/mobile 8件）が通過。スマホ幅の横はみ出しは専用テストを足しておらず、計測していない。

## AD-003（OSS診断のキーボード操作）
- e2e/interactive.spec.ts に、Tab で「← 戻る」へ到達し Enter で戻る／選択肢を Enter・Space で選べることを確かめるE2Eを追加。コンポーネントは変更なし（元から button）。
- 単体153件・build・E2E "OSS診断"（desktop/mobile 6件）が通過。「やり直す」専用のボタンは現状なく、対象外。

## 2026-10-18T08:09:31.253Z AD-002 合格
- 単体テスト（npm test）: 153件 合格
- ビルド（npm run build）: 成功
- ブラウザ検証（Cost Lab）: 成功 8
- 回帰テスト（全E2E・デスクトップ＋スマホ）: 成功 72
- 証拠: reports/qa/runs/2026-10-18T08-09-31-241Z-AD-002-regression

## 2026-10-18T08:21:02.905Z AD-003 合格
- 単体テスト（npm test）: 153件 合格
- ビルド（npm run build）: 成功
- ブラウザ検証（OSS診断）: 成功 6
- 回帰テスト（全E2E・デスクトップ＋スマホ）: 成功 74
- 証拠: reports/qa/runs/2026-10-18T08-21-02-889Z-AD-003-regression
