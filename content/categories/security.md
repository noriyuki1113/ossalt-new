---
updated: "2026-10-01"
---

このカテゴリには、ログインの仕組み、パスワードの管理、社内ネットワーク、脆弱性の検査など、セキュリティに関わるツールをまとめています。目的ごとに見ていきましょう。

- **ログインの仕組み（認証基盤）**：複数の社内システムのログインをまとめる（シングルサインオン）なら、[Keycloak](/tools/keycloak/)、[Authentik](/tools/authentik/)、[Authelia](/tools/authelia/)が候補です。OktaやAuth0の代わりになります。
- **パスワードの管理**：チームでパスワードを共有・管理するなら[Vaultwarden](/tools/vaultwarden/)、個人で端末に保存するなら[KeePassXC](/tools/keepassxc/)があります。
- **秘密の情報の管理**：APIキーなど、システムで使う秘密の情報を管理するなら[Infisical](/tools/infisical/)があります。
- **社内ネットワーク（VPN）**：離れた端末どうしを安全につなぐなら、[Headscale](/tools/headscale/)や[NetBird](/tools/netbird/)が候補です。Tailscaleの代わりになります。
- **脆弱性の検査**：[Trivy](/tools/trivy/)や[Nuclei](/tools/nuclei/)で、コンテナやWebサイトの既知の脆弱性を調べられます。

### 選ぶときのポイント

- **止まったときの影響が大きい**：ログインやパスワードの仕組みが止まると、ほかのすべての業務に響きます。冗長化とバックアップを先に考えましょう。
- **更新を続けられるか**：セキュリティのツールこそ、アップデートを確実に適用できる体制が必要です。

[Oktaの代替](/alternatives/okta/)、[Auth0の代替](/alternatives/auth0/)、[1Passwordの代替](/alternatives/1password/)のページも参考にしてください。
