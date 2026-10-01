---
updated: "2026-10-01"
---

アクセス解析のツールは、知りたいことの細かさで選びます。

- **シンプルなアクセス解析**：ページの閲覧数、訪問者の数、どこから来たかが分かれば十分なら、[Umami](/tools/umami/)、[Plausible](/tools/plausible/)、[GoatCounter](/tools/goatcounter/)が候補です。Cookieを使わない設計のものが多く、画面も見やすくまとまっています。
- **Google Analyticsに近い詳しい分析**：目標の設定や詳しいレポートが必要なら、[Matomo](/tools/matomo/)が近い機能を持っています。
- **アプリの利用状況の分析**：サービスの中で、どの機能がどう使われているかを分析するなら、[PostHog](/tools/posthog/)や[Countly](/tools/countly/)が向いています。
- **操作の録画**：利用者の画面の操作を再現して見るなら、[OpenReplay](/tools/openreplay/)があります。

### 選ぶときのポイント

- **Cookieの扱い**：Cookieを使わないツールなら、同意の取り方の負担が軽くなる場合があります。ただし、必要かどうかはサイト全体で判断が必要です。
- **個人情報**：操作の録画などは、入力内容を記録しない設定を確認しましょう。

当サイトも、アクセス解析にUmamiを使っています。比較の詳細は、ブログの記事「[セルフホストできるアクセス解析ツールの比較](/blog/selfhosted-analytics/)」と、[Google Analyticsの代替](/alternatives/google-analytics/)のページを参考にしてください。
