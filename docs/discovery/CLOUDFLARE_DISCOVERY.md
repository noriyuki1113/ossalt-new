# Cloudflare OSS Discovery Engine（Phase 1）

作成：2026-10-09 ／ 処理：`scripts/discover-cloudflare.mjs`（純粋関数：`scripts/discovery/lib.mjs`、GitHub API：`scripts/discovery/github.mjs`、テスト：`scripts/discovery.test.mjs`）／ 定期実行：`.github/workflows/cloudflare-discovery.yml`（毎週水曜 06:23 JST）

## 1. 既存の仕組みとの関係（作り直していないもの）

| 既存 | 役割 | 今回 |
|---|---|---|
| `data-source/tools.json` | 掲載データ（DBの代わり。サーバー・DBなし） | **書き込まない** |
| 「ツール追加」ワークフロー（`add-tools.yml`、`scripts/add-tools.mjs`） | 人が候補を貼って掲載に追加する。手動実行のみ＝リポジトリに書き込み権限のある人だけ | **掲載（公開）の唯一の入口として、そのまま使う** |
| `scripts/fetch-github-api.mjs`（毎日） | 掲載済みのツールのスター・ライセンス・Scorecard などの更新 | 掲載後の更新はこちらに任せる |
| OpenAlternative 候補（`generate-openalt-candidates.mjs`） | 別の一覧からの候補づくり | 同じ考え方（掲載データは触らず、候補の一覧だけ作る）を踏襲 |
| 解説の点検・月次レポート | ライセンス変更・アーカイブの検知 | そのまま |

新しいサービス・DB・課金のあるAPIは追加していない。GitHub API は GitHub Actions の `GITHUB_TOKEN`（または既存の `DATA_FETCH_TOKEN`）を使い、トークンはファイルにもログにも書かない。

## 2. 流れ

```
収集      Awesome Cloudflare Self-Hosted（README の表、MIT・項目は CC0 の扱い）
          Appflare のカタログ（index.json、Apache-2.0）
  ↓
正規化    リポジトリを owner/repo（小文字）に。URL の表記ゆれ（.git・末尾の /・www・/tree/…）を吸収
  ↓
確認      プロジェクト自身の wrangler.toml / wrangler.jsonc / wrangler.json（直下）を読み、使う Cloudflare の機能を確かめる
          GitHub API（Actions のみ）：リポジトリID・正式な名前（移転の検知）・SPDX のライセンス・スター・フォーク・最終push・最新リリース・アーカイブ・公式サイト・言語
  ↓
重複排除  2つの収集元・移転前後の名前を1件に。掲載データとは「リポジトリ → 移転前の名前（aliases）→ GitHub のリポジトリID」の順で照合
  ↓
審査待ち  data-source/discovery/cloudflare-candidates.json（docs/discovery/cloudflare-candidates.md が人向けの一覧）
  ↓
人の判断  data-source/discovery/decisions.json に approved / rejected / hold を書く
  ↓
掲載      「ツール追加」ワークフローに1行を貼る（日本語の説明・代替SaaS・カテゴリは人が書く。AIの下書きは Phase 2）
```

## 3. データの形

候補の各項目は `{ value, source, fetched_at, status }`。

| status | 意味 |
|---|---|
| `verified` | このシステムがプロジェクト自身のファイル（wrangler の設定）を読んで確かめた |
| `api` | GitHub API の値（持ち主が設定した情報） |
| `claimed` | 第三者の一覧の記載（Awesome の一覧・Appflare のカタログ） |
| `unknown` | 確かめられなかった（「無い」「非対応」ではない） |

主な項目：`name`・`description`・`license`・`canonical_repo`・`github_repo_id`・`stars`・`forks`・`pushed_at`・`latest_release_at`・`archived`・`homepage`・`language`・`cloudflare_features`（d1・r2・kv・durable_objects・workers_ai・queues・cron など）・`cloudflare_features_claimed`（一覧の記載。確認した値と食い違うことがある）・`cloudflare_runtime`（workers／pages）・`workers_paid_required`（Appflare の plan）・`cloudflare_requirements`（独自ドメイン〔zone〕・Email Routing など）・`external_dependencies`（Phase 1 では常に unknown。README の読み取りは Phase 2）・`replaces`・`deploy_methods`・`appflare`（Appflare のカタログに載っているか）。

**無料枠について**：`workers_paid_required: false` は「Workers の無料プランで動く（Appflare の記載）」であって、「完全に無料で運用できる」ではない（R2・Workers AI などは使った量に応じて課金されうる。独自ドメインの費用もある）。

## 4. 品質の確認（`quality.issues`）

| 問題 | 公開を止めるか |
|---|---|
| `license_unknown`（ライセンスが不明。一覧で「unlicensed」） | **止める** |
| `license_not_osi`（BUSL・FSL・PolyForm・ソース公開型など） | **止める**（掲載するなら、ソース公開型であることを明記する判断が要る） |
| `archived`（開発終了） | **止める** |
| `no_description` | **止める** |
| `needs_workers_paid` | 止めない（注意点として書く） |
| `has_extra_requirements`（独自ドメイン・Email Routing など） | 止めない（注意点として書く） |
| `cloudflare_bindings_unverified`（設定ファイルが直下になく、機能を確かめられない） | 止めない（「一覧の記載」として扱う） |

`review.state`：`needs_review`（新規・問題なし）／`blocked`（止める問題あり）／`update_review`（掲載済みで差分あり）／`no_change`／運営者の判断（`approved`・`rejected`・`hold`）。

## 5. 上限・障害・再実行

- GitHub API：1回あたり最大300リクエスト（変更可）。残りが50を切るか制限に当たったら、その回はそこで止める（待たない。次回の続きで補完）。ETag の控えで、変わっていないリポジトリは 304（制限に数えられない）。
- 失敗：ネットワークの失敗と 5xx は、間隔を倍にして最大3回再試行。収集元が両方とも取れないときは、前回の結果を消さずに失敗で終わる。
- 再実行の安全性：同じ入力なら候補のファイルは1文字も変わらない（値の変わらない項目は取得日時も前回のまま）。`state.json` には最終実行日時・件数・API の使用量だけを書く。
- AI の利用：Phase 1 では使わない（費用は0）。

## 6. 2026-10-09 の実行結果（作業環境で実行。GitHub API なし）

- 収集：Awesome 130件・Appflare 136件 → **候補 189件**（両方に載っていた 77件を1件にまとめた）
- 掲載済みとの一致：**0件**（リポジトリ・名前とも一致なし。189件すべて新規）
- 設定ファイルで Cloudflare の機能を確認できた：122件（67件は直下に設定ファイルがない。モノレポなど）。一覧の記載と確認した値が食い違ったもの：33件
- 審査待ち 173件・公開を止める問題あり 16件（ライセンス不明12件・OSI以外4件）
- GitHub API：作業環境からはほかのリポジトリの API を読めないため未実行（その項目は unknown）。GitHub Actions での初回の実行で補完される

## 7. 次の Phase（承認後）

- Phase 2：README・公式ドキュメントを根拠にした日本語の下書き（概要・機能・想定ユーザー・代替SaaS・制約・外部依存）。AIの評価と確認済みの事実を分けて保存。費用の上限つき。公開は人の承認後
- Phase 3：`/collections/cloudflare`（URL は既存のルートとの衝突を確認してから確定）
- 取り込みの補助：approved の候補から「ツール追加」に貼る行を作る
