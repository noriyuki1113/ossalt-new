# 検索表示の前後比較の計画（2026-11-25 以降の再分析）

目的：検索表示の急減（10/30 以降）の原因を断定することではなく、**同じ条件の数値で前後を比べられる状態にしておく**こと。このファイルに Search Console の数値は書かない（数値は Git 管理外の `agency/data/baselines/` と `reports/seo/` にだけ置く）。

## 1. 比べるもの
| 項目 | 取得元 | 道具 |
| --- | --- | --- |
| 日別のクリック数・表示回数・CTR・平均掲載順位 | 画面のエクスポート（日付ごとの表）／API（`dates.csv`） | `seo-baseline.mjs` の `compare`・`daily` |
| ページ別の検索表示回数 | `ページ.csv`／API（`pages.csv`） | 同上（`gsc-compare-lib` の条件チェックを通ったものだけ） |
| 主要な検索クエリ | `クエリ.csv`／API（`queries.csv`） | 同上（1000行の上限に達した表は、全件として扱わない） |
| インデックス登録状況（取得できた範囲） | 画面の「ページのインデックス登録」のエクスポート（チャート・表）／URL検査 API | `compare --index-before/--index-after`、`gsc-api-fetch.mjs --inspect` |
| サイトの構造（index 対象・サイトマップ・title・canonical） | ビルド結果（`out/`） | `seo-baseline.mjs site-snapshot` |
| 期間中に本番へ入った変更 | git のログ（データの自動更新を除く） | `compare` が自動で付ける |

## 2. 同じ条件（前後で必ずそろえる）
- **プロパティ**：`sc-domain:ossalt.jp`（ドメイン）。登録時に `--property` で記録する。違う（または未記録の）ときは、数値を比べない。
- 検索の種類：ウェブ／国：絞り込まない／デバイス：絞り込まない／**クエリのフィルタ：かけない（ブランド検索の除外もしない）**
- 期間：**絶対日付**で指定する（「過去28日間」「過去3か月間」は使わない）。前と後は**同じ長さ**で、**重ならない**こと
- 画面の表は最大1000行。上限に達した表は、「新たに出た」「出なくなった」を断定しない

## 3. 推奨の期間
GSC のデータはこのプロパティでは **2026-10-26 から**しか存在しません（日別の表の最初の日。10/27 のドメインプロパティ追加が関係している可能性があります＝仮説）。
| 区分 | 前 | 後 | 取得できる日 |
| --- | --- | --- | --- |
| **第1回（11/25 以降）** | 2026-10-26〜2026-11-08（14日） | 2026-11-09〜2026-11-22（14日） | 11/25 以降（最終日の約3日後から確定） |
| 第2回 | 2026-10-26〜2026-11-22（28日） | 2026-11-23〜2026-12-20（28日） | 12/23 以降 |
| 保管済みの基準 | `baseline-20261102`（2026-10-26〜2026-11-02、8日） | — | 取得済み（Git管理外） |

日別の推移だけなら、1つのエクスポート（10/26〜11/22）を2つの同じ長さに分けて比べられます（`daily`）。ページ別・クエリ別は、**期間ごとに別のエクスポート**が必要です。

## 4. 手順
### 4-1. エクスポート（画面。iPhone はデスクトップ表示）
1. Search Console → プロパティ `ossalt.jp` → 検索パフォーマンス → 日付：カスタム（上の期間）／検索の種類：ウェブ／他の絞り込みなし
2. 右上「エクスポート」→ CSV をダウンロード（ZIP。`クエリ`・`ページ`・`デバイス`・日付ごとの表が入る）
3. 「ページ」→ インデックス登録 →「エクスポート」→ CSV（チャートと表）。**日付を指定できないため、取得した日を記録**（フォルダ名に日付を入れる）
4. 期間ごとに別のフォルダにして、このセッションに渡すか、手元で次を実行

### 4-2. 登録と比較
```bash
# 登録（期間・プロパティ・条件を meta.json に記録。上書きしない）
node scripts/seo-baseline.mjs register --export <フォルダ> --label before-1109 --from 2026-10-26 --to 2026-11-08 --property sc-domain:ossalt.jp
node scripts/seo-baseline.mjs register --export <フォルダ> --label after-1122  --from 2026-11-09 --to 2026-11-22 --property sc-domain:ossalt.jp
# サイトの構造（それぞれの時点のビルド）
npm run build && node scripts/seo-baseline.mjs site-snapshot --out-dir out --label 20261125
# 比較（出力は reports/seo/baseline/compare.md。数値を含むのでコミットしない）
node scripts/seo-baseline.mjs compare --before before-1109 --after after-1122 \
  --index-before <インデックス登録のフォルダ> --index-after <インデックス登録のフォルダ> \
  --site-before reports/seo/baseline/site-<前>.json --site-after reports/seo/baseline/site-<後>.json
```
### 4-3. API が使えるとき（任意）
- 認証：`GSC_ACCESS_TOKEN`（サービスアカウントの偽装で発行した約1時間の短命トークン。**鍵は発行しない**。チャットやログに貼らない）か `GSC_KEY_FILE`
- `GSC_SITE=sc-domain:ossalt.jp node scripts/gsc-api-fetch.mjs --days 28 --out agency/data/api-<日付>`：`queries.csv`・`pages.csv`・`pairs.csv`・`dates.csv`・`devices.csv`・`meta.json`（期間・条件・プロパティつき）を書く。そのまま `register` に渡せる
- URL検査：重要なURL（1行1件）のファイルを作り、`node scripts/gsc-api-fetch.mjs --inspect urls.txt`（1回200件まで）。結果は `agency/data/inspection-<日付>.json`
- 認証情報が無いときは、4-1 の画面のエクスポートだけで同じ比較ができます

## 5. 解釈の注意（レポートにも書かれます）
- このサイトは表示回数が小さいため、数十回の違いは偶然の範囲です。ページ別・クエリ別の順位の差は、両期間とも表示が30回以上のものだけ出します。
- 平均掲載順位（日別）は、日ごとの値を表示回数で重みづけした近似です。
- 原因は断定しません。サイトの変更・検索結果の変動・季節性・Google 側の変更が重なります。レポートの第7節に、同じ期間に入った変更を並べます。
- 変更を入れたら、`agency/ledger.json`（`seo-ledger.mjs add`）に日付・URL・内容を記録してください（数値は書けません）。
