---
name: ossalt-seo
description: ossalt.jp の検索流入を改善する、承認制のSEO運用（Search ConsoleのCSV分析・監査・戦略・記事/比較ページの草案・既存ページの最適化・独立レビュー・週次レポート）。SEO、検索順位、Search Console、内部リンク、タイトルや説明文の改善、週次SEOレポートを頼まれたときに使う。
---

# OSSALT SEO（1人のエージェントが、5部門を順番に切り替える）

常に最初に読む：`agency/AGENCY.md`（規則・承認）、`agency/CLIENT.md`（サイトの前提）、`agency/PRIORITY.md`（優先順位の考え方）、`agency/LEDGER.md`（履歴）。
**複数のエージェントを並列に常時起動しない。** 部門の切り替えは、順番に、前の成果物を読んでから行う。書いた部門が、自分の成果物を承認しない（Review Mode は別の文脈で行う）。

## 共通の停止条件（どのモードでも）
- 本番デプロイ・PRのマージ・ページの削除・URLやcanonicalの大規模変更・noindex/robotsの変更・新規キーワード戦略の確定・大量の新規記事・有料契約・外部への営業やリンク依頼は、**オーナーの明示的な承認が出るまで実行しない**。
- Search Console のデータが無い項目は「**未取得**」と書く。0や推定で埋めない。検索データ・認証情報は、リポジトリに入れない（このリポジトリは公開）。
- 事実（実測）と仮説（分類・重み）を区別して書く。需要が確認できないキーワードを「有望」と書かない。
- 既存の手書きの解説・SEO設定（解説の無い比較ページの noindex など）を尊重する。影響範囲を調べずに一括変更しない。
- 定期実行のGitHub Actionsを追加しない。手動で実行する。

## モード
### Audit Mode（監査）— 読み取り専用
- 入力：ビルド済みの `out/`（なければ `npm run build`。本番に合わせるなら `NEXT_PUBLIC_FEATURE_FOR_YOU=1`）。
- 実行：`node scripts/seo-audit.mjs --out agency/reports/audit.md`（`--strict` で、直す必要がある事実があれば終了コード1）。
- 出力：`agency/reports/audit.md`、要約を `TECH.md`（`agency/templates/TECH.md`）へ。
- 停止：問題を見つけても、設定を変えない。「直す必要がある事実」と「影響範囲を見てから判断するもの」を分けて報告し、承認を待つ。

### Strategy Mode（戦略）
- 入力：`agency/data/` のGSC CSV（クエリ・ページ・できればクエリ×ページ）、監査結果。
- 実行：`node scripts/seo-agency.mjs --queries … --pages … [--pairs …] --pages-nonbrand-confirmed --site out --period "…" --out agency/reports/weekly-YYYY-MM-DD.md`。CSVが無いときは引数なしで実行し、「未取得」のレポートを出す。
- 作業：候補の完全一致フィルタ（クエリ×ページ）の実測値を、人がGSCで確認する依頼を作る。現在のSERPを読み（取得日時を記録）、検索意図と既存ページを比べる。競合の調査結果は日時つきで保存し、同じ調査を繰り返さない。
- 出力：`STRATEGY.md`（`agency/templates/STRATEGY.md`）。既存ページ最大2件・新規最大1件。
- 停止：ゲートB（オーナーが対象とクエリを承認）まで、Writer に進まない。データが足りなければ、必要なエクスポートを具体的に依頼して終了する。

### Content Mode（草案の作成）
- 入力：承認済みの STRATEGY。
- 作業：現在の上位ページを調べ、公式サイト・GitHub・公式ドキュメント・LICENSEの一次情報だけを根拠にする。`docs/content-writing-guide.md` の規則に従う。比較表・デメリット・「向かない場合」を入れる。既存ページを優先し、新規ページは需要と独自価値が確認できたときだけ。
- 出力：`BRIEF`（`agency/templates/BRIEF.md`）、`PAGE`（`agency/templates/PAGE.md`）、必要なら `content/` の差分。内部リンクは Linker の `LINKS` に従う。
- 停止：独自の根拠が無い、または既存のOSSALTのページが同じ検索意図に答えているときは、書かずに報告する。1週間に既存ページ2件・新規2件まで。

### Optimization Mode（既存ページの最適化）
- 入力：承認済みの既存ページ（URL＋完全一致のクエリ）。
- 作業：title・description・本文・内部リンクの改善。内部リンクは `node scripts/seo-links.mjs --target <パス>` の候補（データ上の関連の事実）から、本文を読んで文脈に合うものだけを選ぶ。アンカーを機械的に繰り返さない。
- 確認：`npm test`、`next build`、`seo-audit --strict`、`content-check`。
- 出力：専用ブランチの PR（重複PRを作らない。既存PRに続ける）と `TECH.md`。公開したら `node scripts/seo-ledger.mjs add …` で記録する。
- 停止：canonical・noindex・robots・URLの変更が必要になったら、止めてオーナーの承認を求める。

### Review Mode（独立レビュー）
- 別の文脈（書いた作業の記憶を持たない状態）で、PRの差分・根拠・テスト・SEO上の悪影響だけを検証する。
- 確認：事実の根拠の表（PAGE）を一次情報と突き合わせる／`seo-audit` の前後の差／既存の noindex・sitemap・canonical への非干渉／機密・GSCデータの混入／テストの実行結果（実行していないものは「未実行」）。
- 出力：承認 / 修正 / 差し戻し と、その根拠。自分の成果物は承認しない。

### Report Mode（週次レポート）
- 実行：`node scripts/seo-ledger.mjs due`、`node scripts/seo-agency.mjs …`、必要なら `seo-audit`。
- 出力：`WEEKLY`（`agency/templates/WEEKLY.md`）。公開済みの変更は、URL・クエリ・条件をそろえて 28日・約90日で比較する（90日はGoogleの固定ルールではない）。結果は `seo-ledger.mjs record` で 改善/変化なし/悪化/評価不能 を記録する。明確な不具合は、期限を待たずに直す。
- 停止：計測できないコンバージョンは「未計測」。クリックや表示回数を、売上と同じに扱わない。

## 最後の報告の形
実測の基準値／対象URL＋完全一致のクエリ／確認した根拠／変更の理由／リスク／承認が必要なこと／未取得・未検証の項目。データが無いときは、架空の成果ではなく、CSVの取り込み手順と検証結果を返す。
