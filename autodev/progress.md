# autodev 進捗メモ

セッション間の引き継ぎ用（Coding Agent と run.mjs が追記する）。状態の正は `autodev/tasks.json` と Git の履歴。

## AD-002（Cost Lab の入力エラー表示）
- globals.css の `.costlab__error` と `.input[aria-invalid]` を調整（左線・太字・折り返し・スマホで16px入力）。cost-lab.ts は未変更。
- 単体153件・build・E2E "Cost Lab"（desktop/mobile 8件）が通過。スマホ幅の横はみ出しは専用テストを足しておらず、計測していない。

