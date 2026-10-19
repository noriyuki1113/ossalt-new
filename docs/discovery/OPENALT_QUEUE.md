# OpenAlternative 候補の確認キュー

作成：2026-10-19 ／ 処理：`scripts/discover-openalt.mjs`（本体：`scripts/discovery/openalt-run.mjs`、純粋関数：`scripts/discovery/openalt.mjs`、テスト：`scripts/openalt-queue.test.mjs`）／ 定期実行：`.github/workflows/openalt-queue.yml`（毎月1日 06:11 JST・手動）

## 1. 既存の仕組みとの関係（作り直していないもの）

| 既存 | 今回 |
|---|---|
| Cloudflare OSS Discovery（`scripts/discovery/lib.mjs`・`github.mjs`、`decisions.json`、データの形 `{value, source, fetched_at, status}`） | **そのまま再利用**。確認キューも同じ形・同じ GitHub クライアント（ETag・上限・停止）・同じ `decisions.json` を使う |
| `generate-openalt-candidates.mjs`（README → 候補の軽い一覧 `docs/openalt-candidates.*`） | 残す（手動）。ただし **README の解析は共通の関数に一本化**（同じ slug は最初の1件）。一覧の注意書きに「第三者の記載・未確認」を追記 |
| `enrich-openalt-candidates.mjs`（選んだ slug のページから公式リポジトリを補完） | 残す。ただしページの読み取りは共通の関数に一本化し、**リポジトリが複数ありあいまいなものは決めずに保留**、**掲載済みの公式リポジトリは名前が違っても止める**ように改善 |
| 「ツール追加」ワークフロー（`add-tools.yml`） | **掲載（公開）の唯一の入口として、そのまま使う**。今回は触らない |
| `data-source/tools.json`・`overrides.json` | tools.json には**書かない**。overrides の除外リストは尊重する |

## 2. 流れ

```
収集      OpenAlternative の README（約830件。GitHub の URL は載っていない）
  ↓
名前での重複  掲載済みの id・表示名・除外リストと一致 → 外す（skipped）
  ↓
公式リポジトリの手がかり  openalternative.co/<slug> のページの GitHub リンク
          1つ＝single／1位が2位の2倍以上＝majority（要確認）／それ以外＝ambiguous（決めない）
  ↓
公式リポジトリで確認  GitHub API：正式名・リポジトリID・SPDX ライセンス・スター・最終push・アーカイブ・説明・公式サイト
  ↓
公式リポジトリでの重複  owner/repo（大文字小文字・移転後の正式名）・GitHub のリポジトリID で掲載済みと照合 → 一致なら外す（listed_by_repo）
  ↓
確認キュー  data-source/discovery/openalt-queue.json（人向け：docs/discovery/openalt-queue.md）
  ↓
人の判断と下書き  data-source/discovery/decisions.json に state と、日本語説明・代替SaaS・カテゴリ・id を書く
  ↓
貼る行の作成  node scripts/export-approved.mjs → 条件を満たすものだけ「ツール追加」の1行になる
  ↓
掲載      Actions → ツール追加 → Run workflow に貼る（これだけがサイトに載る入口）
```

## 3. 外部の値を確認済みとして扱わない

- OpenAlternative の一覧に書かれた**ライセンス・スター数・説明・代替先は、すべて `claimed`**（`license_claimed`・`stars_claimed`・`description_claimed`・`replaces_claimed`）。
- `license`・`stars`・`archived`・`pushed_at` などは **GitHub API で取れたときだけ `api`**。取れなければ `unknown`（「無い」「非対応」ではない）。一覧の値で埋めない。
- 一覧と公式で食い違うものは注意として残す：`license_mismatch_with_list`（ライセンス表記が違う）・`stars_differ_from_list`（スターが3倍以上ずれる）。
- **掲載できない（blocking）**：`license_unknown`・`license_not_osi`・`archived`・`no_description`・`repo_ambiguous`（公式リポジトリを特定できない）・`repo_unverified`（GitHub で確認できていない）。承認（approved）しても、これが残っていれば貼る行には出ない。
- 注意だけ（止めない）：`repo_chosen_by_majority`・`stale_over_1y`（1年以上更新なし。掲載のおすすめとしては扱わない）。

## 4. 確認キューを使う手順（運営者）

1. **収集**：Actions → 「OpenAlternative候補の確認キュー」→ Run workflow（毎月1日にも自動）。1回に処理する新規の候補は既定 40件（`max_new`）。残りは次回に続く。
2. **一覧を見る**：`docs/discovery/openalt-queue.md`。状態は「確認待ち／止める問題あり」。
3. **判断を書く**：`data-source/discovery/decisions.json`（GitHub の画面で編集できる）。キーは `owner/repo`（小文字）。公式リポジトリが未確定なものは `openalt:<slug>`。
   ```json
   "acme/alpha": {
     "state": "approved",
     "id": "alpha",
     "competitor": "Notion",
     "category": "note-docs",
     "description_ja": "Notionの代わりに使える、オープンソースのノートアプリ。…",
     "note": "公式のREADMEで確認（2026-10-20）"
   },
   "openalt:gamma": { "state": "approved", "repo": "a/one", "id": "gamma", "...": "..." }
   ```
   - 公式リポジトリがあいまいなものは `repo` に正しい `owner/repo` を書く → 次の収集で GitHub API が確認する。
   - `state`：`approved`（掲載する）／`rejected`／`hold`。**approved と書いてもサイトには出ない**。
4. **公式で確かめること（人）**：ライセンスのファイル・更新状況・製品の用途（OSSALT に合うか）・SaaS の代替として説明できるか。日本語説明は公式の README・ドキュメントにもとづき、推測を書かない（`docs/content-writing-guide.md`）。
5. **貼る行を作る**：`node scripts/export-approved.mjs`（`--out file` でファイルにも）。足りない項目があれば一覧に理由が出る。
6. **掲載**：出力された1行を「ツール追加」に貼って実行 → 「GitHub Pages 公開」が続けて動く。

## 5. 上限・安全

- GitHub API は1回あたり最大300リクエスト（`max_requests`）。残りが50を切るか制限に当たったら止まる。ETag で変わっていないものは 304。
- openalternative.co へのアクセスは、1件ごとに間隔をあける（400ms）・タイムアウト12秒・再試行3回。1回あたり新規の候補数の上限で抑える。
- 同じ入力なら、出力のファイルは変わらない（冪等）。値が変わらない項目は取得日時も前回のまま。README の取得に失敗したときは前回の結果を消さずに失敗で終わる。
- AI は使わない。tools.json・サイトの表示は変えない。公開用の GitHub Pages ワークフローは動かない（`GITHUB_TOKEN` での push）。

## 6. 既知の制約

- **「非公開」の意味**：このキューは「サイトに公開されない」非掲載のデータで、`data-source/discovery/` に置く（`out/` には入らない）。**リポジトリが公開なら、ファイル自体は GitHub 上で閲覧できる**（Cloudflare 候補と同じ扱い）。含まれるのは第三者の一覧の記載と GitHub の公開情報だけで、秘密値は含まれない。完全に非公開にしたい場合は、別の非公開リポジトリに移す（別の設計）。
- 掲載データ（tools.json）には GitHub のリポジトリIDも移転前の名前も入っていないため、リポジトリの重複は「owner/repo ＋ GitHub が返す正式名」で確認する。ID での照合は、tools.json に ID が入れば自動で効く（`repoIdIndex`）。
- 製品の用途・OSSALT への適合・日本語説明・代替SaaS は、人が決める（自動では判定しない）。
- このセッションの作業環境からは、openalternative.co と GitHub API に接続できなかったため、**実際のページ・API での実行は未実施**。README の解析は実データ（831件）で確認し、確認の流れは偽のネットワークを使ったテストで確かめた。初回の実行は GitHub Actions で行い、結果（サマリ）を確認する。

## 7. 「変化レポート」「急上昇」の確認（2026-10-19）

| 項目 | 確認したこと | 対応 |
|---|---|---|
| `/trending/`（急上昇） | 元は `data-source/star-history.json`（毎日の取得。ツールごとに4日で一巡・最大3日前）。日次更新は毎日成功。**更新日の表示がビルドの日時で、データの取得日ではなかった** | `meta.json` に `stars_as_of`（最後に取得した日時）を足し、「◯日までに取得した最新の値」と表示 |
| `/changes/`（変化レポート） | 元は外部の OSS Intelligence Watch（Render）の配信。日次更新は毎日成功し「15件取り込み」と出ていたが、**配信元の生成日時が 2026-10-16 15:53 UTC のまま止まり、全15件の観測回数が1のまま（履歴が積み上がっていない）**。取り込み側はこれを黙って受け入れていた | ①取り込み時に、配信元が36時間より古ければ Actions の警告とサマリを出す ②ページに「更新が止まっている可能性」を表示 ③履歴蓄積中の行に、OSSALT 自身の毎日の記録による増加を「OSSALT記録」として**別の出典で**併記（Watch の値は書き換えない） |
| 配信元そのもの | Render 上の Watch の定期実行（別のプロジェクト）が止まっているとみられる | **この PR では直せない**。配信元の定期実行の確認が必要 |

## 8. 反映の順序・秘密値・DB

- **DB の移行は不要**（サイトは静的書き出しで、DB は使わない。データは `data-source/` のファイル）。
- **新しい秘密値は不要**。`DATA_FETCH_TOKEN`（あれば）または `GITHUB_TOKEN` を使う。ログやファイルにトークンは書かない。
- 順序：PR をマージ → 次の日次更新（データ更新）で `meta.json` に `stars_as_of` が入る → 「GitHub Pages 公開」で `/trending/`・`/changes/` に反映。確認キューは、マージ後に Actions から手動で1回実行してから使い始める。**本番（tools.json）への掲載は、確認と「ツール追加」の実行の後**。
