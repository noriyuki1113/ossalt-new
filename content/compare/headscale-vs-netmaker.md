---
description: "HeadscaleとNetmakerの違いを比べます。どちらもTailscaleの代わりに、自分で管理する仮想ネットワークを作れます。HeadscaleはTailscaleのコントロールサーバーを自分で動かすもの、NetmakerはWireGuardの自動化の基盤です。"
updated: "2026-11-09"
---

**結論：端末に公式のTailscaleのアプリを使い続けたいならHeadscale、WireGuardの網を、管理画面つきの基盤として組み立てたいならNetmakerです。**

- **Headscaleを選ぶ場合**：Tailscaleの接続を管理するサーバー（コントロールサーバー）を、自分で動かすものです。各端末には、公式のTailscaleのアプリを入れて使います。公式のREADMEでは、個人や小さな組織向けの、単一のネットワーク（tailnet）を想定した範囲の狭い実装と説明されています。
- **Netmakerを選ぶ場合**：WireGuardをもとにした仮想ネットワークを、自前で作る基盤です。公式のREADMEでは、管理画面（Admin UI）、OAuth、アクセス制御（ACL）などがあり、メッシュのVPNや、拠点間の接続を作れます。

**選ぶときのコツ**：Tailscaleの使い心地を保ったまま、サーバーだけを自分で持ちたいならHeadscaleが近い選択です。複数のネットワークや、拠点をまたぐ構成を管理したいなら、Netmakerが向きます。公式のREADMEでは、Headscaleについて、リバースプロキシやコンテナで動かすことを、公式は勧めない（サポートしない）とされています。導入の方法は、公式のドキュメントで確認してください。Netmakerの手順では、固定のグローバルIPを持つVMと、443番などのポートの開放が前提です。VPNは通信の要なので、更新と、鍵の管理を丁寧に行ってください。手間をかけたくないなら、Tailscaleのままのほうが楽です。

**ライセンス**：HeadscaleはBSD-3-Clause、NetmakerはApache-2.0ですが、`pro/` 以下は別のライセンス（PRO_LICENSE）です。画面の日本語翻訳は、どちらもデータでは確認できていません。Dockerでの導入方法は、どちらも確認できています。

詳しくは[Headscaleとは](/tools/headscale/)、[Netmakerとは](/tools/netmaker/)、[Tailscaleの代替](/alternatives/tailscale/)のページを参照してください。
