# ossalt.jp — 旧URLの HTTP 301 を Cloudflare のエッジで適用する

## 現状（2026-10-20 の自動検証）
- GitHub Pages公開ワークフロー成功後も `https://ossalt.jp/tools/194/` は HTTP 200（HTML meta refresh）。
- `https://ossalt-new.pages.dev/tools/194/` は HTTP 301 → `/tools/zammad/` に正常転送。
- つまり Cloudflare Pages の `_redirects` ファイルは機能しているが、現状の `ossalt.jp` カスタムドメインではその経路が効いていない。
- **ホスティング先やDNSを安易に切り替えない**。まず Cloudflare のアカウントレベルの **Bulk Redirects** を使用してURLをエッジで恒久転送する。

## このリポジトリのCSV
`ops/cloudflare/ossalt-legacy-bulk-redirects.csv`

- `data-source/redirects.json` の検証済み146組だけを転送
- 旧URLの末尾スラッシュ有無を区別して292行。たとえば `ossalt.jp/tools/194` と `ossalt.jp/tools/194/` を、どちらも `https://ossalt.jp/tools/zammad/` へ
- source URLはスキームなし（http/httpsの両方に一致）
- ステータス301。元URLのクエリパラメータを維持する。サブドメイン、サブパスは対象外
- Cloudflareが要求する**ヘッダーなし**のCSV形式
- `node scripts/make-redirects.mjs` でHTMLフォールバック・Pages用 `public/_redirects`・このCSVを同じデータから再生成する
- `npm test` はCSVの完全一致・重複・上限を検査

## Cloudflare Dashboard で適用（アカウント所有者が実施）
1. `ossalt.jp` を登録している **同じCloudflareアカウント**にログインする。
2. **Bulk Redirects** → **Create Bulk Redirect List** を開く。名前の例：`ossalt_legacy_20261020`。すでに該当するリストがある場合は、別のリストを無闇に増やさず既存の設定・優先順位を確認する。
3. CSVの**292行**をインポート。新旧URL・ステータス301を確認する。既存の正規URLに一致する「転送元」がないか念のため照合する。
4. **Continue to Redirect Rules** から、このリストを有効にする **Bulk Redirect Rule** を作成し **Save and Deploy**。
5. Cloudflareのプロキシが有効か確認し、既存のSingle Redirect / Bulk Redirectと競合しないか確かめる。

## 必須の公開確認
- `https://ossalt.jp/tools/194/` → **HTTP 301**、Location `https://ossalt.jp/tools/zammad/` 相当
- `https://ossalt.jp/tools/194`（末尾スラッシュなし）も、直接301
- `https://ossalt.jp/tools/254/` → **HTTP 301**、Location `https://ossalt.jp/tools/plane/` 相当
- `https://ossalt.jp/tools/zammad/` は **HTTP 200** を維持し、ループなし
- `https://ossalt.jp/tools/` など通常ページにも変更がない
- GitHub Actions「OSSALT 本番反映確認」では現在、旧数字URL2件のHTTP status/Locationを厳格検査する。Cloudflareルールを有効化する前は失敗するのが正常。ルール適用後の正常終了で反映を確認する

## Search Console の評価
Search Consoleの前回データ（2026-09-20〜10-17）で数字URLは57件／282表示／5クリック。うち既存対応表にあるURLは10件／116表示／2クリック、未対応47件は別Issue #32で調査する。これは検索表示の履歴であり、その分のアクセスが増える保証はない。

公開が確認された日付を記録し、28日後に旧URLの表示・クリック、正規URLのクリック・CTR・インデックス状態を同じ検索タイプ・期間で比較する。元のGSC ZIP/CSVは公開GitHubに置かない。

## 公式ドキュメント
- https://developers.cloudflare.com/rules/url-forwarding/bulk-redirects/create-dashboard/
- https://developers.cloudflare.com/rules/url-forwarding/bulk-redirects/reference/csv-file-format/
- https://developers.cloudflare.com/rules/url-forwarding/bulk-redirects/how-it-works/
- https://developers.cloudflare.com/pages/configuration/redirects/
