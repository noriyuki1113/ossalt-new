# Ranking Engine v2 / OSSALT For You

推薦エンジン（`src/lib/recommend/`）と、その画面 `/for-you/` の設計メモ。2026-10-27 作成。

## 1. 既存システムの調査（Phase 0）

| 項目 | 現状 |
| --- | --- |
| 構成 | Next.js 16（`output: export` の静的書き出し）。GitHub Pages で配信。サーバー・DB・ORM は無い |
| データ | `data-source/*.json` → `scripts/build-data.mjs` → `public/data/tools.json`（391件、うちアーカイブ9件）・`meta.json`・`categories.json` |
| 更新 | `update-data.yml`（毎日18:00 UTC）で GitHub API・OpenSSF Scorecard を取得。Star の実測は `data-source/star-history.json` |
| ランキング | `src/lib/rankings.ts`（人気・急成長・おすすめ。PR #40）。`/rankings/` に重みと根拠を表示 |
| 診断 | `src/lib/diagnosis*.ts`（5つのSaaS・手作業で確認した機能データ）。結果はURLのクエリだけで再現 |
| ライセンス | `classifyLicense`（7分類）・`licenseGroupOf`（4区分）。手動の上書きは `overrides.json` の patch |
| SaaS代替 | `/alternatives/<slug>/`（`alternative-decision.ts`、PR #43） |
| 認証 | なし |
| 解析 | Umami Cloud（`src/lib/analytics.ts`。イベント名は `EVENTS` に列挙） |
| テスト | `npm test`（node:test）、Playwright（`e2e/`、desktop と Pixel 7） |

### OSS Watch の定期更新

- `public/data/osswatch-status.json` の `feed_generated_at` は **2026-10-16** のまま。OSSALT側の取得（`last_result: ok`）は成功しているが、配信元（非公開リポジトリの Daily OSS snapshots）が止まっている。
- 原因は、以前に確認した GitHub Actions の利用枠（Billing）。**コードでは直せない**ため、今回は変更していない。運営者の Billing の操作、または VPS の cron への移行（Watch リポジトリ PR #15）が必要。
- 観測日での停止の検出は PR #39（未マージ）。マージすると、上の状態は `/changes/` で「停止」と表示される。

### 再利用・修正・新規・互換性

- **再利用**：`rankings.ts` の `buildPopularity`・`buildGrowth`・`freshnessPoints`・`releasePoints`、`diagnosis.ts` の `getDifficulty`、診断データ `TOOL_DIAGNOSIS`、ライセンスの `classifyLicense`・`licenseGroupOf`、`getCompetitors`・`getComparePairs`。
- **修正**：診断結果・ツール詳細・SaaS代替・比較の各ページに、For You への導線（機能フラグが有効なときだけ）。
- **新規**：`src/lib/recommend/`（推薦エンジン）、`/for-you/`、`/for-you/catalog.json`。
- **不要にしたもの**：なし（既存のランキング・診断の計算は変えていない。テスト10で、人気・急成長の結果が変わらないことを確認）。
- **互換性のリスク**：既存のURLは変更なし。`NAV` の項目は、機能フラグが有効なときだけ増える。

## 2. 推薦の流れ

xAI の X 推薦アルゴリズム（[xai-org/x-algorithm](https://github.com/xai-org/x-algorithm)、Apache-2.0）の「候補の取得 → 絞り込み → 複数の指標の加重和 → 多様性の調整 → 選択」という段階の分け方を参考にした。**コードは流用していない**（Rust・機械学習のモデルは使わない）。

| 段階 | ファイル | 内容 |
| --- | --- | --- |
| 1. 候補の抽出 | `candidate-generator.ts` | 選んだSaaSの代替（主な代替・編集部の追加指定）、診断データ、同じカテゴリの類似（人気順に最大12件）、関連カテゴリの人気・急成長の上位。ツールの id で1件にまとめ、取り方（sources）を記録 |
| 2. 適格性 | `eligibility-filter.ts` | 必須条件に「合わないと確認済み」のもの・公式の保守停止の告知があるものは、減点ではなく除外（理由つき）。未確認は除外せず注意にする |
| 3. 特徴量 | `feature-extractor.ts` | 用途の適合度・保守・セキュリティの確認情報・導入のしやすさを、それぞれ0〜100点にそろえる。確認できなければ null |
| 4. 採点 | `scoring-engine.ts` | 利用者のタイプ別の重みで加重和。null は中立の50点で計算し、根拠の確認率（evidence）を別に出す |
| 5. 多様性 | `diversity-ranker.ts` | MMR：点 − 15 × 選んだ候補との最大の類似度。用途の適合度が低い候補を高い候補より上げない。上位6件に小規模なOSSが無ければ、近い点の1件に枠を確保 |
| 6. 理由 | `explanation-builder.ts` | 採点に使った数値・判定から、決まった文面で理由と注意を作る（生成AIは使わない） |

重み（`ranking-config.ts`）：

| 項目 | 個人 | 企業・チーム | OSS初心者 |
| --- | --- | --- | --- |
| 用途・機能への適合度 | 45% | 35% | 35% |
| 保守・開発の状況 | 25% | 30% | 20% |
| セキュリティ関連の確認情報 | 10% | 25% | 10% |
| 導入・運用のしやすさ | 20% | 10% | 35% |

「重視すること」を選ぶと、その項目を1.6倍にしてから合計100%に割り戻す。成長性は合計に入れない（急成長ランキングで扱う）。

### 3種類のランキングとの関係

- **人気（Popular）・急成長（Trending）**：`/rankings/` のまま。For You では、候補の取り方と「直近30日でStarがN増えた（実測）」の理由にだけ使う。
- **おすすめ（Recommended）**：`/rankings/` のおすすめは、診断データのある5つのSaaSだけの、利用者によらない固定の重み。For You は利用者の条件で重みが変わる個別の推薦で、対象は掲載している全SaaS・全カテゴリ。

## 3. 段階公開（機能フラグ）

- `NEXT_PUBLIC_FEATURE_FOR_YOU=1`（GitHub の Variables）でビルドすると、ナビ・各ページからの導線・サイトマップに載り、検索エンジンに登録される。
- 未設定（既定）：`/for-you/` は開けるが、導線は出さず `noindex`、見出しに「試験公開」。
- 個人ごとに変わる結果は静的ページとして量産しない（`/for-you/` の1ページだけ。条件はクエリ）。

## 4. 将来の学習型推薦への備え

- 採点は `Scorer` 型（`scoring-engine.ts`）の関数として差し替えられる。`recommend(query, catalog, scorer)` の第3引数。
- 行動の記録は、Umami の集計イベント `for_you_update`（変えた項目の名前だけ）と `for_you_click`（押した順位だけ）の2つに限った。個人を特定する値・ツール名・条件の中身は送らない。保存や同意の仕組みを新しく作る前に、プライバシーポリシーの見直しが必要。

## 5. 未対応

- 「新しく掲載されたOSS」の候補：掲載日の記録が無いため未実装（Star の記録の開始日は、掲載日と一致するとは限らない）。
- ダークモード：サイト全体にダークモードの配色が無いため、For You だけには入れていない（色はすべて既存のトークンを使っているので、トークンに追加すれば反映される）。
- Smart Alternatives（Phase 3）：代替ページから For You への導線だけ。代替ページ内での並べ替えは未実装。
- Discovery Radar（Phase 4）・ウォッチリスト・学習型推薦（Phase 5）：未実装。
