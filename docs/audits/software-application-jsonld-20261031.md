# SoftwareApplication の構造化データ：代表のツールでの修正案と検証

> 承認（2026-10-31）：「`price: 0` を、無条件に全ツールへ付けない」。Google検索セントラルの公式ガイドを根拠に、**代表の5ページで修正案を作り、検証する**。全ページへの一括変更は、影響範囲とテスト結果を確認したうえで、別に承認を取る。**このPRは、サイトの出力を変更しない。**

## 根拠（実測・公式）：Google検索セントラル「Software app（SoftwareApplication）」
最終更新 2026-09-08（確認日 2026-10-31）。
- **リッチリザルトの条件**：必須は `name`、`offers.price`（無料なら `0`）、そして **`aggregateRating` か `review` のどちらか**。推奨は `applicationCategory`（**Googleが対応する値**）と `operatingSystem`
- 「無料なら `offers.price` を `0`」。有料なら、通貨（`priceCurrency`）も付ける
- 構造化データは、ガイドライン（検索の基本・一般の構造化データのガイドライン）に従う。違反すると、手動の対策の対象になりうる

## 現行の実装（実測：`src/app/tools/[slug]/page.tsx`・ビルド済みのHTML）と、その問題
| # | 現行 | 問題 | 影響 |
| ---: | --- | --- | --- |
| 1 | 全ツールに `offers: {price: "0", priceCurrency: "JPY"}` | 価格を確認していないまま、無料と言っている。OSI承認でないライセンス（ソース公開型・混在）のツールも同じ（24＋9＝33ページ。例：n8n）。有料のホスティング版・企業向けがあるツール（Notesnook・Vikunja・Gitea）でも、その存在は示していない | 事実と食い違うおそれ（信頼性） |
| 2 | `applicationCategory` に、OSSALTのカテゴリ名（日本語。例「ノート・ドキュメント」） | Googleの対応する値（`BusinessApplication` など）ではない | 値が読まれない（推奨の項目） |
| 3 | 公式サイトが無いツールでは `url: ""`（Vaultwarden） | 空のURL | 不正な値 |
| 4 | `aggregateRating`・`review` は無い（意図どおり。2026-10-09 に削除） | **リッチリザルトの条件を、そもそも満たさない** | 価格を付けても、Googleのこのリッチリザルトには結び付かない。価格の誤りだけが、リスクとして残る |

## 修正案の方針（仮説と、確認できる事実を分ける）
1. **価格（`offers`）は、「無料で入手できる」と確認できたものだけ**に付ける（`data-source/pricing-facts.json`：出典URL・確認日・根拠つき）。OSI承認のライセンスのときだけ。確認できなければ付けない（推測しない）
2. 有料の選択肢（ホスティング版・企業向け）が、公式に案内されているときは、`offers.description` にその存在を書く（**金額は書かない**。金額は変わりやすい）
3. ソース公開型・混在・未確認のライセンスには、価格を付けない
4. `applicationCategory` は、Googleの対応する値に写す（`CATEGORY_TO_GOOGLE`。**仮説**。代表のカテゴリだけ検証し、曖昧なら出さない）
5. 空・不正なURLは出さない
6. `review`・`aggregateRating` は付けない（実在しないレビューを作らない）。その結果、リッチリザルトの条件は満たさない（方針どおり）

## 確認した価格の事実（出典つき）
| ツール | 無料で入手 | 有料の選択肢 | 根拠 |
| --- | --- | --- | --- |
| Vikunja | はい（「AGPLv3で、セルフホストは完全に無料」） | あり（Vikunja Cloud、Vikunja Pro） | https://vikunja.io/ |
| Notesnook | はい（「ノート・端末の数に制限のない無料」） | あり（保存容量・機能が増える有料プラン） | https://notesnook.com/ |
| Gitea | はい（「Open Source：MITライセンスの、無料のセルフホスト」） | あり（Gitea Cloud、Gitea Enterprise） | https://about.gitea.com/ |
| Vaultwarden | はい（AGPL-3.0。ライセンスから） | 公式の案内は確認できず（false） | LICENSE（公式の価格の記載は無い。信頼度は中） |
| n8n | **確認していない**（Sustainable Use License＝OSI承認でない。無料で使える条件が限られる） | — | 価格は付けない |

## 検証（実測）
- 純粋関数 `src/lib/software-jsonld.ts` ＋ テスト9件（価格の事実が無ければ出さない／OSI以外には出さない／出典・確認日が不正な事実は使わない／review・ratingを付けない／カテゴリが対応する値／空URLを出さない／検査の誤り検出）
- 下の5ページの「現行」と「修正案」を、同じ検査（Googleの必須・推奨と、OSSALTの方針）にかけた結果を各節に記載
- **未実施**：Google の Rich Results Test（この環境から到達できない）／実際のSERPでの表示の確認／全399ページへの適用の検証

## 次の判断（承認が要る）
1. 代表の5ページの修正案でよいか（特に、価格の事実の根拠の扱い、`offers.description` の文面）
2. 全ページへ広げる場合：価格の事実が無いツールは offers を出さない（＝多くのページから `offers` が無くなる）。リッチリザルトの条件を満たさないため、Google検索への直接の影響は小さいと推測するが、**実測はしていない**
3. 適用するときは、ページの見える部分にも、無料・有料の説明を合わせる（構造化データは、ページの内容と一致させる）

---

## Notesnook（/tools/notesnook/）

- ライセンス：GPL-3.0／カテゴリ：note-docs／確認済みの価格の事実：あり（official-statement、2026-10-31）
- 現行の検査：applicationCategory が、Googleの対応する値でない：ノート・ドキュメント
- 修正案の検査：問題なし。注記：Googleのソフトウェアアプリのリッチリザルトの条件（評価かレビュー）は満たさない。方針どおり（実在しないレビューを作らない）

現行：
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Notesnook",
  "url": "https://notesnook.com",
  "applicationCategory": "ノート・ドキュメント",
  "description": "Evernoteの代わりに使えるノートアプリ。ノートを端末側で暗号化してから同期するため、同期サーバーの管理者からも中身が見えない。同期サーバーは別のリポジトリで公開されていて自前でも動かせるが、開発元は「アルファ・サポートなし・手順書は未整備」としている。",
  "license": "GPL-3.0",
  "sameAs": "https://github.com/streetwriters/notesnook",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "JPY"
  },
  "isPartOf": {
    "@type": "WebSite",
    "name": "ossalt.jp",
    "url": "https://ossalt.jp"
  }
}
```
修正案：
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Notesnook",
  "url": "https://notesnook.com",
  "applicationCategory": "BusinessApplication",
  "description": "Evernoteの代わりに使えるノートアプリ。ノートを端末側で暗号化してから同期するため、同期サーバーの管理者からも中身が見えない。同期サーバーは自前で立てられる。",
  "license": "GPL-3.0",
  "sameAs": "https://github.com/streetwriters/notesnook",
  "offers": {
    "@type": "Offer",
    "price": 0,
    "priceCurrency": "JPY",
    "description": "ソフトウェア（セルフホスト版・アプリ）は無料で入手できます。公式のホスティング版や企業向けの有料の選択肢は、別に案内されています。"
  },
  "isPartOf": {
    "@type": "WebSite",
    "name": "ossalt.jp",
    "url": "https://ossalt.jp"
  }
}
```

## Vikunja（/tools/vikunja/）

- ライセンス：AGPL-3.0／カテゴリ：project／確認済みの価格の事実：あり（official-statement、2026-10-31）
- 現行の検査：applicationCategory が、Googleの対応する値でない：プロジェクト管理
- 修正案の検査：問題なし。注記：Googleのソフトウェアアプリのリッチリザルトの条件（評価かレビュー）は満たさない。方針どおり（実在しないレビューを作らない）

現行：
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Vikunja",
  "url": "https://vikunja.io",
  "applicationCategory": "プロジェクト管理",
  "description": "自分で所有できるタスク管理ツール。カンバン・ガント・リスト表示を備え、Asanaの代替としてチームのToDoを一元管理できる。",
  "license": "AGPL-3.0",
  "sameAs": "https://github.com/go-vikunja/vikunja",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "JPY"
  },
  "isPartOf": {
    "@type": "WebSite",
    "name": "ossalt.jp",
    "url": "https://ossalt.jp"
  }
}
```
修正案：
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Vikunja",
  "url": "https://vikunja.io",
  "applicationCategory": "BusinessApplication",
  "description": "自分で所有できるタスク管理ツール。カンバン・ガント・リスト表示を備え、Asanaの代替としてチームのToDoを一元管理できる。",
  "license": "AGPL-3.0",
  "sameAs": "https://github.com/go-vikunja/vikunja",
  "offers": {
    "@type": "Offer",
    "price": 0,
    "priceCurrency": "JPY",
    "description": "ソフトウェア（セルフホスト版・アプリ）は無料で入手できます。公式のホスティング版や企業向けの有料の選択肢は、別に案内されています。"
  },
  "isPartOf": {
    "@type": "WebSite",
    "name": "ossalt.jp",
    "url": "https://ossalt.jp"
  }
}
```

## Gitea（/tools/gitea/）

- ライセンス：MIT／カテゴリ：devtools／確認済みの価格の事実：あり（official-statement、2026-10-31）
- 現行の検査：applicationCategory が、Googleの対応する値でない：開発・デプロイ基盤
- 修正案の検査：問題なし。注記：Googleのソフトウェアアプリのリッチリザルトの条件（評価かレビュー）は満たさない。方針どおり（実在しないレビューを作らない）

現行：
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Gitea",
  "url": "https://gitea.com",
  "applicationCategory": "開発・デプロイ基盤",
  "description": "軽量な自前Gitホスティング。GitHubのコア機能（コード管理・Issue・PR・Actions相当のCI）を低スペックのサーバーでも動かせる。",
  "license": "MIT",
  "sameAs": "https://github.com/go-gitea/gitea",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "JPY"
  },
  "isPartOf": {
    "@type": "WebSite",
    "name": "ossalt.jp",
    "url": "https://ossalt.jp"
  }
}
```
修正案：
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Gitea",
  "url": "https://gitea.com",
  "applicationCategory": "DeveloperApplication",
  "description": "軽量な自前Gitホスティング。GitHubのコア機能（コード管理・Issue・PR・Actions相当のCI）を低スペックのサーバーでも動かせる。",
  "license": "MIT",
  "sameAs": "https://github.com/go-gitea/gitea",
  "offers": {
    "@type": "Offer",
    "price": 0,
    "priceCurrency": "JPY",
    "description": "ソフトウェア（セルフホスト版・アプリ）は無料で入手できます。公式のホスティング版や企業向けの有料の選択肢は、別に案内されています。"
  },
  "isPartOf": {
    "@type": "WebSite",
    "name": "ossalt.jp",
    "url": "https://ossalt.jp"
  }
}
```

## Vaultwarden（/tools/vaultwarden/）

- ライセンス：AGPL-3.0／カテゴリ：security／確認済みの価格の事実：あり（license、2026-10-31）
- 現行の検査：url が https の URL でない；applicationCategory が、Googleの対応する値でない：認証・パスワード管理
- 修正案の検査：問題なし。注記：Googleのソフトウェアアプリのリッチリザルトの条件（評価かレビュー）は満たさない。方針どおり（実在しないレビューを作らない）

現行：
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Vaultwarden",
  "url": "",
  "applicationCategory": "認証・パスワード管理",
  "description": "Bitwarden互換のパスワード管理サーバー（非公式・Rust製）。公式Bitwardenクライアントがそのまま使え、軽量で自宅サーバーでも動く。",
  "license": "AGPL-3.0",
  "sameAs": "https://github.com/dani-garcia/vaultwarden",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "JPY"
  },
  "isPartOf": {
    "@type": "WebSite",
    "name": "ossalt.jp",
    "url": "https://ossalt.jp"
  }
}
```
修正案：
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Vaultwarden",
  "applicationCategory": "SecurityApplication",
  "description": "Bitwarden互換のパスワード管理サーバー（非公式・Rust製）。公式Bitwardenクライアントがそのまま使え、軽量で自宅サーバーでも動く。",
  "license": "AGPL-3.0",
  "sameAs": "https://github.com/dani-garcia/vaultwarden",
  "offers": {
    "@type": "Offer",
    "price": 0,
    "priceCurrency": "JPY",
    "description": "ソフトウェア（セルフホスト版）は無料で入手できます。"
  },
  "isPartOf": {
    "@type": "WebSite",
    "name": "ossalt.jp",
    "url": "https://ossalt.jp"
  }
}
```

## n8n（/tools/n8n/）

- ライセンス：Sustainable Use License／カテゴリ：automation／確認済みの価格の事実：**なし**
- 現行の検査：applicationCategory が、Googleの対応する値でない：業務自動化
- 修正案の検査：問題なし。注記：offers なし（無料と確認できていないため。価格は推測しない）；Googleのソフトウェアアプリのリッチリザルトの条件（評価かレビュー）は満たさない。方針どおり（実在しないレビューを作らない）

現行：
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "n8n",
  "url": "https://n8n.io",
  "applicationCategory": "業務自動化",
  "description": "ノードを繋いで業務を自動化するワークフロー基盤。Zapierの代替として400以上のサービスと連携でき、AI機能も内蔵。セルフホストで無制限に使える。",
  "license": "Sustainable Use License",
  "sameAs": "https://github.com/n8n-io/n8n",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "JPY"
  },
  "isPartOf": {
    "@type": "WebSite",
    "name": "ossalt.jp",
    "url": "https://ossalt.jp"
  }
}
```
修正案：
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "n8n",
  "url": "https://n8n.io",
  "applicationCategory": "BusinessApplication",
  "description": "ノードを繋いで業務を自動化するワークフロー基盤。Zapierの代替として400以上のサービスと連携でき、AI機能も内蔵。セルフホストで無制限に使える。",
  "license": "Sustainable Use License",
  "sameAs": "https://github.com/n8n-io/n8n",
  "isPartOf": {
    "@type": "WebSite",
    "name": "ossalt.jp",
    "url": "https://ossalt.jp"
  }
}
```

