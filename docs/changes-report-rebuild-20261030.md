# OSSの変化レポート（/changes/）の再構築（2026-10-30）

## 1. 原因の調査結果

| 見つかったこと | 根拠 |
| --- | --- |
| レポート全体が、外部の OSS Intelligence Watch の15件だけで組まれていた | `src/app/changes/page.tsx` が `buildActivityReport(getTools(), getWatchSignalFeed())` だけを使う |
| 取り込みは毎日成功しているが、配信元のデータが 2026-10-16 15:53（UTC）で止まっている | `public/data/osswatch-status.json`：`last_success_at` 2026-10-29、`feed_generated_at` 2026-10-16 |
| そのため `feedStalled` が真になり、ページ全体が「更新停止中」になっていた | `watch-changes.ts` の `FEED_STALL_HOURS = 36` |
| 一方、OSSALT 自身は毎日、掲載389件の Star・最終push・アーカイブ状態・リリースの公開日を取得し、7日・30日の実測差分（`star_gain_7d`・`star_gain`）をすでに持っていた | `.github/workflows/update-data.yml`（既存の毎日の実行）、`scripts/build-data.mjs` |
| 詳細ページ（Watch の15件）には、10/17 の観測タグが「GitHubの最近の観測」「GitHubの最新安定版タグ」として出ていた | `src/components/watch-signal-panel.tsx` |
| `github_checked_at`（ツールごとの取得日時）は元データにあるが、公開データ（`public/data/tools.json`）に出していなかった | `scripts/build-data.mjs` の出力の項目 |
| `star-history.json` は Star が変わったときだけ記録が増えるため、最後の記録の日付は「最後に取得した日」ではない | `scripts/star-history-lib.mjs` の `appendHistory` |
| 検証済みのスナップショットは `data-source/snapshots/2026-09-26.json` の1件だけ。前回と今回の比較で出来事を検知する材料は、まだ無い | `data-source/snapshots/` |

再利用できたもの：`star_gain_7d`（7日以上前の実測が無ければ null、間隔10日超は null）、`star_gain`（30日）、`meta.stars_as_of`（取得日時の最大）、`last_commit`（GitHub の pushed_at）、`github_archived`、`latest_release_at`（Releases の公開日。プレリリースを除いていない）。

## 2. 第1段階で変えたこと

- **新しい変化エンジン** `src/lib/own-changes.ts`（純粋関数）
  - 重複の除去（同じ id／同じ GitHub リポジトリ。`.git`・大文字・末尾の `/` の違いも同一とみなす）
  - 7日間の比較は、期間の日付・日数・整数・今日以前・取得から7日以内・7〜10日を検証。満たさなければ「比較不可」（0 の変化として数えない）
  - データ全体の新しさは `meta.stars_as_of`（48時間で「古い」）。古いときは注目の変化・直近のリリースを出さない
  - ツールごとの取得日は `github_checked_at`。無い古いデータでは、実測の期間の終了日（＝取得日）で代える。`star-history.json` の最後の日付は使わない
  - 将来の日時（5分を超えるずれ）・不正な日時・負の Star は捨てる
  - 1時点の値から出来事（新規リリース・アーカイブ化・再開）を作らない。リリースは「GitHub の公開日が直近7日以内」という状態と、リリースのページへのリンクだけ
- **/changes/ の構成**（URL はそのまま）
  1. タイトル・説明 → 2. データの日時（最新の取得・ページの生成・状態）→ 3. 件数（掲載・7日以内に取得・比較できた・比較不可）→ 4. 注目の変化（増加数・伸び率（起点1,000以上）・減少の最大）→ 5. Star の増減の一覧（各行に「10/21→10/29（8日間）」）→ 6. 更新・保守（最終pushの分布・直近のリリース・1年超・アーカイブ）→ 7. 過去の観測記録（Watch。たたんで表示し「観測時点のタグ（現在の最新とは限りません）」）→ 8. データの読み方
  - 「更新が止まっています」の表示は、**自前のデータが古いときだけ**。Watch だけが止まっていても通常のレポート
  - 静的なページなので、閲覧した時点でデータが48時間より古ければ、ブラウザで警告を出す（`src/components/data-age-notice.tsx`）
- **トップページ**：Watch の「更新停止中」の枠をやめ、自前のレポートの取得日時・比較できた件数・最大の増加を表示
- **詳細ページ**：Watch の観測が72時間より古いときは「GitHubの最近の観測」として出さず、日付つきの「過去の観測記録」としてたたんで表示（観測時点のタグは「現在の最新とは限りません」と明記）
- **公開データ**：`scripts/build-data.mjs` が `github_checked_at` を `public/data/tools.json` に出すようにした（次回の毎日の更新から反映。反映までは期間の終了日で代える）
- Watch のデータ・取り込み・テストは削除していない

## 3. 変更したファイル

| ファイル | 内容 |
| --- | --- |
| `src/lib/own-changes.ts`（新規） | 自前のデータによる変化エンジン |
| `src/lib/own-changes.test.ts`（新規） | 回帰テスト11件 |
| `src/components/data-age-notice.tsx`（新規） | 閲覧時点でのデータの古さの警告 |
| `src/app/changes/page.tsx` | 8つの構成に作り直し |
| `src/app/changes/changes.module.css` | 一覧・分布・スマホ向けのスタイル |
| `src/app/page.tsx` | トップの変化レポートの枠を自前のデータに |
| `src/components/watch-signal-panel.tsx` | 古い観測を「過去の記録」としてたたむ |
| `src/lib/tools.ts` | `github_checked_at` の型 |
| `scripts/build-data.mjs` | `github_checked_at` を公開データに出す |
| `e2e/changes-trending.spec.ts` | 新しいページの検査・トップとの日時の一致 |
| `docs/changes-report-rebuild-20261030.md`（新規） | この文書 |

## 4. データの取得・更新の構造

```
[既存・毎日 03:00 JST] .github/workflows/update-data.yml   ← 新しい定期実行は追加していない
  ├─ scripts/fetch-github-api.mjs  GitHub API（持ち回りで約1/4ずつ）→ data-source/tools.json
  │     stars_num / last_commit(pushed_at) / github_archived / latest_release_at / github_checked_at
  ├─ scripts/build-data.mjs
  │     star-history.json に追記（Star が変わったときだけ）→ star_gain_7d・star_gain を計算
  │     → public/data/tools.json（＋github_checked_at）・meta.json（stars_as_of）
  └─ scripts/fetch-osswatch-signals.mjs  （best effort。Render の Watch。止まっても他に影響しない）
        → public/data/osswatch-signals.json（過去の観測記録）・osswatch-status.json

[ビルド時] src/lib/own-changes.ts  buildOwnReport(tools, {starsAsOf})
  → /changes/（主）・トップの枠
[ビルド時] src/lib/watch-changes.ts buildActivityReport(...)
  → /changes/ の「過去の観測記録」・詳細ページのたたんだ記録
[閲覧時] data-age-notice.tsx  取得日時が48時間より古ければ警告
```

## 5. 未解決の課題

- `github_checked_at` は次回の毎日の更新から公開データに入る。それまでは「7日以内に取得」が実際より少なく出る（今の公開データでは 380／389。期間の無い9件は取得日が分からないため）
- `latest_release_at` はプレリリースを除いていない（取得側の仕様）。ページでは「プレリリースを含む場合があり」と明記した
- `last_commit` は GitHub の pushed_at（どのブランチへの push でも更新される）。「最終コミット」と呼んできた既存の表示との用語の統一は別の作業
- 出来事（アーカイブ化・新しい安定版・更新の再開）の検知は、前回と今回の検証済みスナップショットが必要で、未実装（→第2段階）
- Watch（Render）の停止の原因は調べていない（サービスの削除・再起動はしていない）
- 本番の表示は未確認（ローカルのビルドと e2e のみ）

## 6. 第2段階の設計案（未実装・未デプロイ）

### 推奨：既存の毎日の更新に足す（追加の定期実行なし・追加のサービスなし）

`update-data.yml` はすでに毎日、GitHub API から各ツールを取得している。その取得の結果を使えば、新しいリクエストはほぼ要らない。

1. **前回の状態の保存**：`data-source/repo-state.json` に、ツールごとの「最後に検証できた値」（`archived`・`pushed_at`・最新の安定版のタグ名と公開日・取得日時）を1行ずつ保存
   - 安定版のタグ名：`fetchReleaseInfo` が取得済みのリリースの一覧から、`prerelease:false`・`draft:false` の最新を選ぶ（追加のリクエスト0）
2. **出来事の判定**：同じツールの「前回の検証済みの値」と「今回の検証済みの値」がどちらもあるときだけ比べる
   - 安定版のリリース：タグ名が変わった（公開日も記録）
   - アーカイブの変化：`archived` が false→true／true→false
   - 新しい push の観測：`pushed_at` が進んだ（365日以上止まっていたものが進んだら「更新の再開を観測」）
   - 長期の停止：`pushed_at` から365日を超えた最初の取得（状態の変化として1回だけ）
   - 取得に失敗した回は比較しない（値を引き継がない）
3. **履歴**：`data-source/change-events.json` に出来事を追記（ツール・種類・前回の値・今回の値・前回と今回の取得日時・出典URL）。400日で古いものを落とす（`pruneHistory` と同じ方針）
4. **週次レポート**：`/changes/weekly/2026-w44/` のような静的ページを、`change-events.json` からビルド時に作る（新しい定期実行は不要。毎日のビルドで、終わった週のページが固まる）

費用：0円（既存の実行の中。GitHub API のリクエストの増加はほぼ0）。Actions の実行時間の増加は数秒の見込み（未測定）。

### 代案：Cloudflare Workers の Cron と D1

既存の実行で足りない場合（例：重点OSSを1時間ごとに見たい）の候補。**以下の上限は 2026-10 時点の公開情報の要確認の値で、OSSALT では検証していない。**

| 項目 | 無料プランの目安（要確認） | この用途での見込み |
| --- | --- | --- |
| Workers のリクエスト | 1日10万 | Cron 1日24回なら問題にならない |
| 1回の実行の外部リクエスト（subrequest） | 50 | 389件を1回では回せない。重点OSSを20〜40件に絞るか、件数で分ける |
| CPU 時間 | 1回10ms | JSON の解析が中心なら収まる見込み（未測定） |
| D1 の保存容量 | 5GB | 出来事の履歴は数MBの見込み |
| D1 の書き込み | 1日10万行 | 重点40件×24回でも約1,000行 |
| GitHub API | トークンありで1時間5,000 | 重点40件×1〜2リクエスト×24回で約2,000／日 |

必要になるもの：GitHub のトークン（Workers の secret）、D1 のスキーマ（`repo_state`・`change_events`）、静的サイトへの受け渡し（ビルド時に D1 の公開用の書き出しを読む、など）。データの移行は、`repo-state.json`／`change-events.json` を D1 に1回だけ取り込む形。

**判断**：まず既存の毎日の更新に足す案で十分。Workers は、毎日より細かい観測が必要になったときに検討。どちらも、デプロイと定期実行の有効化は承認を得てから。

## 7. Site Quality Gate に移せる検査のルール

| ID | ルール | 今回の実例 |
| --- | --- | --- |
| FRESH-1 | 表示するデータには「取得日時」を付け、「生成日時」と分けて示す | 取得 10/30 07:13 とページの生成を別の行に |
| FRESH-2 | 取り込みの成功と、元データの新しさを別に判定する | Watch は取り込み成功でも元データは10/16 |
| FRESH-3 | 静的なページは、閲覧した時点での古さを確かめる | `data-age-notice.tsx` |
| FRESH-4 | 古いデータを「最近」「最新」「現在」と表示しない | 詳細ページの「GitHubの最近の観測」をたたむ |
| FRESH-5 | 1つの外部の情報源が止まっても、ページ全体を止めない（主と従を分ける） | 主＝自前、従＝Watch |
| CONS-1 | 同じ指標の日時は、ページの間で一致させる | トップと /changes/ の取得日時（e2e） |
| CONS-2 | 一覧に同じ対象を重ねて出さない（id と正規化したURLの両方で） | `normalizeRepo` |
| CONS-3 | 表示の値は、元データ（公開の JSON）に戻って確かめられる | 「元データ（tools.json）」へのリンク |
| HONEST-1 | 比較の基準が無いものは「比較不可」。0 として数えない | `notComparable` |
| HONEST-2 | 差分には、比較した開始日・終了日・日数を必ず付ける | 「10/21→10/29（8日間）」 |
| HONEST-3 | 1時点の値から出来事を作らない。出来事には前回と今回の検証済みの値が要る | リリースは「公開日が直近」の状態として表示 |
| HONEST-4 | 将来の日時・不正な値・負の数を捨てる | `validInstant`・`validWindow` |
| HONEST-5 | 小さな母数の率で順位を付けない（下限を明示） | 伸び率は起点1,000以上 |
| HONEST-6 | 古い観測のタグ・バージョンは「観測時点」と明記する | 「観測時点のタグ（現在の最新とは限りません）」 |
| REG-1 | 判定の関数は純粋関数にし、境界（7日・10日・48時間・5分）をテストで固定する | `own-changes.test.ts` |
| REG-2 | 変更したページは、スマホ幅で横スクロール0・コンソールのエラー0を確かめる | e2e |
