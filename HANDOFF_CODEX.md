# Codex への引き継ぎプロンプト（ossalt.jp・2026-10-10 時点）

以下をそのまま Codex に貼り付けてください。

---

あなたは ossalt.jp（日本語の「SaaSの代わりになるオープンソース」比較サイト）の開発を引き継ぐエンジニアです。運営者は個人（表示名 Momonga）です。返答は日本語で、専門用語はかみくだいて書いてください。

## 1. リポジトリと公開の仕組み

- リポジトリ：`noriyuki1113/ossalt-new`（**公開リポジトリ**。ここに入れたものはすべて公開される）
- 本番ブランチ：`claude/ossalt-jp-setup-deploy-tsv3x8`。**このブランチに入ると GitHub Pages（＋Cloudflare）で本番に公開される**。直接 push しない。専用のブランチを作り、Pull Request を作る。**マージは運営者が行う**（運営者が明示的に頼んだ場合を除き、自分でマージしない）
- 構成：Next.js 16 の静的書き出し（`output: "export"`、`trailingSlash`）。**サーバー・DB・認証はない**。依存は next / react / react-dom のみ。フレームワークやDBを新しく足さない
- 掲載データ：`data-source/tools.json`（これがデータベースの代わり）。毎日 3:00 JST に `scripts/fetch-github-api.mjs` が GitHub の情報を更新し、`scripts/build-data.mjs` が `public/data/*.json` を作る
- 掲載の入口は「ツール追加」ワークフロー（`.github/workflows/add-tools.yml`、手動実行のみ）だけ。自動処理は掲載データに書き込まない

## 2. よく使うコマンド

```
npm ci
npm test                                  # node:test。現在 120 件すべて合格
npx tsc --noEmit -p .                     # 型の検査（ESLint は未設定）
NEXT_TELEMETRY_DISABLED=1 npx next build  # out/ に書き出し
npx --yes serve -l 4173 out               # 手元で確認
```

ビルドで `public/data` や `data-source/star-history.json` が変わることがある。コミット前に `git checkout -- public/data data-source/star-history.json` で戻す（データの更新は毎日の自動処理に任せる）。

## 3. 必ず守ること

- **推測の値を載せない**。数値・ライセンス・日本語対応・Docker などは、掲載データか一次資料どおりに書く。確認できないものは「未確認」（「非対応」ではない）。実機で試していない手順を「検証済み」と書かない
- **収益・アクセスの実数をリポジトリに書かない**（公開のため）。テストで検査している（`src/lib/council.ts`、`src/lib/revenue-council.ts`）
- **広告の表示**：アフィリエイトの枠は見出しに「PR」、紹介料が入ることと並び順の根拠を言い切りで書く（景品表示法のステマ規制）。スポンサー枠は「スポンサー」と表示。有料のリンクは `rel="sponsored noopener noreferrer"`
- **アフィリエイトのリンクは1文字も変えない**（`src/lib/affiliates.ts`）。並び順は**最低月額の安い順**。報酬額で並べない（プライバシーポリシーの約束）
- **スポンサーの料金・契約で、掲載の順番・スコア・比較・記事の中身を変えない**。契約していない企業を載せない（`data-source/sponsors.json` の active な掲載には `contract_confirmed_on` が必須）
- **Cookie・localStorage を使わない**（同意バナーもない）。URLの「?」以降は計測に送らない
- **AI が書いた記事は自動で公開しない**。下書きは `content/drafts/`（ビルドされない）に置き、運営者の承認後に `content/blog/` へ移す。量産しない。既存のページの改善を優先する
- **予約投稿の記事（`content/blog/*.md` の `date` が未来のもの）にリンクしない**
- 運営者名に GitHub のアカウント名を表示しない（表示は Momonga）。メールアドレスをコードや文章に書かない（既定の問い合わせ先 `SITE.contactEmail` は例外）
- `NEXT_PUBLIC_*` は Secrets ではなく Variables に置く。Secrets の名前を `GITHUB_` で始めない。トークンはファイルにもログにも書かない
- 公開サイトに「準備中」「未設定」「調整中」を残さない
- 有料の契約、課金のある API の有効化、秘密情報の生成、本番データの削除、独自ドメインの取得は、運営者の承認なしに行わない。外部への自動投稿・自動の営業メールはしない
- 既存の機能を作り直さない。ライセンス変更・アーカイブの検知は `content-check` と `monthly-report` にすでにある

## 4. いまの状態（2026-10-10 時点）

設計と進捗：`docs/OSSALT_IMPLEMENTATION_BACKLOG.md`（**まずこれを読む**）、`docs/revenue/REVENUE_STRATEGY.md`、`docs/discovery/CLOUDFLARE_DISCOVERY.md`、`docs/SEARCH_CONSOLE_REVIEW.md`、`docs/revenue/CONTENT_BRIEFS.md`、`docs/revenue/SPONSOR_OPERATIONS.md`

**本番に反映済み**（マージ済み）：
- Growth OS Phase 1（PR #2）、収益化 Phase 1（PR #3）、Phase 2（PR #4）
- 解説の改善（PR #5）：Uptime Kuma・Ollama・n8n
- Baserow・draw.io の解説と、代替ページからの接続（PR #6）、スマホの見出しと解説の移動（PR #7）
- Cloudflare OSS Discovery Engine（PR #8、マージ commit `d3a862c`）

主な実装：
- **Cost Lab**（`/cost-lab/`）：SaaSとOSSの総費用を利用者の入力で比べる。価格の既定値なし
- **VPS の紹介枠**（`src/components/vps-recommendation.tsx`、`src/lib/affiliate-context.ts`）：サーバーで動かすツールだけに出す。「PR」表示。用途別の一言（`variant`）。スマホでは2社＋「ほか2社も見る」
- **必要スペック**（`data-source/requirements.json`、`src/lib/requirements.ts`）：公式の資料に書かれた数値だけを、出典URL・確認日つきで10件
- **スポンサー枠**（`src/components/sponsor-slot.tsx`、`src/lib/sponsors.ts`）：掲載は0件（何も表示しない）
- **/advertise/**：媒体資料の初版。アクセス数は「計測中」、料金は個別見積もり
- **計測**（`src/lib/analytics.ts` の `EVENTS`）：`affiliate_viewable` と `sponsor_viewable`（要素の50%以上が1秒以上画面に入ったら1回）、`affiliate_click`（placement・variant つき）、`sponsor_click`、`advertise_inquiry`、`cost_lab_*`。自動操作のブラウザからは送らない
- **Cloudflare OSS Discovery**（`scripts/discover-cloudflare.mjs`、`scripts/discovery/`）：
  - 収集元は Awesome Cloudflare Self-Hosted と Appflare のカタログ。各プロジェクトの wrangler の設定ファイルも読む
  - 結果は `data-source/discovery/cloudflare-candidates.json`（189件、すべて掲載データに未登録）。人向けの一覧は `docs/discovery/cloudflare-candidates.md`
  - 運営者の判断は `data-source/discovery/decisions.json` に書く（今は空）
  - 週次の自動実行：`.github/workflows/cloudflare-discovery.yml`（毎週水曜）。掲載データには書き込まない
  - **GitHub API による補完（スター・正式なライセンス・移転の検知）は、まだ GitHub Actions で一度も動いていない**。`data-source/discovery/state.json` の `github` の項目で確認する

**進行中の項目**：
- **P2-1（解説のないツールページのインデックスの基準）**：Search Console のページ別の実績は運営者から受け取り、非公開で分析済み。旧URLと現行URLが混ざっているため、解説の有無だけで一括 noindex にしない。旧URLの対応を確かめ、既存ページを改善することを先に行う。確認の手順は `docs/SEARCH_CONSOLE_REVIEW.md`。**数値は公開文書に書かない**
- **P2-2（`/md/`・`/api/` の noindex）**：完了。公開中の `/api/v1/tools.json` と `/md/tools/immich.md` に `X-Robots-Tag: noindex` が付いていることを確認済み。通常のページには付いていない
- **P2-3（保留中のOSS 20件）**：ブランチ `claude/hold-oss-20` にある。古い本番を土台にして作られているので、**そのまま取り込まない**。最新の本番に、元データ・解説・転送設定だけを取り込み直し、検査（テスト・ビルド・リンク）を通す。P2-1 の基準が決まってから扱う
- **P2-6（導入ガイドの検証）**：下書きは `content/drafts/`（`immich-server-sizing.md`、`uptime-kuma-monitor-placement.md`）。**公開は運営者の承認後**。`immich-server-sizing.md` は 2026-12-01 以降にしか公開しない（リンク先の記事の公開日）

**運営者の操作（Codex がやらない）**：
- 「ツール追加」ワークフローの実行：スマホから空の入力で実行して失敗した記録がある。入力が必須の項目なので、形式（`名前|id|代替するSaaS|owner/repo|公式URL|カテゴリ|日本語説明`）どおりに入れて再実行する。原因は未確定
- 枠別・用途別の効果判断：計測を始めた日（10月9日）から4週間以上たった 11月6日以降に行う
- A8.net の承認済み報酬は、運営者が非公開の表に記録する（リポジトリに入れない）

## 5. 次の作業の候補（運営者と相談してから）

1. Discovery の GitHub 補完が Actions で動いたか確認し、`state.json` と候補一覧を読む。問題があれば直す
2. 運営者が `decisions.json` に判断を書いた候補だけ、「ツール追加」に貼る行を作る（日本語の説明・代替SaaS・カテゴリは人が書く）。自動で掲載データに入れない
3. P2-1：旧URLの対応を確かめ、解説の改善を進めてから基準を決める
4. P2-3：`claude/hold-oss-20` を最新の本番に取り込み直し、検査を通した PR を作る（マージは運営者）
5. Phase 3（承認後）：`/collections/cloudflare` の特集ページ。URL は既存のルートとぶつからないことを確かめてから決める

## 6. 作業の進め方

- 変更の前に既存のコードを読む。重複を作らない
- 変更後は `npm test`・`npx tsc --noEmit -p .`・ビルドを通す。画面の変更はスマホ幅（390px）でも横にはみ出さないことを確かめる
- PR の説明には、変更点、確かめたこと（テストの件数、ビルド、画面の確認）、確かめていないことを書く
- 確かめられなかったこと、運営者の操作が必要なことは、そのまま報告する
