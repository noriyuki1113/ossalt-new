---
description: "ntfyとは、サーバーやスクリプトから、スマホやパソコンへ通知を送れるオープンソースの通知サービスです。HTTPでメッセージを送るだけで使えます。できること、Gotifyとの違い、自分で動かすときの注意点を解説します。"
updated: "2026-11-04"
at_a_glance:
  what: "HTTPでメッセージを送るだけで、スマホに通知を届けられる仕組みです。バックアップの完了などの通知を、手軽に作れます。"
  good_for:
    - "バックアップの完了などの通知を、コマンド1行で作りたい人"
    - "iPhoneでも通知を受け取りたい人"
  not_for:
    - "秘密の情報を、公開のサーバー（ntfy.sh）で通知したい人（トピックの名前を知っている人は、誰でも読み書きできるのが基本です）"
    - "自分のサーバーだけでiPhoneへの即時の通知を完結させたい人（公式のサーバーを中継する設定が必要になることがあります）"
  check:
    - "推測されにくいトピック名にする。自分で動かす場合は、利用者とアクセスの制限を設定する"
    - "ライセンスはApache-2.0とGPL-2.0から選べます"
verification:
  status: official
  checked_at: "2026-11-11"
  sources:
    - https://github.com/binwiederhier/ntfy
    - https://github.com/binwiederhier/ntfy/blob/main/LICENSE
    - https://docs.ntfy.sh/
    - https://docs.ntfy.sh/install/
    - https://docs.ntfy.sh/config/
    - https://docs.ntfy.sh/publish/
    - https://docs.ntfy.sh/subscribe/phone/
    - https://docs.ntfy.sh/integrations/
    - https://docs.ntfy.sh/faq/
    - https://github.com/binwiederhier/ntfy/tree/main/web/public/static/langs
    - https://gotify.net/
    - https://gotify.net/docs/pushmsg
  note: "README、LICENSE、公式ドキュメント（導入・設定・メッセージの送り方・スマホ・連携・FAQ）、翻訳ファイルの一覧と、この解説の機能・導入手順・設定・ライセンスの記述を照合した。Gotifyの記述は、Gotifyの公式サイトとドキュメントで確認した。実機では動かしていない"
---

ntfy（ノーティファイ。公式の説明では「notify」と読みます）は、**HTTPでメッセージを送るだけで、スマホに通知を届けられる**仕組みです。「バックアップが終わったら知らせる」「サーバーの容量が足りなくなったら知らせる」といった通知を、手軽に作れます。

### できること

- **コマンド1行で通知**：「トピック」の名前を決めて、そこにメッセージを送るだけです。`curl -d "バックアップ完了" ntfy.sh/トピック名` のように、どのプログラムからでも送れます。
- **スマホとブラウザで受け取る**：AndroidとiPhoneのアプリ（どちらもオープンソースと書かれています）、ブラウザで受け取れます。無料の公開サーバー（ntfy.sh）では、登録や料金なしで送れます。
- **優先度・タグ・ボタン**：通知の重要度、絵文字のタグ、押すとURLを開くボタンなどを付けられます。
- **監視のツールとの連携**：[Uptime Kuma](/tools/uptime-kuma/)などの通知の送り先として使えます。
- 画面の日本語翻訳と、Dockerでの導入方法を確認できています。

### Gotifyとの違い

[Gotify](/tools/gotify/)は、アプリごとにトークンを発行して通知を管理する、シンプルな通知のサーバーで、公式のアプリはAndroid向けです。ntfyは、**送るのが手軽で、iPhoneでも受け取れる**のが大きな違いです（「[Gotifyとntfyの違い](/compare/gotify-vs-ntfy/)」）。

### 自分のサーバーで動かすとき

公式の資料では、サーバーは1つのバイナリで、tarball・deb/rpmのパッケージ・Dockerイメージとして配布されています。導入したら、`ntfy serve` で起動します（deb/rpmなら `systemctl start ntfy`）。ntfy.shに送るだけなら、インストールは不要で、`curl` だけで使えます（[導入の案内](https://docs.ntfy.sh/install/)）。

- **公開のURL**：設定の `base-url` に、外から見えるURLを指定します。
- **利用者の制限**：ログインやサインアップの設定は、初期状態ではどちらも無効（`false`）です。誰にも自由に読み書きさせたくない場合は、ログインの設定（ウェブ画面でログインを必須にする設定もあります）とアクセスの制限を決めてください（[設定の案内](https://docs.ntfy.sh/config/)）。
- **iPhoneへの即時の通知**：自分のサーバーでは、`upstream-base-url` に公式のサーバー（ntfy.sh）を指定すると、iPhoneの通知が速く届くと書かれています。設定しない場合も通知は届きますが、**数時間かかることがあり**、スマホを使っているときでも20〜30分以内とされています。公式のサーバーに送られるのは、メッセージのIDと、トピックのURLのチェックサムだけで、本文は送られないと説明されています。
- **データベース**：初期状態ではSQLiteで、PostgreSQLも設定で使えます。

### 注意点

- **トピックの名前を知っている人は、誰でも読み書きできるのが基本の設定です。** 公開のサーバー（ntfy.sh）を使う場合は、推測されにくいトピック名にし、秘密の情報を通知に含めないでください。自分で動かす場合は、利用者とアクセスの制限を設定しましょう。
- 自分のサーバーでiPhoneに即時に通知するには、上の「自分のサーバーで動かすとき」の設定が必要です。
- 無料の公開サーバー（ntfy.sh）のほかに、公式の有料プラン（ntfy Pro）が案内されています。サーバーを自分で動かしたくない場合の選択肢です。
- ライセンスは、Apache-2.0とGPL-2.0のどちらかを選べる形（デュアルライセンス）です。

[Pushoverの代替](/alternatives/pushover/)のページで、ほかの候補も比べられます。
