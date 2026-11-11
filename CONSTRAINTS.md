# Constraints（OSSALT）

最終確認: 2026-11-11（既定ブランチ 9f1a1ef 時点の実測）

このファイルは、**今ある検査と決まりを、そのまま書き出したもの**です。新しい基準は作っていません。
変更を通すために、このファイルを弱めません。弱める変更は、理由と、オーナーの明示の承認をPRに書きます。
（考え方は agent-skills の constraint-driven-development。基準を「決めて、書いて、弱めていないか見る」。）

## Floor（いつでも守る）
- テストを、理由なしにスキップ・削除しない。現在のスキップ 2件は、理由のある条件付き（`e2e/for-you.spec.ts`＝機能フラグが無効なビルド、`e2e/sweep.spec.ts`＝`E2E_SWEEP` 未設定）。
- 型・検査の抑制コメント（`@ts-ignore`、`eslint-disable` など）を、理由なしに増やさない。現在、含むファイルは 3。
- 未実装のスタブ、空の `catch` を入れない。
- 秘密情報、Search Console の数値、個人情報を入れない（リポジトリは公開）。
- このファイルの基準を、変更を通すために弱めない。

## 保護パス（SEOの公開ゲートと、その土台）
変更するPRは、**強化であること**の説明と、オーナーの明示の承認が必要です。緩める・削除する・条件を狭める変更はしません。

| 区分 | パス |
|---|---|
| 公開前のゲート | `.github/workflows/deploy-pages.yml`（サイトマップ・重要ページの確認を含む） |
| 公開後・定期の確認 | `.github/workflows/production-seo-check.yml`、`seo-weekly.yml` |
| PRの検証 | `.github/workflows/e2e.yml` |
| 検査スクリプトとテスト | `scripts/sitemap-check*`、`scripts/seo-build-diff*`、`scripts/seo-audit*`、`scripts/verify-production.mjs`、`scripts/count-audit.mjs` |
| 検索まわりの出力・設定 | `src/app/robots.ts`、`src/app/sitemap.ts`、`next.config.mjs`、`public/_redirects`、`ops/cloudflare/` |
| 検索まわりのE2E | `e2e/noindex-thin-tools.spec.ts`、`e2e/legacy-redirects.spec.ts`、`e2e/seo-revenue.spec.ts`、`e2e/sweep.spec.ts` |

## 数値で守る（今ある検査）
| 項目 | 基準 | コマンド | いつ |
|---|---|---|---|
| 単体テスト | 全件成功。件数を減らさない（現在 450件・71ファイル） | `npm test` | 手元、PR（CI） |
| ブラウザテスト | 全件成功 | `npm run test:e2e` | PR（CI） |
| サイトマップ・robots.txt | 問題 0件 | `node scripts/sitemap-check.mjs --dir out --site https://ossalt.jp` | マージ後の公開前（CI）。PRでは手元 |
| 重要10ページの index・canonical | 問題 0件。意図しない変更 0件 | `npm run seo:build-diff -- --before <旧out> --after out` | 同上 |
| 掲載件数の整合 | `--strict` で成功 | `node scripts/count-audit.mjs --strict` | 週次（CI） |

PRの段階では、サイトマップと重要ページの確認はCIで動きません（マージ後の公開前にだけ動く）。コンテンツや設定に触るPRは、手元で上の2つを実行し、結果をPRに書きます。

## 測るだけ（下げない）
- 単体テストのファイル数 71／ブラウザテストのファイル数 17／抑制コメントを含むファイル数 3／スキップ 2

## 例外
（なし。追加するときは、ID・対象・理由・担当・期限を書く）
