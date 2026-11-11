---
description: "Enteとは、写真や動画を端末で暗号化してから預けられる、オープンソースの写真の保存サービスです。サーバーからも中身が見えません。できること、Immich・Googleフォトとの違い、自分で動かすときの注意点を解説します。"
updated: "2026-11-11"
verification:
  status: official
  checked_at: "2026-11-11"
  sources:
    - https://github.com/ente-io/ente
    - https://github.com/ente-io/ente/blob/main/LICENSE
    - https://ente.io/
    - https://help.ente.io/self-hosting/
    - https://help.ente.io/self-hosting/installation/requirements
    - https://github.com/ente-io/ente/blob/main/docs/docs/self-hosting/installation/config.md
    - https://github.com/ente-io/ente/blob/main/docs/docs/photos/faq/security-and-privacy.md
    - https://github.com/ente-io/ente/tree/main/web/packages/base/locales
    - https://docs.immich.app/developer/architecture/
  note: "Enteの公式のREADME・LICENSE・公式サイト・ヘルプ（自分で動かす手順、必要なもの、設定、セキュリティと回復用のキーのFAQ）・日本語の翻訳ファイルと、この解説の記述を照合した。Immichの記述は、Immichの公式ドキュメントで確認した。「Googleフォトも、サーバーで解析する」はGoogleの公式の資料では端末かサーバーかを確認できないため削除し、「ほかの写真のソフトより手順が複雑」も公式の資料では確認できないため削除した。「Googleフォトに近い使い心地と多機能さならImmich」は編集上の判断であり、公式の資料で確認した事実ではない。実機では動かしていない"
---

Ente（エンテ）は、**写真と動画を、エンドツーエンドで暗号化して保存する**サービスです。写真はスマホなどの端末で暗号化されてからサーバーに送られるため、保存先のサーバーの管理者からも、中身は見えません。運営元のクラウド版を使うことも、サーバーを自分で動かすこともできます。

### できること

- **自動のバックアップ**：スマホのアプリから、写真と動画を自動で預けられます。
- **共有**：家族や友人と、アルバムを共有できます。共有のリンクも暗号化されています。
- **検索と顔の認識**：写っているものや顔での検索ができます。これらの処理は、プライバシーを守るために、端末の側で行われます。
- **いろいろな端末**：スマホ、パソコン、ブラウザから使えます。
- 画面の日本語翻訳を確認できています。

### Immich・Googleフォトとの違い

[Immich](/tools/immich/)は、サーバーの機械学習で写真を解析して、検索や顔の認識を行います。Enteは、**サーバーから中身が見えないこと**を最優先にしていて、その分、解析は端末で行います。Googleフォトに近い使い心地と多機能さならImmich、暗号化を最優先ならEnteです（「[EnteとImmichの違い](/compare/ente-vs-immich/)」）。

### 注意点

- **暗号化のため、パスワードと回復用のキーをなくすと、写真を取り戻せません。** 回復用のキーは、必ず安全な場所に保管してください。
- 自分でサーバーを動かす場合、写真はS3互換のオブジェクトストレージに保存されます。公式のクイックスタートは、MinIO（S3互換）を含む構成をまとめて用意しますが、保存先などの設定は、必要に応じて自分で見直します。DockerとDocker Composeが必要です。
- **写真は失うと取り戻せません。** どの使い方でも、別の場所へのバックアップを用意してください。
- ライセンスはAGPL-3.0です。

[Googleフォトの代替](/alternatives/google-photos/)のページで、ほかの候補も比べられます。
