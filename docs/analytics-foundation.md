# 検索エンジン登録・アクセス分析基盤（Search Console・Bing・PostHog）

2026-10-27。実装は、設定（トークン・ホスト）を入れるまで**何も表示せず、何も通信しない**。サイトの現在の見た目・動作は変わらない。

## 0. 状態の一覧

| 項目 | 状態 | 備考 |
| --- | --- | --- |
| Google Search Console：プロパティ・所有権 | **完了（運営者が実施済みと判断）** | 検索データのエクスポート（`https___ossalt.jp_-Performance-on-Search-…`）があり、**URLプレフィックスのプロパティ**（`https://ossalt.jp/`）が存在すると読める。ドメインプロパティ（`sc-domain:ossalt.jp`）の有無は未確認 |
| Google Search Console：サイトマップ送信 | **未確認**（運営者の画面で確認） | 手順は §2.3 |
| sitemap.xml・robots.txt の検証 | **完了** | `scripts/sitemap-check.mjs`：724件、問題0（§2.2） |
| Bing Webmaster Tools | **未着手（運営者の操作待ち）** | Search Consoleからのインポートが第一候補（§3） |
| IndexNow | **導入しない（理由は §3.3）** | |
| PostHog：コード | **実装済み・外部認証待ち** | Project Token とホストを Variables に設定すると有効（§4） |
| PostHog：実プロジェクトへの接続確認 | **未実施** | トークンがないため。テストはモックのホストで実施（§6） |
| PostHog：ダッシュボード | **未作成** | APIの認証がないため。作成手順は §5 |
| ESLint | **未実施（リポジトリに設定がない）** | 型検査（tsc）とビルドで代替。新規に導入はしていない |

## 1. 調査の結果（既存の実装）
- Next.js **16.3**（App Router、`output: export` の静的書き出し、`trailingSlash: true`）。GitHub Pages で公開（`deploy-pages.yml`）。`robots.ts`・`sitemap.ts` で生成。
- アクセス解析：**Umami Cloud**（Cookieなし。`src/lib/analytics.ts`・`layout.tsx`）。同意バナーなし。**PostHog は未導入**だったため、新規に追加した。Umami は変更していない（併用）。
- 所有権確認のメタタグ・IndexNow：**なし**（既存の実装なし）。
- 同意管理：**なし**（Umamiは不要なため）。PostHogのために、最小の同意・拒否・撤回を新規に追加した。
- CSP：設定なし（`_headers` なし）。
- 環境変数：`NEXT_PUBLIC_*` を GitHub の Variables から `deploy-pages.yml` のビルドに渡す方式。今回もそれに合わせた。

## 2. Google Search Console

### 2.1 所有権確認
- すでに検索データが取得できているため、確認済みとみなす。**再設定はしない。**
- ドメインプロパティに切り替えたい場合（任意）：Search Console →「プロパティを追加」→「ドメイン」に `ossalt.jp` → 表示された **TXTレコード**を、Cloudflare の DNS に追加（種類 TXT、名前 `@`、内容は Google が表示した値）。**値は Google が発行したものだけを使う。** DNSの変更は、運営者が行う。
- メタタグ方式を使う場合のため、`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` を設定すると `<meta name="google-site-verification">` を出す（未設定なら出さない）。

### 2.2 sitemap・robots の検証（実施済み）
`npm run build && node scripts/sitemap-check.mjs`（テスト：`scripts/sitemap-check.test.mjs`）

| 確認 | 結果 |
| --- | --- |
| XML・URL数 | 724件。XMLとして読める |
| 重複・別ホスト・クエリ付き・末尾スラッシュなし | なし |
| ページが存在する（404を載せていない） | 全件 `out/` にある |
| 転送ページ（meta refresh）・noindex を載せていない | なし |
| canonical が自身のURLと一致 | 全件一致 |
| OSS詳細・SaaS代替・比較（解説あり）・ブログ・ライセンス | `sitemap.ts` が、掲載中（アーカイブ除外）のものだけを出力 |
| lastmod | ツールは最終コミット日、ブログは記事の日付がある場合のみ。信頼できる日付がないページには付けない |
| robots.txt | `User-agent: *` は許可、`Sitemap: https://ossalt.jp/sitemap.xml` あり。Googlebot・Bingbot を拒否していない |

**本番のURL（https://ossalt.jp/sitemap.xml）への実際の取得は、この環境からできないため未確認。** 公開後に運営者の画面で確認する。

### 2.3 サイトマップの送信（運営者）
Search Console →「サイトマップ」→ `sitemap.xml` を入力 →「送信」。ステータスが「成功しました」になり、検出URL数が約724になることを確認する。

### 2.4 将来、見る指標
表示回数、クリック数、CTR、平均掲載順位、検索クエリ、ページ、「ページのインデックス登録」（登録済み／未登録とその理由）、リッチリザルト。週次は、エクスポートしたCSVを `scripts/gsc-weekly-report.mjs` に渡す（API連携は今回行わない）。

## 3. Bing Webmaster Tools（運営者の操作）
### 3.1 登録
Bing Webmaster Tools にログイン →「サイトを追加」→ **「Google Search Console からインポート」**を選び、`https://ossalt.jp` を選ぶ（所有権確認とサイトマップが引き継がれる）。インポートできない場合は、メタタグ方式（`NEXT_PUBLIC_BING_SITE_VERIFICATION` に Bing が表示した値を設定して再デプロイ）、または DNS の CNAME。

### 3.2 確認事項
- sitemap：既存の `https://ossalt.jp/sitemap.xml` を再利用（新規作成なし）。インポートされていなければ、手動で送信。
- Bingbot：robots.txt で許可（拒否のルールなし）。canonical・noindex・転送の問題は §2.2 のとおり0件。
- 旧URLの転送：meta refresh。HTTP 301 は Cloudflare Bulk Redirects の適用後（`docs/seo-cloudflare-redirects.md`）。

### 3.3 IndexNow：今回は導入しない
- サイトは静的書き出しで、更新はデプロイ単位の一括。URLごとの変更通知の基盤（サーバー）がなく、通知のたびに追加の仕組み（キー管理・失敗時の再送・重複抑制）が要る。
- Bing は Search Console のサイトマップで検出できる。効果が見込めるのは、更新頻度が高く、すぐに反映したいサイト。OSSALT は毎日の更新だが、サイトマップの再取得で足りる。
- 導入するなら：キーを GitHub Secrets ではなく公開ファイル（`/<key>.txt`）で置き、デプロイ後に変更URLだけを送る。**必要になったら別に提案する。**

## 4. PostHog

### 4.1 構成
| ファイル | 役割 |
| --- | --- |
| `src/lib/posthog/config-core.ts`・`config.ts` | 設定の解決（トークン・ホスト・許可ホスト）。未設定・不正は完全に無効 |
| `src/lib/posthog/consent.ts` | 同意の状態（localStorage）。端末に残したPostHogのキーの削除 |
| `src/lib/posthog/privacy.ts` | 送る値の無害化（URLのクエリ・ハッシュ・リファラ・IP等） |
| `src/lib/posthog/events.ts` | **イベント定義の唯一の正本**（型・検証・重複排除） |
| `src/lib/posthog/client.ts` | SDKの遅延読み込みと送信。同意するまで読み込まない |
| `src/lib/posthog/track.ts` | 部品から呼ぶ入口（同意・重複を確認） |
| `src/components/analytics-consent.tsx` | 同意バナー、「計測の設定」リンク、ページ表示、外部リンクの検出 |
| `src/components/track-view.tsx` | 「表示された」を1回だけ送る部品 |

SDK は `posthog-js`（公式。Apache-2.0 AND MIT）を **動的import** で読み込む。同意前・無効のビルドでは、通信もJSの読み込みもない（遅延チャンクが約320KB（圧縮前）増えるが、初回の読み込みには含まれない）。

### 4.2 プライバシー設定
| 要件 | 実装 |
| --- | --- |
| Session Replay 無効 | `disable_session_recording: true`（実通信で `/s/` 等が無いことを確認） |
| Autocapture 無効 | `autocapture: false`、`capture_pageview/pageleave/dead_clicks/heatmaps/exceptions/rageclick` も無効 |
| アンケート・フラグ・実験の取得を無効 | `disable_surveys`、`disable_web_experiments`、`advanced_disable_flags`。外部スクリプトの読み込みも無効 |
| Cookie を使わない | `persistence: "localStorage"`（Cookieは0件であることを確認） |
| 個人のプロフィールを作らない | `person_profiles: "never"` |
| IPを保存しない・位置情報を付けない | **すべてのイベントに `$geoip_disable: true`**（GeoIPを無効）。`before_send` で `$ip`・位置情報・`$set` を削除。**IPアドレスそのものは、PostHogの管理画面の「Discard client IP data」を ON にして保存させない**（運営者の設定。§7）。※SDKの `ip` オプションは効果がない（非推奨）ため使っていない |
| 検索語・URLのクエリを送らない | `before_send` で、すべてのURL型の値を「オリジン＋パス」に（リファラはオリジンのみ）。イベントの属性に検索語を持たない（実通信で検証。**この検証で `$session_entry_url` にクエリが入る漏れを見つけ、修正した**） |
| Do Not Track を尊重 | `respect_dnt: true` |
| ボットを送らない | SDKの既定（`opt_out_useragent_filter: false`）。E2Eのテスト用ビルドだけ許可 |
| 同意前は無効 | 同意（granted）になるまでSDKを読み込まない。未選択は「同意しない」と同じ |
| 撤回 | 「計測の設定」→「同意しない」で `opt_out_capturing()`・`reset()`、端末の `ph_*` を削除。以後は送らない |
| 開発・プレビューを混ぜない | 本番ビルドのみ。送信を許可するホストは `ossalt.jp`（と `www`）だけ（`NEXT_PUBLIC_POSTHOG_ALLOWED_HOSTS` で上書き可）。`localhost`・`*.pages.dev` では出ない |
| プライバシーポリシー | `/privacy/` に、PostHogが有効なビルドだけ、実装に沿った説明を表示（無効なビルドでは、PostHogの記載は出ない） |

### 4.3 イベント（`events.ts` が正本）
| イベント | 送るタイミング | 属性 | 送らないもの |
| --- | --- | --- | --- |
| `$pageview` | 同意中、新しいページを表示したとき（遷移ごとに1回） | `$current_url`（クエリ・ハッシュなし）、リファラ（オリジンのみ） | クエリ |
| `oss_search_performed` | 一覧（`/tools/` 等）で絞り込み・検索した結果が落ち着いたとき（1.2秒）。並び替えのみでは送らない | `result_count`、`filter_kinds`（query/category/license/docker/japanese）、`page_type`（`tools_list`） | **検索語そのもの** |
| `oss_detail_viewed` | OSS詳細ページの表示 | `slug`、`category`、`license_class` | — |
| `saas_alternative_viewed` | SaaS代替ページの表示 | `slug`、`candidate_count` | — |
| `external_oss_link_clicked` | 詳細ページの「公式サイト」「GitHub」のクリック（`data-ph-link`） | `link_kind`（official/github/other）、`slug`、`domain` | URLのパス・クエリ |
| `oss_diagnosis_completed` | 診断の結果ページの表示（診断機能は既存） | `saas`、`recommended_count`、`conditions`（`team_`・`skill_`・`hosting_`・`strength_`・`need_` の分類名） | 自由記述（そもそも入力なし） |

- 重複：同じイベントは、同じページ表示の間は1回（React StrictModeの二重実行・再レンダリングで増えない。ルート遷移でリセット）。
- 検証：属性は実行時にも検証し（slugの形でない値、不正なドメイン等は送らない）、検索語が紛れ込んでも出力に含まれない。
- 同意前に表示したページは、同意した時点で「いま見ているページ」の `$pageview` と閲覧イベントを1回送る。
- **新しいイベントの足し方**：(1) `EVENT_NAMES` に名前、(2) `EventProps` に属性の型、(3) `buildEvent` に検証、(4) 部品から `track()` または `<TrackView>`、(5) この表に追記。
- 既存のUmamiのイベント（`src/lib/analytics.ts`）には触れていない。

### 4.4 環境変数（`.env.example` も参照）
| 変数 | 内容 |
| --- | --- |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | Project Token（`phc_…`）。公開される値で、秘密ではない。**Personal API Key（`phx_…`）は絶対に入れない（受け付けない）** |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` か `https://eu.i.posthog.com`（プロジェクトの地域に合わせる） |
| `NEXT_PUBLIC_POSTHOG_ALLOWED_HOSTS` | 任意。送信を許可するホスト（カンマ区切り）。未設定は `ossalt.jp` と `www` |
| `NEXT_PUBLIC_POSTHOG_ENABLE_DEV` | 任意。開発（next dev）で試すときだけ `1` |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`・`NEXT_PUBLIC_BING_SITE_VERIFICATION` | 任意。所有権確認のメタタグ（通常は不要） |

GitHub の Variables に設定する（Secrets ではない）。`deploy-pages.yml` が、ビルドに渡す。

## 5. 分析の設計（PostHogの管理画面で作成。**APIの認証がないため、未作成**）
### Dashboard A：OSSALT Growth
| タイル | 作り方 |
| --- | --- |
| 訪問者（ユニーク） | Trends：`$pageview`、Unique users、日次 |
| ページ閲覧 | Trends：`$pageview`、Total count |
| OSS詳細閲覧 | Trends：`oss_detail_viewed` |
| SaaS代替ページ閲覧 | Trends：`saas_alternative_viewed` |
| 外部OSSリンククリック | Trends：`external_oss_link_clicked`、`link_kind` で分解 |
| 主要機能の利用 | Trends：`oss_search_performed`・`oss_diagnosis_completed` |

### Dashboard B：OSS Discovery
| タイル | 作り方 |
| --- | --- |
| よく閲覧されるOSS | Trends：`oss_detail_viewed`、`slug` で分解、上位20 |
| よく閲覧されるカテゴリ | 同、`category` で分解 |
| よく使われる検索フィルター | Trends：`oss_search_performed`、`filter_kinds` で分解 |
| 詳細→外部サイトの遷移率 | Funnel：`oss_detail_viewed` → `external_oss_link_clicked`（同じセッション）。`slug` でも分解 |

### Dashboard C：Conversion（発見 → 詳細閲覧 → 公式サイトへ）
- Funnel（順序あり、同一セッション、期間7日）：`oss_search_performed` または `saas_alternative_viewed` → `oss_detail_viewed` → `external_oss_link_clicked`（`link_kind = official`）。
- 注意：Funnelは匿名ID（端末のlocalStorage）が単位。同意しない人・複数端末は数えられない。

## 6. テスト（ローカル。CIの実行は前提にしていない）
| 確認 | 方法 | 結果 |
| --- | --- | --- |
| 型検査 | `npx tsc --noEmit` | 通過 |
| ESLint | — | 設定がないため未実施 |
| ビルド | `npm run build` | 成功 |
| 単体テスト | `npm test` | **258件通過**（今回の追加：計測18件、サイトマップ5件） |
| sitemap・robots・canonical | `node scripts/sitemap-check.mjs` | 724件、問題0 |
| 既存のE2E | `npm run test:e2e:desktop` / `:mobile` | 通過（計測が未設定のビルドで、バナー・通信が出ないことを確認するテストを追加） |
| **計測のE2E（モックのホスト）** | `npm run build:analytics-e2e && npm run test:e2e:analytics` | **12件通過** |

計測のE2E（ダミーのトークンを埋め込んだビルド。ホストは `http://127.0.0.1:4599` のモックで、受けたリクエストを記録）で確認したこと：
- 同意前：PostHogへの通信ゼロ、`ph_` の保存ゼロ、Cookieゼロ（クエリ付きURL・外部リンククリック後も）
- 拒否：通信ゼロ（ページ移動・検索後も）、再読み込みしてもバナーが出ない
- 同意：`$pageview` 1回、詳細閲覧1回、外部リンクが `official`・`github` で届く。**送信内容に、検索語・クエリ・ハッシュが含まれない**
- 再読み込み・ルート遷移：二重送信なし
- 代替ページ・絞り込み・診断：属性が仕様どおり（検索語・URLの答えが含まれない）
- Session Replay・autocapture・フラグ・アンケートの通信がない。許可した種類以外のイベントが出ない
- 撤回：以後の送信ゼロ、`ph_` のキーが消える。拒否後に同意へ変更できる
- 許可リストにないホスト名：バナーも通信も出ない

**実際のPostHogプロジェクトへの送信は、確認できていない**（トークンがないため。上のテストは、SDKが実際に出す通信をモックで受けて確認したもので、サーバー側の受理は含まない）。

## 7. 運営者が行う作業
0. **PostHog の管理画面で、IPを保存しない設定にする**：Project settings →「IP data capture configuration」（IPデータの取得設定）→ **「Discard client IP data」を ON**。これをしないと、サーバーがリクエストのIPアドレスを保存する（コード側では止められない）。
1. **PostHog**：アカウント／プロジェクトを作成（無料枠。課金の設定はしない）→ 地域を選ぶ → Project Token（`phc_…`）とホストを確認 → GitHub の Variables に `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`・`NEXT_PUBLIC_POSTHOG_HOST` を設定 → 公開ワークフローを実行（**承認後**）。
2. **公開後の実画面での確認**：バナーが出る／「同意しない」で通信が出ない（ブラウザの開発者ツールのネットワーク）／「同意する」でPostHogの「Live events」に `$pageview` が出る／イベントの属性に検索語がない。
3. **PostHog**：ダッシュボード A・B・C を、§5 の手順で作成。
4. **Search Console**：サイトマップを送信（§2.3）。
5. **Bing**：Search Console からインポート（§3.1）。
6. **プライバシーポリシー**：運営者名・制定日（`NEXT_PUBLIC_OPERATOR_NAME` など）は、従来どおり未設定。法的な表記は運営者が確認する。

## 8. デプロイ前の確認
- [ ] `npm test`・`npx tsc --noEmit`・`npm run build`・`node scripts/sitemap-check.mjs` が通る
- [ ] `npm run build:analytics-e2e && npm run test:e2e:analytics` が通る
- [ ] Variables にトークンとホストを設定した**あと**のプレビューで、バナー・同意・撤回を目視確認（トークンを設定しなければ、サイトは従来どおり）
- [ ] プライバシーポリシーの説明が、有効なビルドで表示される
- [ ] フォント表示・Core Web Vitals に影響がない（同意前はSDKを読み込まない）
- [ ] ロールバック：Variables のトークンを空にして再デプロイ → 計測は完全に無効になる
