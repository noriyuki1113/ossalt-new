# ossalt.jp — 日本語オープンソース代替ソフト事典

OpenAlternative の日本版として作った、**データベース不要の静的ディレクトリサイト**です。
Supabase が落ちても壊れないよう、データはすべて `public/data/*.json` から読みます。

- フレームワーク: Next.js 16（App Router / TypeScript）
- 出力: 完全静的（`output: "export"`）→ Vercel / Cloudflare Pages / GitHub Pages に置ける
- DB・外部API: **不要**（ビルド時にJSONを読むだけ）
- 言語: 日本語（`src/lib/site.ts` に文言を集約、`MESSAGES.en` を埋めれば英語版も出せる）

## 構成

```
ossalt-jp/
├─ data-source/
│  ├─ tools.json          # パイプラインの出力（正規化済みツールデータ）
│  └─ github.json         # （任意）GitHubメタデータの追加分
├─ public/data/           # ← scripts/build-data.mjs が生成（コミットする）
│  ├─ tools.json
│  ├─ categories.json
│  └─ meta.json
├─ scripts/build-data.mjs # カテゴリ割当・鮮度計算・メタ生成
└─ src/
   ├─ app/
   │  ├─ page.tsx                      # トップ
   │  ├─ tools/page.tsx                # 一覧（検索・絞り込み）
   │  ├─ tools/[slug]/page.tsx         # 詳細（スペック・健全度・セキュリティ）
   │  ├─ categories/page.tsx           # カテゴリ一覧
   │  ├─ categories/[slug]/page.tsx    # カテゴリ別
   │  ├─ alternatives/page.tsx         # 代替対象SaaSの一覧
   │  ├─ alternatives/[slug]/page.tsx  # 「Notion の代替」比較ページ
   │  ├─ guide/ about/ contact/ privacy/
   │  ├─ sitemap.ts / robots.ts / feed.xml/route.ts
   │  └─ globals.css                   # デザイントークン＋全スタイル
   ├─ components/
   │  ├─ site-chrome.tsx   # ヘッダー・フッター・JSON-LD
   │  ├─ tool-views.tsx    # 健全度メーター・スコアバッジ・行・スペック表・比較表
   │  └─ tool-browser.tsx  # 検索・絞り込み（クライアント）
   └─ lib/
      ├─ site.ts      # サイト設定と全文言
      ├─ tools.ts     # 型・健全度計算・Scorecard判定・整形（副作用なし）
      ├─ data.ts      # JSON読み込み（サーバー専用）
      └─ categories.ts
```

## セットアップ

```bash
npm install
node scripts/build-data.mjs   # public/data/*.json を生成
npm run dev                   # http://localhost:3000
npm run build                 # out/ に静的書き出し
```

`npm run build` は `out/` を生成します。そのフォルダをそのまま静的ホスティングに置けます。

## データを増やす

1. `data-source/tools.json` に1行足す（`id, name, url, github_url, description_ja, primary_competitor, ...`）
2. `scripts/build-data.mjs` の `CATEGORY_OF` に id を追加
3. `node scripts/build-data.mjs && npm run build`

GitHubメタデータ（スター・フォーク・最終コミット）は、既存の
`fetch-github-data.mjs` / `fetch-scorecard.mjs` / `merge-github-into-tools.mjs`
の出力を `data-source/tools.json` に上書きすれば、日次で自動更新できます。

## 設計上の約束

- **推測値を載せない。** 取得できていない値は「未取得」、Scorecard未スキャンは「未評価」と表示する
  （`src/lib/tools.ts` の `getScorecardTier` / `getHealth`）。
- **JSON-LD の `Review` はスコアがある場合のみ出力**（未評価を0として出さない）。
- 健全度スコアは本家 OpenAlternative と同じ式：
  `stars×0.25 + forks×0.5 + contributors×0.5 + watchers×0.25 − min(最終コミットからの日数, 90)×0.5`
- 健全度メーターは、この式の5項目をそのまま5つの目盛りで表す。
  値が無い項目は斜線の「未取得」として表示する（`contributors` / `watchers` は
  GitHubトークンが必要なため、現状は未取得）。

## 公開前に設定が必要な箇所

| 場所 | 内容 |
| --- | --- |
| `src/lib/site.ts` | `SITE.url`（独自ドメイン）、`SITE.twitter` |
| `src/app/contact/page.tsx` | お問い合わせ用メールアドレス、またはフォームURL |
| `src/app/privacy/page.tsx` | 運営者名、制定日（`NEXT_PUBLIC_OPERATOR_NAME` / `NEXT_PUBLIC_PRIVACY_EFFECTIVE_DATE`。未設定なら「準備中」と表示） |

## ニュースレターについて

ニュースレターの登録フォームは、配信サービスの選定と送信内容が決まるまで設置しない。
以前は `action="#"` のダミーフォームが置かれていたが、送信しても何も起きない状態で
公開されていたため削除した。追加する場合は、実際に送信が機能するフォームアクション
URLを設定したうえで設置すること。

## 環境変数

| 変数 | 用途 |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | 本番URL（sitemap/OGPに使用）。未設定時は `https://ossalt.jp` |
| `NEXT_PUBLIC_UMAMI_SITE_ID` | アクセス解析（[Umami Cloud](https://umami.is/)）の Website ID。既定値が `src/lib/site.ts` にハードコードされているため、**未設定でもこの既定値で計測が始まる**。fork して自分のサイトとして公開する場合は、自分の Website ID に差し替えるか、この環境変数で上書きすること。`off` を指定すると計測を無効化する（script タグ自体を出力しない） |
