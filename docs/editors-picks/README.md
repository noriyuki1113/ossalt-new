# EDITOR'S PICKS ― 発見した、すごいOSS。

スター数やランキングだけでは見つからない、技術的に面白いOSS・独創的な発想のOSS・将来性のあるOSSを、運営者の視点で選んで紹介する編集企画です。

> スター数だけでは見つからない、技術とアイデアの面白さ。

既存のOSSデータベース、ランキング、For You、比較機能とは**独立した編集コンテンツ**です。掲載候補を、既存のランキングデータへ自動で追加しません。

## 編集方針

- **主観的な推薦であり、客観的なランキングではない。** スター数の順位ではない。掲載は、技術的な優位性や安全性を保証しない。
- **確認した段階を分けて書く。** 確認していない段階は名乗らない（下の表）。
- **変わる情報には確認日を付ける。** バージョン、状態、日付など。確認できなかったものは「未確認」と書き、推測で補わない。取得したページが古いと分かったら、その情報は記事に書かない。
- **弱みを必ず書く。** 「気になる点」が空の紹介は載せない（`npm test` が検査する）。
- **OSSでないものは載せない。** ライセンスを確認できないもの、コードがOSSとして使えないものは除外する。一部だけOSS（Community Editionだけ、など）のものは、OSSでない部分を気になる点に書く。
- **運営者本人の体験・感想を創作しない。** 運営者が確認していない評価は「編集案」と明記し、承認待ちにする。承認前の特集は公開しない。
- **広告・スポンサー案件と、通常の編集選定を区別する。** 特集ごとに `sponsored` を持つ。`true` の特集は、記事の冒頭にその旨を出す。

## 確認の段階

| 段階 | 値 | 意味 | 必要な記録 |
|---|---|---|---|
| 公式情報確認済み | `official` | README・LICENSE・公式サイト・公式ドキュメントを読んで確認した。動かしていない | 確認日、出典のURL、何を読んで何を読んでいないか（note） |
| コード・実装確認済み | `code` | ソースコードの該当箇所を読んで確認した | 上に加えて、読んだ場所を具体的に（note） |
| 実機検証済み | `hands-on` | 実際に動かして確認した | 上に加えて、環境と手順を具体的に（note） |

実機で動かしていないものを `hands-on` にしない。既存の解説の「検証状態」（`docs/verification-guide.md`）と同じ考え方。

## データの置き場

| 場所 | 役割 |
|---|---|
| `data-source/editors-picks/<特集のid>.json` | 調査データ（OSSごとの事実、出典、確認日、確認の段階）。**記事より先に、ここを正とする** |
| `content/drafts/editors-picks-<特集のid>.md` | 記事の下書き。**ここにある間は公開されない**（サイトのビルドは `content/blog/` だけを読む） |
| `src/lib/editors-picks.ts` | 型と検証（純粋な関数）。`src/lib/editors-picks.test.ts` が、全データと下書きを検査する |

## 特集の種類（`issue.kind`）

第1弾は `roundup`。ほかの種類は、データ構造として使える形にしてあるだけで、**自動生成も定期公開もしない**。

| kind | 企画 |
|---|---|
| `roundup` | 〇選（第1弾：運営者が選ぶ、技術と発想がすごいOSS 10選） |
| `weekly-pick` | 今週の推しOSS |
| `monthly-five` | 今月の面白かったOSS 5選 |
| `idea` | 発想がすごいOSS |
| `want-to-try` | 開発者が試してみたいOSS |
| `hands-on-report` | 実際に動かして検証したOSS |

## 公開までの手順（運営者の承認制）

1. 調査データ（`data-source/editors-picks/<id>.json`）を、出典で確かめる。
2. 運営者が、「私が注目した理由」と「特に注目した3件」の文面を決める（第1弾は2026-11-11に指定済み）。公開の最終承認ができたら、`issue.editorial_status` を `approved` にする（承認済みの特集は、掲載する全件に運営者のコメントが必要）。
3. 記事に書いた事実を、公開の直前にもう一度、公式の情報で確認する（バージョンや状態は変わる）。
4. 下書きを `content/blog/` に移し、`date`（公開日）を決め、先頭の `draft_*` の項目を消す。
5. `npm test`、ビルド、`sitemap-check`、`seo:build-diff --after out` を通す。通ってから既定のブランチに入れる。

`publishBlockers()`（`src/lib/editors-picks.ts`）が、承認前・検証の不備を「公開不可」として返す。

## 公開スケジュール（運営者の指示・2026-11-11）

公開は急がない。**2026-12-09 は最短の候補日であり、公開の確定日ではない。**

| 日付 | こと |
|---|---|
| 2026-11-25 | Search Consoleの前後比較を確認する |
| 2026-12-08 | OSSALTの自動追加（4週間停止中。`docs/seo/auto-additions-pause-2026-11-10.md`）を再開するか判断する |
| 2026-12-09以降 | SEOと公開ゲートに問題がなければ、Editor's Picks第1弾を公開する（最短候補） |

- それまで、記事は **`content/drafts/` の下書きのまま保持する。**
- 記事を `content/blog/` に移すPRは、**Draft PR** で作る。`date` は公開日にし、`date` が未来の間はビルドに出ない（`src/lib/blog.ts`）。**mainへの直接push、公開につながるmerge、本番デプロイは、運営者の最終承認まで行わない。**
- `issue.earliest_publish`（`2026-12-09`）より前は、`npm run editors-picks:check -- vol1 --publish` が公開不可を返す。

## 公開直前の再確認（公開予定日の24〜48時間以内）

掲載する10件について、次を再確認する。**重大な問題が見つかったら、公開を延期する。** 再確認した日は、`data-source/editors-picks/vol1.json` の `verification.checked_at` に反映する（48時間以内でないと、`--publish` が公開不可を返す）。

1. リポジトリの存在と公式URL（移転・名称変更・アーカイブ）
2. 最新のREADME
3. ライセンスと適用範囲（Meilisearchのエディションごとの違い、Open MCTの LICENSE.md を含む）
4. 更新状況（最新リリース・最終コミット）
5. 記事中の技術的説明
6. 主な機能の変更・廃止
7. GitHubスター数などの変動情報（記事に書く場合は確認日つき。今の記事は書いていない）
8. OSSALTの既存記事との整合性（Meilisearchの詳細ページのライセンス表示など）
9. リンク切れ（外部リンク・内部リンク）
10. SEO公開ゲート（`sitemap-check`、`seo:build-diff`）

## ライセンス表記の確認結果（2026-11-11）

- **Meilisearch**：Community Edition＝MIT License、Enterprise Edition＝BUSL-1.1または商用ライセンス。公式のLICENSE（`MIT AND BUSL-1.1`）は両方の併存を示す。記事は、エディションによる違いを明記し、Enterprise Editionまでを無条件にOSSとして扱わない。根拠：https://github.com/meilisearch/meilisearch/blob/main/LICENSE
- **NASA Open MCT**：Apache License 2.0（LICENSE.md の本文で確認）。根拠：https://github.com/nasa/openmct/blob/master/LICENSE.md

## 公開前チェック（コマンド）

```
node --experimental-strip-types scripts/editors-picks-check.mjs vol1            # 公開までに残っていることを一覧する（読み取り専用）
node --experimental-strip-types scripts/editors-picks-check.mjs vol1 --publish  # 公開してよい状態でなければ終了コード1
```

見るもの：調査データの検証／運営者の承認（`approved`）／記事の場所（公開は `content/blog/`、下書き用の項目の削除、`date`）／記事に「編集案」「承認待ち」が残っていないこと／内部リンクの実在／確認日が14日より前でないこと。SEOの確認は別に行う：

```
NEXT_PUBLIC_FEATURE_FOR_YOU=1 npm run build
node scripts/sitemap-check.mjs --dir out --site https://ossalt.jp
npm run seo:build-diff -- --before <変更前のビルド> --after out   # 増えるのは記事の1ページだけのはず
```

## SNS

投稿文は `docs/sns/editors-picks/vol1.md`（X・Bluesky。告知1・注目3・問いかけ1）。投稿は運営者が手で行い、記事の公開後に出す。

## 構造化データについて

既存のブログ記事には、パンくず（BreadcrumbList）のJSON-LDはあるが、Article系の構造化データは無い。この特集のために、サイト全体の基盤は書き換えない。必要なら、既存の全記事に同じ形で入れる別のPRとして判断する。

## 第1弾で、OSSALTの既存データについて気づいたこと（このPRでは変更していない）

- Meilisearch：OSSALTの掲載は、ライセンスを「MIT」とだけ表示している。公式のLICENSEは `MIT AND BUSL-1.1` で、Enterprise Edition（シャーディングなど）は商用契約かBSL-1.1の条件。表示を直すかどうかは、別のPRで運営者が決める。
