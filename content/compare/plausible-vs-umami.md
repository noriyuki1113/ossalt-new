---
description: "PlausibleとUmamiの違いを比べます。どちらもCookieを使わない軽量なアクセス解析で、Google Analyticsの代わりとして人気がありますが、動かすための構成とライセンスが異なります。"
updated: "2026-10-01"
---

**結論：小さなサーバーで手軽に動かしたいならUmami、完成度の高いダッシュボードとクラウド版も含めて検討するならPlausibleです。**

- **Umamiを選ぶ場合**：データベース（PostgreSQL）と組み合わせるだけの軽い構成で、自前で動かしたい。ライセンスはMITです。当サイトもUmamiを使っています。
- **Plausibleを選ぶ場合**：1ページにまとまった見やすいダッシュボードを使いたい。自前で動かす版（Community Edition）は、大量のデータを扱うためのデータベースも含む構成で、Umamiより必要な性能はやや大きめです。ライセンスはAGPL-3.0です。

**共通の注意点**：どちらも、指標を絞った軽量な解析です。Google Analyticsのような細かい分析が必要なら、[Matomo](/tools/matomo/)も比べてみてください。Plausibleは一部の機能をクラウド版だけで提供しています。

詳しくは[Umamiとは](/tools/umami/)と、ブログの記事「[セルフホストできるアクセス解析ツールの比較](/blog/selfhosted-analytics/)」を参照してください。
