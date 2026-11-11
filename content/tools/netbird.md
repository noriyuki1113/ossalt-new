---
description: "NetBirdとは、WireGuardを使って、離れた端末やサーバーどうしを安全につなぐ社内ネットワークを作れるオープンソースです。管理画面一式を自分で動かせます。できること、Tailscale・Headscaleとの違い、注意点を解説します。"
updated: "2026-11-11"
verification:
  status: official
  checked_at: "2026-11-11"
  sources:
    - https://github.com/netbirdio/netbird
    - https://github.com/netbirdio/netbird/blob/main/LICENSE
    - https://docs.netbird.io/selfhosted/selfhosted-guide
    - https://github.com/netbirdio/netbird/issues/4333
    - https://github.com/netbirdio/netbird/issues/2732
    - https://github.com/juanfont/headscale
  note: "NetBirdの公式のREADME・LICENSE・自分で動かす手順のドキュメントと、この解説の機能・対応する端末・ライセンス・自分で動かす構成の記述を照合した。Headscaleの記述は、Headscaleの公式のREADMEで確認した。管理画面の日本語翻訳は、公式では確認できなかったため、その旨に書き換えた（当サイトのOSSデータの日本語UIの欄は、この作業では変更していない）。TailscaleのサービスとしてのネットワークはHeadscaleのREADMEの説明で確認し、Tailscale自身の公式ページは読んでいない。実機では動かしていない"
---

NetBird（ネットバード）は、在宅のパソコン、社内のサーバー、クラウドのサーバーなどを、**インターネット越しに安全につなぎ、1つの社内ネットワークのように使える**ようにする仕組みです。暗号化の通信にはWireGuardを使います。

### できること

- **端末どうしの直接の接続**：可能な場合は、中継のサーバーを通さずに、端末どうしが直接つながります。
- **アクセスの制御**：利用者や端末のグループごとに、「どこにつないでよいか」を管理画面で決められます。
- **シングルサインオン**：Google、Microsoft、Oktaなどのアカウントでログインして、端末を登録できます。
- **管理画面**：端末、利用者、ルールを、Webの画面で管理できます。画面（管理画面）の日本語翻訳は、公式では確認できませんでした（公式のIssueでは、管理画面の多言語対応が要望として残っています）。
- **いろいろな端末**：Windows、Mac、Linux、スマホなどで使えます。

### Tailscale・Headscaleとの違い

Tailscaleは、同じ仕組みのネットワークを、サービスとして提供しています。[Headscale](/tools/headscale/)は、Tailscaleの「接続を管理するサーバー」だけを自分で動かすもので、端末には公式のTailscaleのアプリを使います。NetBirdは、**端末のアプリ、管理のサーバー、管理画面までを一式で提供**しているのが違いです（「[HeadscaleとNetBirdの違い](/compare/headscale-vs-netbird/)」）。

### 注意点

- 自分で動かす場合、管理のサービス、シグナル、中継、管理画面、認証の基盤（IdP）などの部品で構成されます。公式のクイックスタートは、スクリプトでこれらをまとめて用意する手順です。公開ドメインを持つLinuxのサーバーと、Docker Composeが必要です。
- 社内のネットワークへの入り口になるため、管理画面のログインの保護と、アクセスのルールの見直しを、定期的に行ってください。
- ライセンスは、リポジトリ全体がBSD-3-Clauseです。ただし、management・signal・relay・combinedのディレクトリ（管理サービス、シグナル、中継）は、AGPL-3.0です。

[Tailscaleの代替](/alternatives/tailscale/)のページで、ほかの候補も比べられます。
