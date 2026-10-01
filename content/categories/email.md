---
updated: "2026-10-01"
---

メールのツールは、メールを「送受信するサーバー」「読み書きするソフト」「配信・テストの道具」に分かれます。

- **メールサーバー**：自社のメールの送受信を自前で行うなら、[mailcow](/tools/mailcow/)、[Mailu](/tools/mailu/)、[docker-mailserver](/tools/docker-mailserver/)、[Stalwart](/tools/stalwart/)が候補です。
- **メールソフト**：ブラウザで読み書きするなら[Roundcube](/tools/roundcube/)、パソコンのアプリなら[Mailspring](/tools/mailspring/)があります。
- **一斉配信・送信の基盤**：システムからメールを大量に送るなら[Postal](/tools/postal/)、メールマガジンなら[Mailtrain](/tools/mailtrain/)があります。
- **開発中のテスト**：開発中のアプリから送ったメールを確かめるなら、[Mailpit](/tools/mailpit/)や[MailHog](/tools/mailhog/)が便利です。

### 選ぶときのポイント

- **メールサーバーの自前運用は難しい**：迷惑メールと判断されずに届けるための設定、迷惑メールへの対策、障害時の対応など、専門的な知識が必要です。会社のメールを自前に移すかは、慎重に判断しましょう。
- **テスト用の道具から始める**：開発のためのテスト用ツールは、手軽で失敗の影響も小さいので、最初に試すのに向いています。

[Gmailの代替](/alternatives/gmail/)や[Mailtrapの代替](/alternatives/mailtrap/)のページも参考にしてください。
