# OSSALT SEO Agency — 実行手順書

1人のClaude Codeエージェントが、5部門（Strategist / Writer / Linker / Technician / Analyst）を**順番に**切り替えて動かす、承認制のSEO運用です。公開・マージ・設定変更は、オーナーの承認があるまで行いません。すべて手動で実行します（定期実行のGitHub Actionsはありません）。

| 道具 | 役割 | 必要なもの |
| --- | --- | --- |
| `node scripts/seo-agency.mjs` | GSCのCSV → 候補と採点の週次レポート（未取得なら「未取得」のレポート） | CSV（任意） |
| `node scripts/seo-audit.mjs` | ビルド済みサイトのテクニカルSEO・内部リンクの監査（読み取り専用） | `npm run build` の `out/` |
| `node scripts/seo-links.mjs --target <パス>` | 内部リンクの候補（データ上関連するのに未リンクの実在ページ） | `out/` |
| `node scripts/seo-ledger.mjs add\|due\|record\|render` | 変更履歴と、28日・約90日の確認期限 | なし |
| `node scripts/gsc-weekly-report.mjs` | 既存：1本のCSVの簡易アクションプラン（`seo-agency.mjs` が読み込みを共有） | CSV |

テスト：`npm test`（SEO関連は `scripts/seo-*.test.mjs` と `scripts/gsc-weekly-report.test.mjs`）。

## 1. まず、データ無しでできること
```bash
npm run build
node scripts/seo-audit.mjs --out agency/reports/audit.md          # 直す必要がある事実 / 影響範囲を見てから判断するもの
node scripts/seo-links.mjs --target /alternatives/notion/          # 例：代替ページへの内部リンク候補
node scripts/seo-agency.mjs --out agency/reports/weekly.md        # CSVなし → 「未取得」のレポートと、取得手順
node scripts/seo-ledger.mjs due                                    # 確認期限を過ぎた項目
```
`agency/reports/` と `agency/data/` は .gitignore 済みです。**このリポジトリは公開されています。Search Console のデータ・認証情報・数値を、コミットやPRの説明に書かないでください。**

## 2. Search Console のデータを取り込む
1. Search Console（`ossalt.jp` のプロパティ）→ 検索パフォーマンス → 検索の種類「ウェブ」→ 直近3か月（取得できる範囲）。
2. クエリのフィルタでブランド検索（`ossalt` の表記ゆれがあれば追加）を除外し、**同じ条件で**エクスポートする。
   - クエリ別：`agency/data/queries.csv`
   - ページ別：`agency/data/pages.csv`
   - 可能なら、クエリ×ページ：GSCの画面でページの条件を完全一致で指定し、クエリ別の表をエクスポート。URLとクエリの対応が実測できるのは、これだけです（`agency/data/pairs.csv`、列は クエリ・ページ・クリック数・表示回数・CTR・掲載順位。Looker Studio や API 経由のエクスポートで得られる）。
3. 実行：
```bash
node scripts/seo-agency.mjs \
  --queries agency/data/queries.csv --pages agency/data/pages.csv [--pairs agency/data/pairs.csv] \
  --period "2026-07-01〜2026-09-30（Web・非ブランド）" --pages-nonbrand-confirmed \
  --site out --out agency/reports/weekly-2026-10-27.md
```
- `--pages-nonbrand-confirmed`：GSCの画面でページ別CSVにもブランド除外を適用した、という**あなたの申告**です。CSV単体では検証できないため、迷うときは付けない（レポートに「未確認」と出ます）。
- `--site out`：ビルド済みサイトと照合し、転送ページ（掲載をやめたURL）・noindexのページを改善の対象から外します。
- 対応する形式：UTF-8（BOMあり・なし）、UTF-16LE、カンマ・タブ・セミコロン区切り、日本語・英語の列名、引用符・引用符内の改行、`1,234`・全角数字。数値が不正・欠損の行は、値を補わず読み飛ばして件数を出します。
- 片方のCSVだけ、またはファイルが読めないときは、値を作らずに停止します（終了コード1）。

## 3. 5部門を順番に動かす
Claude Code に「`ossalt-seo` で週次の分析をして」と依頼します（Skill の各モードは `.claude/skills/ossalt-seo/SKILL.md`）。

1. **Strategist**：レポートと監査を読み、候補を最大（既存2件・新規1件）に絞って `STRATEGY` を書く（雛形：`agency/templates/STRATEGY.md`）。**ゲートB：オーナーが対象とクエリを承認するまで次へ進みません。**
2. **Writer**：承認された対象の `BRIEF` と `PAGE` の草案（`docs/content-writing-guide.md` に従う。一次情報だけを根拠にする）。
3. **Linker**：`seo-links.mjs` の候補から、本文を読んで自然なものだけを `LINKS` に。
4. **Technician**：`npm test`、ビルド、`seo-audit.mjs --strict`、前後の差を `TECH` に。
5. **Analyst（独立したレビュー）**：別の文脈で、PRの差分・根拠・テストを検証し、承認／修正を判断する。
6. **ゲートC：オーナーがPRをマージ**。公開したら `seo-ledger.mjs add` で記録（下記）。

## 4. 変更履歴と効果の検証
```bash
node scripts/seo-ledger.mjs add --date 2026-11-02 --url https://ossalt.jp/alternatives/notion/ \
  --query "notion 代替" --change "titleとdescriptionの見直し（根拠は PAGE）" \
  --pr https://github.com/noriyuki1113/ossalt-new/pull/50 --window "2026-08-01〜2026-10-31（Web・日本・全デバイス）"
node scripts/seo-ledger.mjs due                       # 28日・約90日の確認期限
node scripts/seo-ledger.mjs record --id 1 --stage 28 --outcome flat --note "他の変更なし"
```
- `agency/ledger.json` と `agency/LEDGER.md` に残すのは、日付・URL・クエリ・変更内容・PR・確認期限・結果の区分だけです。**数値は書けません**（数値らしき記述は拒否されます）。変更前後の数値は `agency/data/` に置いてください。
- 28日は初期の兆候、約90日は中期の方向性を見る計画上の目安です。Googleの固定ルールではありません。事実の誤りや技術的な不具合は、期限を待たずに直します。
- 比べるときは、同じ期間の長さ・検索の種類・国・デバイス・**完全一致のクエリとページ**で。サイト全体の平均順位を、個別のクエリの順位として扱いません。

## 5. 将来のSearch Console API連携
API連携は、この版では入れていません（認証情報が無いため）。追加するときは、APIの取得結果を `readGscExport` と同じ行の形（`{label, kind, query?, page?, clicks, impressions, ctr, position}`）にそろえれば、採点（`seo-priority.mjs`）とレポートはそのまま使えます。認証情報はリポジトリに入れず、環境変数かローカルの保管場所を使い、同じデータを何度も取得しないよう `agency/data/` に取得日時つきで保存してください。

## 6. 承認が必要なこと
本番へのデプロイ、PRのマージ、既存ページの削除、URLやcanonicalの大規模な変更、noindexやrobotsの変更、新しいキーワード戦略の確定、大量の新規記事、有料契約、外部への営業・リンク依頼。
