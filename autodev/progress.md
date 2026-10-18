# autodev 進捗メモ

セッション間の引き継ぎ用（Coding Agent と run.mjs が追記する）。状態の正は `autodev/tasks.json` と Git の履歴。

## AD-002（Cost Lab の入力エラー表示）
- globals.css の `.costlab__error` と `.input[aria-invalid]` を調整（左線・太字・折り返し・スマホで16px入力）。cost-lab.ts は未変更。
- 単体153件・build・E2E "Cost Lab"（desktop/mobile 8件）が通過。スマホ幅の横はみ出しは専用テストを足しておらず、計測していない。


## 2026-10-18T08:09:31.253Z AD-002 合格
- 単体テスト（npm test）: 153件 合格
- ビルド（npm run build）: 成功
- ブラウザ検証（Cost Lab）: 成功 8
- 回帰テスト（全E2E・デスクトップ＋スマホ）: 成功 72
- 証拠: reports/qa/runs/2026-10-18T08-09-31-241Z-AD-002-regression
