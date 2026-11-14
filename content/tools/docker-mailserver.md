---
description: "Docker Mailserverとは、メールの送受信に必要な仕組み（Postfix・Dovecot・迷惑メール対策など）を、1つのコンテナにまとめたメールサーバーです。できること、Gmailとの違い、DNSの設定などの注意点を解説します。"
updated: "2026-11-14"
at_a_glance:
  what: "SMTP（送信）とIMAP（受信）に、迷惑メールやウイルスの対策をまとめた、コンテナで動かすメールサーバーです。データベースを使わず、設定ファイルとコマンドで管理します。"
  good_for:
    - "自分のドメインのメールを、自分のサーバーで送受信したい人"
    - "設定をファイルで管理して、バージョンの管理もしたい人"
  not_for:
    - "メールを相手に確実に届けることの手間をかけたくない人（DNSや送信元の評判の管理が必要です）"
    - "管理の画面（Web画面）で設定したい人（公式の管理はコマンドと設定ファイルです）"
    - "ブラウザで読むメールの画面（Webメール）も1つで欲しい人（公式の「含まれるサービス」の一覧にありません）"
  check:
    - "固定のIPアドレスと、逆引き（PTR）を設定できるサーバーか"
    - "ライセンスはMITです"
verification:
  status: official
  checked_at: "2026-11-14"
  sources:
    - https://github.com/docker-mailserver/docker-mailserver/blob/HEAD/README.md
    - https://github.com/docker-mailserver/docker-mailserver/blob/HEAD/LICENSE
    - https://docker-mailserver.github.io/docker-mailserver/latest/
    - https://docker-mailserver.github.io/docker-mailserver/latest/usage/
  note: "README、LICENSE、公式ドキュメント（概要・使い方）と、この解説の機能・導入手順・DNSとサーバーの条件・ライセンスの記述を照合した。実機では動かしていない"
---

Docker Mailserver（DMS）は、メールの送受信に必要な仕組みを、**1つのコンテナにまとめたメールサーバー**です。公式の説明では、SMTP・IMAP・LDAP・迷惑メールやウイルスの対策などを含み、「データベースを使わず、設定ファイルだけで管理する」ことを方針にしています。

### できること

- **送受信**：送信はPostfix、受信（IMAP・POP3）はDovecotが担います。
- **迷惑メールとウイルスの対策**：Rspamd、SpamAssassin、ClamAVなどが含まれています。
- **なりすまし対策**：DKIMとDMARCの仕組み（OpenDKIM・OpenDMARC）が含まれています。
- **証明書**：Let's Encryptの証明書や、手動で用意した証明書を使えます。
- **管理のコマンド**：アカウントや別名（エイリアス）の追加を、`setup` のコマンドで行います。

Dockerでの導入方法を確認できています。

### Gmailとの違い

Gmail（Google Workspace）は、メールの保管も、相手に届けるための管理も、Googleに任せられます。Docker Mailserverは、**メールのデータを自分のサーバーに置ける**代わりに、届けるための設定や監視も自分で行います。公式の「含まれるサービス」の一覧には、ブラウザで読むメールの画面（Webメール）がないので、メールのソフトを使うか、別に用意します。管理の画面も欲しい場合は、[mailcowとの比較](/compare/docker-mailserver-vs-mailcow/)も参考にしてください。

### 始め方の目安

公式の「使い方」では、次の準備が必要と書かれています。

- 管理できるサーバーと、DNSを設定できる自分のドメイン
- サーバーは固定のIPアドレスを持ち、メールに使うポートで送受信できること。**逆引き（PTR）を設定できること**（設定できないと、受け取りを拒否されることがあります）
- DNSに、MX・Aのレコードを設定する。さらに、SPF・DKIM・DMARCの設定をほぼ必ず行うよう案内されています

導入は、公式の `compose.yaml` と `mailserver.env` を取得し、ホスト名などを書き換えて `docker compose up` で起動します。**初回の起動から2分以内に、最低1つのメールのアカウントを追加しないと、いったん止まって再起動する**と書かれています（`docker exec -ti <コンテナ名> setup email add user@example.com`）。止めるときは `docker compose down` を使い、Ctrl+Cでは止めないよう注意されています。

### 注意点

- 自分でメールサーバーを動かすと、送ったメールが迷惑メール扱いされないようにする作業（DNSの設定、送信元の評判の確認）が続きます。公式も、送信のテストのためのサービスを案内しています。
- 公式は、**使っているイメージの版に合ったドキュメントを読む**よう案内しています。
- 2021年1月から、ボランティアが開発を続けていると書かれています。
- ライセンスはMITです。

[Gmailの代替](/alternatives/gmail/)のページで、ほかの候補も比べられます。
