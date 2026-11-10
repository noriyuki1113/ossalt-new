# 自動追加の一時停止（2026-11-10〜）

検索表示回数の急減（2026-10-29〜30。[調査レポート](./gsc-incident-2026-11-09.md)）への対応として、ツール・比較・解説を自動で増やす仕組みを4週間止めます。変更の量を絞り、noindex（[PR #115](https://github.com/noriyuki1113/ossalt-new/pull/115)）の効果を測れる状態にするためです。

## 再開の条件（どちらか早いほう）

- 1日の検索表示回数が100回を超える日が、7日続く
- 2026-12-08

再開するときは、下の「戻し方」のとおりに戻し、このファイルに再開日を追記します。

## 止めたもの

| 対象 | 種類 | 止める前の予定 | 止め方 | 戻し方 |
| --- | --- | --- | --- | --- |
| Cloudflare OSS 候補の収集（`cloudflare-discovery.yml`） | GitHub Actions | 毎週水曜 06:23 JST | `schedule` をコメントにした | コメントを外す |
| OpenAlternative 候補の確認キュー（`openalt-queue.yml`） | GitHub Actions | 毎週月曜 06:11 JST | `schedule` をコメントにした | コメントを外す |
| ossalt.jp 解説の週次追加（専用セッション版） | Claude の定期タスク | 毎週月曜 09:52 JST。ツール5件・比較5組を、公開用のブランチに直接 push | タスクを無効にした（削除はしていない） | Claude の定期タスクの一覧で有効に戻す |
| OSSALT 詳細ページの解説追加（毎日10件） | Claude の定期タスク | 毎日 13:17 JST。解説10件のPRを作成（マージは運営者） | タスクを無効にした（削除はしていない） | 同上 |

どちらの GitHub Actions も、手動実行（`workflow_dispatch`）は残しています。

## もともと定期実行ではなかったもの（変更なし）

| 対象 | 状態 |
| --- | --- |
| ツール追加（`add-tools.yml`） | 手動実行のみ |
| OpenAlternative候補（`openalt-candidates.yml`） | 手動実行のみ |
| autodev 実行（`autodev-run.yml`） | 手動実行のみ |
| autodev 巡回QA（`autodev-sweep.yml`） | 手動実行のみ（`schedule` は以前からコメント） |

停止期間中は、これらも手動で実行しません（下の「やってよいこと」を除く）。

## 止めていないもの

- データ更新（`update-data.yml`、毎日）
- GitHub Pages 公開（`deploy-pages.yml`）と、OSSALT 本番反映確認（`production-seo-check.yml`）
- OSSALT SEO技術監査（`seo-weekly.yml`、週次）
- 解説の点検（`content-check.yml`）、プレビュー画像の取得（`previews.yml`）、SNS投稿の下書き（`sns-drafts.yml`）、月次レポート（`monthly-report.yml`）：ページを増やさないため

## 停止期間中にやってよいこと

- 「先に解説を書く」68件（解説なし・検索の需要あり。`data-source/noindex-tools.json` に入っていない、解説のないツール）の解説を、**週5件まで**追加する。根拠は公式の一次情報だけ。
- 追加のたびに、SEOの台帳（`agency/ledger.json`）に記録する。

## やらないこと

- canonical・robots.txt・既存のリダイレクト・URL構造の変更
- title の一括変更、新しいページ種別の追加
