# API・Markdown の検索除外の設定

対象：運営者の Cloudflare 操作。2026-10-09 に `/api/v1/tools.json` と `/md/tools/immich.md` が HTTP 200 で応答し、`X-Robots-Tag` がないことを確認。

## 設定する内容

Cloudflare の ossalt.jp のゾーンで、レスポンスヘッダーを変更する Transform Rule を作る。管理画面の名称や利用できる機能はプランによって異なるため、ここでの設定操作は未検証。

対象の式：

```text
(http.host eq "ossalt.jp" and (starts_with(http.request.uri.path, "/md/") or starts_with(http.request.uri.path, "/api/")))
```

対象のレスポンスに、静的なヘッダー `X-Robots-Tag` を値 `noindex` で設定する。ページ本文・JSON・Markdown の配信は続ける。`robots.txt` でこれらのパスのクロールを禁止すると、検索エンジンが noindex を読めなくなるため、クロールは禁止しない。

## 設定後の確認

GET のレスポンスヘッダーを確認する。リダイレクトがあれば、最終レスポンスを見る。

```sh
curl -sS -L -D - -o /dev/null https://ossalt.jp/api/v1/tools.json
curl -sS -L -D - -o /dev/null https://ossalt.jp/md/tools/immich.md
curl -sS -L -D - -o /dev/null https://ossalt.jp/tools/immich/
```

前の2件は HTTP 200 と `X-Robots-Tag: noindex`、通常のツールページは HTTP 200 で今回のルールによる noindex が付いていないことを確認する。API と Markdown の内容が引き続き取得できることも確認する。

最後に Search Console のURL検査で再クロール後の状態を確認する。設定直後に検索結果から消えるとは限らない。確認日と結果を実装バックログの P2-2 に記録してから完了にする。

設定を戻す場合は、このルールを無効にして同じURLのヘッダーを再確認する。
