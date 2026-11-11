# OSSALT（ossalt.jp）— エージェント向けの規則

入口だけを書く。詳細は各文書（ここに規則を複製しない）。長くしない（目安 60行・3KB）。

## 先に読む
- 弱めてはいけない基準と、保護するファイル: `CONSTRAINTS.md`
- SEO運用・承認の規則: `agency/AGENCY.md`、`.claude/skills/ossalt-seo/SKILL.md`
- 解説の検証: `docs/verification-guide.md`、`docs/content-writing-guide.md`
- レビュー・テストの観点: `docs/review-checklist.md`、`docs/testing-guide.md`

## コマンド
- 単体テスト: `npm test`（全件成功が前提）
- ビルド: `NEXT_PUBLIC_FEATURE_FOR_YOU=1 npm run build`
- 公開前の確認（読み取り専用）:
  - `node scripts/sitemap-check.mjs --dir out --site https://ossalt.jp`
  - `npm run seo:build-diff -- --before <変更前のout> --after out`
- E2E: `npm run test:e2e`（PRでは CI が実行する）

## 必ず守る
- SEOの公開ゲートを、変更・削除・弱体化しない。
- title・canonical・robots・sitemap・公開ページを、オーナーの承認なしに変えない。
- 事実は公式の一次情報で確認する。確認できないことは「未確認」と書き、推測で補わない。実機で動かしていないものを「実機検証済み」と書かない。
- このリポジトリは公開。Search Console の数値・秘密情報・個人情報を書かない。
- 新しい定期実行の GitHub Actions、有料API、LLM API を増やさない。
- PR は依頼されたときだけ作る。main への push、マージ、本番デプロイは、オーナーの明示の承認後だけ。

## 進め方
- 変更は小さく、目的ごとに分ける。データ・台帳などの自動生成物の大きな差分は、意図で確認する。
- バグ修正は、先に失敗するテストを書く（`docs/testing-guide.md`）。
- テストや検査を、スキップ・削除・条件の緩和で通さない。
- 実行していない確認は「未実行」と書く。成功を、確認する前に報告しない。

## 参考
考え方は agent-skills（https://github.com/addyosmani/agent-skills 、MIT）の context-engineering・constraint-driven-development・code-review-and-quality・test-driven-development を、OSSALT向けに短くしたもの。上流の `AGENTS.md`（スキルを必ず使う運用）は採用していない。
