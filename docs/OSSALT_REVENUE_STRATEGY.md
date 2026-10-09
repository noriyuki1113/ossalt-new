# OSSALT 収益戦略

作成：2026-10-09（Phase 0）

## 1. 現状（事実）

- **承認済みの収益：計測不可**（A8.netの成果をこのシステムから取得できない。運営者の申告もない）。
- アフィリエイト：国内VPS 4社（ConoHa・KAGOYA・さくら・Xserver、すべてA8.net）。設定は `src/lib/affiliates.ts` の値をそのまま使う（1文字も変えない）。並び順は**最低月額の安い順**で、報酬額では並べない（プライバシーポリシーでの約束）。
- 表示箇所（Phase 1の後）：
  - ツール詳細：**自分のサーバーで動かすツールだけ**（306/377ページ）。パソコンのアプリ・道具・GPUが要るもの・アーカイブ済みには出さない（`src/lib/affiliate-context.ts`）。
  - Cost Lab：選んだOSSがサーバーで動かすものの場合だけ、結果の下に表示。
  - ブログ：`showVps: true` の記事（2本、公開は10/27・11/10）。
- AdSense：未申請。スポンサー：/advertise/ はあるが実績は未確認。
- すべての紹介枠に「広告・アフィリエイトを含む」表示（`AffiliateDisclosure`）。景品表示法のステルスマーケティングの規制（2023年10月〜）に配慮。

## 2. 収益の導線

```
検索・SNS・AI（MCP） → 代替ページ / ツール詳細 / 比較
   → （費用で迷う）Cost Lab → 結果 → 国内VPSの紹介（サーバーで動かすOSSのとき）
   → （そのまま導入を考える）ツール詳細のVPSの紹介
```

**原則**：関係のないページに紹介枠を出さない。読者がサーバーを必要とする場面でだけ紹介する。

## 3. 計測のイベント（Umami、Cookieなし）

| イベント | いつ | データ |
|---|---|---|
| `affiliate_click` | VPSの紹介枠のリンクを押した | provider, path, label, **placement**（tool_detail / cost_lab / blog など。Phase 1で追加。未指定は unknown） |
| `cost_lab_entry` | ツール詳細・代替ページからCost Labへのリンクを押した | from（tool_detail / alternative） |
| `cost_lab_result` | Cost Labで最初に結果が出た（1回の訪問で1回） | saas, oss, years, verdict, example（仮入力かどうか）。**金額は送らない** |
| `cost_lab_example` | 「例の値を入れる」を押した | — |
| `cost_lab_link_click` | 結果の下の「次に確かめること」を押した | to（tool / alternative / guide） |
| 既存 | 診断（diagnosis_*）、ブログ（blog_share, blog_helpful）など | — |

Umamiの計測には `data-exclude-search="true"` を付け、URLの「?」以降（Cost Labの共有URLの金額など）を送らない。

**クリックと収益を混同しない**：affiliate_click はクリック数であり、成約・承認ではない。

## 4. KPIと確かめ方（運営者の手作業）

このシステムからは数値を取得できないため、**週に1回、運営者が次を確かめる**。数値は**公開リポジトリに置かない**（手元のメモや非公開の表に記録する）。

| 指標 | 見る場所 |
|---|---|
| 承認済み収益（最重要） | A8.netの管理画面（成果・承認） |
| affiliate_click（placement別） | Umamiの「イベント」 |
| cost_lab_entry（from別）・cost_lab_result | Umamiの「イベント」 |
| 検索からの訪問・表示回数・CTR | Search Console |
| ページ別の閲覧数 | Umami |

### 中止・縮小の基準（批判役の提案を、運営者が実数で決める）

- Cost Lab：公開から3か月で、cost_lab_result が極端に少ない（ツール詳細の閲覧に比べて）なら、導線を縮小する。
- ツール詳細のVPS枠：placement=tool_detail のクリックが、ほかの枠に比べて極端に少ないなら、表示の条件をさらに絞る。
- 具体的な閾値は、最初の1か月の実数を見て運営者が決める（仮の数値を置かない）。

## 5. 新しい収益源の判断

| 候補 | 判断 | 理由 |
|---|---|---|
| AdSense | RESEARCH（12/10に判断） | Cookieを使わない方針・同意の仕組みの手間と、流入の実数から見込める額を比べる |
| スポンサー枠 | 今は見送り | 流入が増えたら再検討 |
| 収益ダッシュボード | 見送り | データの取得手段がない |
| Monetization Gateway（x402） | 見送り | AIへの露出（引用）を優先する段階。別サービス（jp-biz-tools）で検討 |
