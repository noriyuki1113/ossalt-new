# OSSALT Growth & Monetization マスタープラン

作成：2026-10-09（Phase 0）／ 対象：https://ossalt.jp ／ 関連：[コンテンツ戦略](OSSALT_CONTENT_STRATEGY.md)・[Agent Council](OSSALT_AGENT_COUNCIL.md)・[収益戦略](OSSALT_REVENUE_STRATEGY.md)・[実装バックログ](OSSALT_IMPLEMENTATION_BACKLOG.md)

## North Star

**「日本でSaaSを見直すなら、まずOSSALTで比較し、導入の可否と費用を判断できる」**

5つの価値のうち、重点は **Decide（費用・リスク・難易度の判断）→ Deploy（導入・移行）→ Maintain（更新・セキュリティ）**。掲載件数ではなく、1件あたりの情報の価値を上げる。

優先の順序：ユーザー価値 → 信頼性 → 検索流入 → 導入支援 → 収益化 → 継続改善。

最重要指標は **月間の承認済み収益（円）**。ただし現時点では**計測不可**（A8.netの成果をこのシステムから取得できず、運営者の申告もない）。推測の値を実績として扱わない。

## 1. 既存システムの実態（監査で確認した事実）

| 項目 | 実態 | 確認の方法 |
|---|---|---|
| 本番のソース | `noriyuki1113/ossalt-new`（**公開リポジトリ**）。既定ブランチ `claude/ossalt-jp-setup-deploy-tsv3x8` へのpushで GitHub Pages に公開 | Actionsの実行履歴（10/7・10/8 成功）、Search Consoleで本リポジトリ固有のURL（/md/・/api/v1/）のクロールを確認 |
| `noriyuki1113/ossalt-next` | **未確認**（このセッションからアクセスできない） | GitHub APIが403 |
| 公開サイトの直接確認 | **未確認**（作業環境から ossalt.jp に接続できない） | プロキシが接続を拒否 |
| 構成 | Next.js 16 の静的書き出し（`output: "export"`, `trailingSlash`）＋ GitHub Pages ＋ Cloudflare。**サーバー・DBなし** | `next.config.mjs`、`package.json` |
| 依存 | next / react / react-dom のみ（開発用に gray-matter, marked, typescript） | `package.json` |
| データ | `data-source/tools.json` → 毎日3:00 JST に GitHub API・OpenSSF Scorecard 等を取得（`scripts/fetch-github-api.mjs`）→ `scripts/build-data.mjs` → `public/data/*.json` | `.github/workflows/update-data.yml` |
| DB | **使っていない**。Supabaseに旧サイト（2026年7〜9月）のプロジェクトが残るが、現行コードに依存はない | コード検索、Supabaseのテーブル一覧 |
| 定期実行 | データ更新（毎日）、プレビュー画像・解説の点検・SNS下書き（毎週月曜）、解説の週次追加（Claudeの定期実行、毎週月曜）、月次レポート（毎月2日） | `.github/workflows/*.yml`、Routine |
| AI向けの提供 | MCPサーバー `mcp.ossalt.jp`（Cloudflare Workers）、`/api/v1/*.json`、`/md/*.md`、`/llms.txt` | `mcp/`、`src/app/api/`、`src/app/md/` |
| SEO | ページごとのmetadata・canonical・OGP、BreadcrumbList、FAQPage、サイトマップ、解説のない比較ページのnoindex、旧URLの転送 | `src/lib/seo.ts`、`src/app/sitemap.ts` |
| 計測 | Umami Cloud（Cookieなし）のカスタムイベント。**集計値はAPIキーがなく取得不可** | `src/lib/analytics.ts`、`affiliate-track.ts` |
| テスト | node:test（Phase 1後 93件、すべて合格）。型検査 tsc 合格。**ESLint は未設定** | `npm test`、`npx tsc --noEmit` |

### コンテンツの量（2026-10-09）

掲載ツール 389件（アーカイブ除く約377件）、手書き解説つきツール 133件、代替ページ 153件（全件解説つき）、カテゴリ 29件、比較 205組（解説つき98組、残りnoindex）、ブログ 14本（うち10本が予約投稿）、サイトマップ 688URL。

## 2. Phase 0で見つけた問題

| # | 問題 | 重大度 | 対応 |
|---|---|---|---|
| P1 | **VPSの紹介枠（アフィリエイト）が全ツールページに条件なしで出ていた**。GIMP・ShareX・FFmpeg など、サーバーを使わないツールにもVPSを勧めていた | 高（信頼・表示の適切さ） | Phase 1で修正（`src/lib/affiliate-context.ts`）。306/377ページに限定 |
| P2 | ツールページの構造化データが **OpenSSF Scorecard（自動の採点）を Review / Rating として出力**していた。Googleのレビューの指針に合わないおそれ | 高（SEO） | Phase 1で削除。根拠のない `operatingSystem: "Linux, macOS, Windows"` も削除 |
| P3 | 解説のないツールページ（約244件）がすべてサイトマップに入っている。比較ページと違い、薄いページの基準がない | 中 | Phase 2で基準を決める（Search Consoleのページ別の実績を見てから） |
| P4 | `/md/`・`/api/` が検索の対象になっている（Search Consoleで「クロール済み・未登録」） | 低 | 運営者がCloudflareで `X-Robots-Tag: noindex` を付ける（robots.txtでは塞がない） |
| P5 | クリックの計測に「どの枠から」の情報がなく、導線ごとの比較ができなかった | 中 | Phase 1で `placement` を追加 |
| P6 | 収益・アクセスの数値を、このシステムから取得できない | 中 | 運営者の手作業の記録の手順を文書化（[収益戦略](OSSALT_REVENUE_STRATEGY.md)）。数値は公開リポジトリに置かない |
| P7 | リポジトリが公開のため、管理用の情報（収益の実数など）を置くと公開される | 中 | 記録はテストで機械的に検査（`src/lib/council.ts`） |
| P8 | `site.ts` の紹介文が「導入難易度で比較できる」とうたうが、データに難易度の項目がない（UX担当の指摘） | 低 | Phase 2で文言の修正か、難易度の定義を検討 |
| P9 | 監査の初稿で、P1を「VPSの導線は0」と誤って記載した（UX担当・収益担当の独立評価で発見） | — | 修正済み。独立評価が機能した例として記録 |

## 3. 機能の一覧と、既存機能との重複の整理

| マスタープロンプトの機能 | 既存で使えるもの | 判断 |
|---|---|---|
| A. Cost Lab | なし（費用の情報は皆無） | **Phase 1で新規**（`/cost-lab/`） |
| B. Deployment Lab | ツール解説133件、ブログ。旧 `/guides/*-selfhost-vps` はツールページへ転送済み | **RESEARCH**：手順を実行して検証する環境が作業側にない。検証の体制を先に決める |
| C. Contextual Affiliate Engine | VpsRecommendation（PR表記・計測つき） | **Phase 1で改善**（文脈の判定を追加）。スペック要件のデータはないため、現段階は「サーバーで動かすか」の分類のみ |
| D. Content Intelligence | 毎日のデータ取得、解説の点検（content-check）、解説の週次追加、トレンド | **Phase 2〜3で拡張**（新規に作らない） |
| E. Internal Link Intelligence | FAQ・比較・代替・カテゴリの相互リンク | Phase 1はCost Labへの導線のみ。残りPhase 2 |
| F. Revenue Dashboard | なし | **REJECT（6役割全員）**。データの取得手段ができるまで作らない |
| Agent Council | なし | Phase 1は記録の形式とテストのみ（`docs/council/`、`src/lib/council.ts`） |

不要と判断したもの：crewAI・LangGraph・crawl4ai・markitdown の導入（既存のNode.jsのスクリプトとClaudeの定期実行で足りる。依存を増やさない）、新しいDB（静的サイトとJSONで足りる。旧Supabaseは使わない）。

## 4. 収益化の全体像（詳細は収益戦略）

1. **国内VPSのアフィリエイト（A8.net）**：サーバーで動かすツールのページと、Cost Labの結果で、文脈に合うときだけ紹介する。並びは最低月額の安い順（報酬額で並べない）。
2. **AdSense**：12月に、流入の実数と「Cookieを使わない」方針のトレードオフを見て判断（RESEARCH）。
3. **スポンサー**：流入が増えるまで見送り（REJECT）。

## 5. フェーズ計画

| Phase | 内容 | 状態 |
|---|---|---|
| 0 | 監査、6役割の独立評価、設計ドキュメント | **完了**（このドキュメント群） |
| 1 | 重大な問題の修正（P1・P2）、Cost Lab MVP、導線、計測（placement・Cost Labのイベント）、評価の記録の基盤、テスト | **完了**（PRで確認待ち） |
| 2 | インデックスの基準（P3）、内部リンク、OSSの更新の監視（ライセンス変更の検知から）、保留中のOSS 20件の扱い、導入ガイドの検証の体制の検討 | 未着手（Phase 1の承認後） |
| 3 | Agent Council の運用（候補の作成→6役割の評価→下書き→事実確認→人の承認） | 未着手 |
| 4 | 日次の自動運用（候補の提示、エラー・コストの監視、手動停止） | 未着手 |
| 5 | 収益の分析と改善（データの取得手段の確保が前提） | 未着手 |

具体的なタスクと受け入れ条件は [実装バックログ](OSSALT_IMPLEMENTATION_BACKLOG.md) を参照。
