# ossalt.jp 収益化ロードマップ

## 方針

ossalt.jp は「比較の信頼性」を最優先し、広告料金・紹介料と編集評価を分離する。

- ランキング、健全度、OpenSSF Scorecard、比較表の並び順は広告主の都合で変更しない
- 有料広告は `Sponsored / 広告` と明示する
- アフィリエイトリンクは `rel="sponsored"` を付ける
- 推測のPV・CTR・成約率を営業資料に使わず、Umamiの実測値を使う

## すでに使える収益導線

### 1. VPSアフィリエイト

ツール詳細ページの `VpsRecommendation` から国内VPSへ誘導する。

- ConoHa VPS: A8リンク設定済み
- Xserver VPS: A8リンク設定済み
- KAGOYA CLOUD VPS: アフィリエイトURL未設定
- さくらのVPS: アフィリエイトURL未設定

Umamiイベント: `affiliate_click`

まず未設定2社の提携・URL設定を完了し、30日間のクリック実績を取る。

### 2. 直接スポンサー

`/sponsor/` で広告メニューを公開する。

立ち上げ期の料金目安:

| メニュー | 料金目安 | 目的 |
| --- | ---: | --- |
| Sponsored Card | 9,800円/月〜 | 関連性の高い1ページで試す |
| Category Sponsor | 29,800円/月〜 | 関連カテゴリ・代替ページに複数掲載 |
| Partner | 個別見積 | 複数面・継続企画 |

広告枠はスポンサー未契約時にはハウス広告を表示する。
スポンサー契約後は `src/lib/sponsors.ts` に設定を追加すると同じ枠が有料広告へ切り替わる。

例:

```ts
export const SPONSOR_ADS: SponsorAd[] = [
  {
    id: "example-cloud",
    name: "Example Cloud",
    description: "セルフホスト向けの国内クラウド。",
    href: "https://example.com/",
    ctaLabel: "サービスを見る",
    placements: ["home_bottom", "alternative_*"],
  },
];
```

Umamiイベント:

- `house_ad_impression`
- `house_ad_click`
- `sponsor_ad_impression`
- `sponsor_ad_click`

イベントには `placement`、スポンサー広告には `sponsor_id` を付ける。

## 売上目標の進め方

### 0 → 月1万円

優先順:

1. `NEXT_PUBLIC_CONTACT_EMAIL=contact@ossalt.jp` を本番ビルドへ反映
2. KAGOYA / さくらのVPSのアフィリエイトURLを設定
3. ハウス広告を30日計測
4. Sponsored Cardを1社受注する、またはアフィリエイト成果を積み上げる

この段階ではAdSenseを増やさず、読者体験と検索流入を優先する。

### 月1万円 → 月5万円

- Sponsored Cardを2〜3社まで販売
- 関連性の高いページだけに広告を出す
- Umamiの実測値で「表示数 / クリック数 / CTR」を月次共有
- クリック実績のあるVPS導線を改善する
- Category Sponsorを1社獲得する

### 月5万円 → 月10万円以上

- Category Sponsorを複数カテゴリへ展開
- 長期契約（3か月・6か月）を提案
- アフィリエイトは成約実績のあるサービスを中心に改善
- スポンサー向け媒体資料を実測値ベースで作る
- 必要なら広告ネットワークは補助収益として検討する

## 毎月見る数字

- サイト全体PV
- `house_ad_impression`
- `house_ad_click`
- ハウス広告CTR
- `sponsor_ad_impression`
- `sponsor_ad_click`
- スポンサー広告CTR
- `affiliate_click`（provider別）
- アフィリエイト確定報酬
- スポンサー月額売上

広告枠の価格は、PVだけでなく「関連ページでどれだけ表示され、実際にクリックされたか」を基準に見直す。
