# OSSALT Autonomous Dev System

AI が **開発 → 実ブラウザ検証 → 不具合修正 → 再検証 → Pull Request 本文の作成** まで進めるための仕組みです。
[claude-quickstarts](https://github.com/anthropics/claude-quickstarts) の `autonomous-coding`（Initializer / Coding Agent、`feature_list.json`、許可リスト、進捗の引き継ぎ）と、
`browser-use-demo`（実ブラウザでの探索）の考え方を、**既存の ossalt-new 向けに作り直したもの**です。公式サンプルをそのまま動かすことはしません（新規アプリを生成するため）。

**自動マージも本番公開もしません。** 最後は人がレビューしてマージします。

## 監査の結果（重複と破壊を避けるために）

| 既存の仕組み | この仕組みとの関係 |
|---|---|
| `deploy-pages.yml`（公開）／`update-data.yml` ほか | **触らない**。追加したワークフローは公開しない。`e2e.yml` は PR と手動だけ、`autodev-*` は手動だけ。公開用ブランチへの push では何も動かさない（不要なビルド・デプロイなし） |
| `content-check`（解説の点検）／`monthly-report`／`sns-drafts`／`discovery` | **重複しない**。コンテンツ・SEO文面・収益の判断はここでは扱わない。扱うのは「画面とコードが動くか」だけ |
| `npm test`（単体） | 維持。autodev の単体テスト（`autodev/lib/*.test.mjs`）も同じ `npm test` に入る |
| 収益導線（VPS枠・アフィリエイト） | 変更しない。表示条件（P1-1）を **E2E で守る**（`e2e/seo-revenue.spec.ts`） |
| `docs/OSSALT_IMPLEMENTATION_BACKLOG.md` の P4-1「日次の自動運用、AIの利用量の上限、失敗時の停止」 | この仕組みの上限・停止条件が、その土台になる（日次のコンテンツ運用とは別） |

## 構成

```
e2e/                  Playwright のテスト（デスクトップ＋スマホ）。npm run test:e2e
  sweep.spec.ts       サイトマップ巡回（E2E_SWEEP=1 のときだけ）
  serve.mjs           out/ を localhost で配信（ネットワーク不要）
autodev/
  tasks.json          改善タスク（feature_list.json 相当）
  progress.md         セッション間の引き継ぎメモ
  state.json          失敗の連続回数などの状態（中断・再開用）
  config.json         上限・保護ブランチ
  run.mjs             実行ループ
  qa.mjs              Browser QA の実行と、証拠（再現手順・URL・スクショ・ログ）の記録
  probe.mjs           調査用の実ブラウザ操作（読み取り専用・localhostだけ）
  explore.mjs         読み取り専用エージェントによる原因調査
  lib/                tasks / budget / security / report / pr（純粋関数＋テスト）
  hooks/bash-guard.mjs  Claude Code の PreToolUse フック（Bash の許可リスト）
  prompts/            Coding Agent・調査担当のプロンプト
```

## ループ

```
タスク選択 → 実装（Coding Agent） → 単体テスト → ビルド → Browser QA（対象のテスト）→ 回帰テスト（全E2E）
   ↑                                                      │ 不合格
   └──────── 再現手順・URL・スクショ・ログを渡して修正 ←──────┘
合格 → autodev/<ID> ブランチにコミット → PR本文（autodev/out/PR_BODY-<ID>.md）→ （人が）PR作成・レビュー・マージ
```

- **状態の保存**：Git（コミット）＋ `tasks.json`（status・attempts・lastResult）＋ `progress.md` ＋ `state.json`。途中で止めても、同じコマンドで続きから始まります（`in_progress` のタスクを最優先）。
- **合格の条件**：`npm test` ＋（必要なら）ビルド ＋ 対象のブラウザテスト ＋ **全E2Eの回帰テスト**。`passed` には証拠（`lastResult.evidence`）が必要です。
- **失敗**：2回目以降は、読み取り専用の調査担当が `probe.mjs` で実ブラウザを確認して原因の仮説を渡します（`--agent claude` のとき）。

## 安全の仕組み

1. **ブランチ**：`autodev/<ID>` にだけコミットする。`main`・公開用ブランチ（`claude/ossalt-jp-setup-deploy-tsv3x8`）では実行を拒否。push は `autodev/` だけ。
2. **Bash の許可リスト**（`lib/security.mjs`、テストあり）：`git push/reset/merge/fetch`、`curl`、`gh`、`npm install`、`node -e` などは拒否。Claude Code のフックで強制。
3. **編集の禁止**：`.github/`、安全装置自身（`security.mjs`・`hooks/`・`claude-settings.json`）は編集できない。`WebFetch`/`WebSearch` も拒否。`public/data` はビルド後に自動で元に戻す。
4. **認証情報**：テスト・ビルド・ブラウザは `scrubEnv()` で、トークン・APIキー等を取り除いた環境で実行。エージェントには `ANTHROPIC_*` だけ渡し、GitHub の資格情報は渡さない。
5. **ブラウザの隔離**：Playwright は localhost の `out/` だけを開き、外部への通信は遮断。本番サイトには接続しない。
6. **上限**（`config.json`。コマンドラインで下げることはできるが、設定ファイルの値は超えられない。ハードキャップは `lib/budget.mjs`）：
   セッション数 3／1タスクの試行 3／同じエラーの連続 2／AI利用額 $5（1セッション $2）／60分。
7. **停止**：同じエラーが続く、または試行の上限に達したら `blocked` にして停止し、原因とログを `autodev/out/STOP-<ID>.md` に出す。

## 使い方

```bash
npm ci
npm run build

npm run test:e2e              # ブラウザテスト（デスクトップ＋スマホ）
npm run qa -- --sweep         # サイトマップ巡回（失敗は reports/qa/runs/ に証拠つきで保存）

# 自律ループ（まず dry-run で、渡すプロンプトを確認する）
npm run autodev                                 # dry-run：autodev/out/last-prompt.md を書くだけ
node autodev/run.mjs --agent none --task AD-001 # 今の変更を検証だけする
node autodev/run.mjs --agent claude --task AD-002 --max-cost 3   # AI を実行（要 ANTHROPIC_API_KEY）
node autodev/run.mjs --agent claude --task AD-002 --push         # 合格したら autodev/AD-002 を push
```

- 実行前に、作業ツリーをコミットしておいてください（未コミットの変更があるとブランチを切り替えません）。
- 調査だけ：`node autodev/probe.mjs /cost-lab/ --mobile --fill "input >> nth=0=-5"`
- **停止したタスクの再開**：原因を確かめてから、`tasks.json` の `status` を `todo`・`attempts` を 0 に戻し、`state.json` の該当タスクを消す。

## GitHub Actions

| ワークフロー | 起動 | 内容 |
|---|---|---|
| `e2e.yml` | PR（関連ファイルの変更時）・手動 | 単体テスト → ビルド → ブラウザテスト。失敗時はスクリーンショット・トレース・動画を成果物に保存 |
| `autodev-sweep.yml` | 手動（週1回の schedule はコメントアウト済み） | AIなしの巡回QA |
| `autodev-run.yml` | 手動だけ | AIが1タスクを実装 → 合格したら `autodev/<ID>` を push → **ドラフトPR**を作成（マージはしない）。`ANTHROPIC_API_KEY` と Environment `autodev` の承認が必要 |

## 段階的な運用

1. **今**：手動起動で検証する（`dry-run` → `--agent none` → `--agent claude --max-cost 1`）。
2. 安定したら、`autodev-sweep.yml` の schedule を有効にする（AIなし・無料）。
3. 巡回で問題が見つかったときだけ、人が `autodev-run.yml` を起動する（AIは必要なときだけ）。
4. 将来：UX改善・SEO改善のタスクを `tasks.json` に足す。検証方法（`kind`）を増やせば、同じループで扱える。

## 既知の制約

- `--agent claude` の実行（実際のAI呼び出し）と `autodev-run.yml` は、この実装時点では **未実行**（認証情報のない環境で作ったため）。ループの制御・停止・検証・記録は、`--agent none` と自己テスト用のタスクで確かめています。
- Claude の「Computer Use」APIによる画面操作（`browser-use-demo` のコンテナ構成）は使っていません。代わりに、読み取り専用の `probe.mjs` を調査担当に使わせます。必要になれば、同じ `explore.mjs` の中で差し替えられます。
- 検証は out/（静的書き出し）に対して行うため、Cloudflare や GitHub Pages の設定（ヘッダー等）は検証対象外です。
