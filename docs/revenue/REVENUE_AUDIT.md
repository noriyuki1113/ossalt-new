# 収益化の監査（Revenue Strategy 2.0 / Phase 0）

調査日：2026-10-09 ／ 調べた範囲：このリポジトリのコード・ワークフロー・文書。公開中のサイトは作業環境から接続できないため**未確認**。

## 1. 本番との対応

- 本番（ossalt.jp）のソースはこのリポジトリ（`noriyuki1113/ossalt-new`、公開）。既定ブランチ `claude/ossalt-jp-setup-deploy-tsv3x8` へのpushで GitHub Pages に公開される。根拠は [Growth マスタープラン](../OSSALT_GROWTH_MASTERPLAN.md) の監査を参照。
- 候補に挙がっていた `noriyuki1113/ossalt-next` は、このセッションからアクセスできず**未確認**。
- Growth OS Phase 1（PR #2）は**未マージ・未公開**。今回の変更は PR #2 の上に積んでいる。

## 2. 技術の構成（収益に関係する部分）

| 項目 | 実態 |
|---|---|
| サーバー・DB・認証 | **なし**（Next.js の静的書き出し）。スポンサーの管理は JSON（`data-source/sponsors.json`）で行い、DBは追加しない |
| 計測 | Umami Cloud のカスタムイベント（Cookieなし）。`data-exclude-search` で URL の「?」以降を送らない |
| 集計値の取得 | Umami・A8.net・Search Console とも、この作業環境からは**取得できない**（APIキーなし） |
| 秘密情報 | リポジトリが公開のため、収益の実数・管理用の情報は置けない |

## 3. 既存の収益導線の監査

### 3-1. アフィリエイト（A8.net、国内VPS 4社）

| 確認項目 | 監査の結果（修正前） | Phase 1 の対応 |
|---|---|---|
| 提携先 | ConoHa・KAGOYA・さくら・Xserver の4社すべて提携済み（`src/lib/affiliates.ts`）。VPS以外の提携は**なし** | 変更なし（リンクの値は1文字も変えていない） |
| 配置 | ツール詳細（サーバー用のみ306/377。PR #2）、ブログ2本、Cost Labの結果（PR #2） | 変更なし |
| クリックの計測 | `affiliate_click` あり。**ブログの枠は placement が未指定で "unknown"** | `placement="blog"` を指定 |
| 表示の計測 | **なし**（クリック率が出せない） | `affiliate_viewable` を追加（画面内で見られたときだけ） |
| 広告の表示 | **ツール詳細の枠に「PR」の表示がない**。注記は枠の下に小さく「この記事にはアフィリエイトリンクが含まれる場合があります」（記事ではないページで、「場合があります」と曖昧） | 見出しに「PR」、枠の上に言い切りの注記（紹介料が入る、並び順の根拠）、aria-label、外部リンクの表示 |
| rel 属性 | `sponsored noopener noreferrer`（適切） | 変更なし |
| 無効なリンク | 作業環境から外部に接続できず**未確認**（リンクの値はA8の形式どおり） | 運営者がA8の管理画面の「リンクの確認」で確かめる |
| 重複の表示 | 1ページに1枠（ツール詳細・ブログ・Cost Labのどれか） | — |
| モバイル | 4社が縦に並ぶ長い枠になる（UX担当の指摘） | Phase 2 の候補（2社＋「ほか2社」） |
| 編集方針ページ | 「一部のブログ記事」としか書かれておらず、実態と違う | 実態に合わせて書き直し |
| 文脈 | 306ページで同じ文面 | 用途に合わせて前置きを1文変える小さな検証（R4） |

### 3-2. 内製広告（HouseAd）

サイト内のページへの誘導で、収益ではない。`house_ad_impression` が読み込みの時点で送られていた（見られたかどうかと無関係）→ 画面内で見られたときだけ送るように修正。

### 3-3. スポンサー

`/advertise/` はあるが、媒体資料の情報（掲載の形式・報告・お断りするもの）がなく、**スポンサー枠のコンポーネントは存在しなかった**。契約の実績は**なし**。古い計画（`docs/monetization.md`）は「直接スポンサー販売は当面行わない」だったが、今回の方針で見直した。

### 3-4. AdSense

未申請。Cookieを使わない方針と衝突する（Revenue Council R11：HOLD）。

## 4. 月間の流入と収益を把握できるか

| 指標 | 把握できるか | 見る場所 |
|---|---|---|
| 承認済みのアフィリエイト報酬 | **計測不可**（このシステムからは取れない） | A8.net の管理画面（運営者） |
| スポンサー収益 | 契約なし | — |
| 月間のPV・訪問数 | **このセッションでは不明** | Umami（運営者） |
| 検索流入 | **このセッションでは不明** | Search Console（運営者） |
| 運営の費用・工数 | 記録なし | — |

→ North Star の「月間営業利益」は、現時点では**計算できない**。計算の範囲と計画は [REVENUE_STRATEGY.md](REVENUE_STRATEGY.md) の KPI を参照。

## 5. 計測の設計（Phase 1 の後）

すべて Umami のカスタムイベント。計測の関数は `src/lib/analytics.ts`（`EVENTS` に一覧）に統一した。

| マスタープロンプトの候補 | 実装したイベント | データ | 備考 |
|---|---|---|---|
| page_view | （Umamiの標準のページビュー） | — | 追加しない |
| affiliate_impression | `affiliate_viewable` | path, placement, variant | 要素の50%以上が1秒以上画面に入ったとき、1表示1回。裏のタブでは数えない。「描画された」だけでは数えない |
| affiliate_click | `affiliate_click`（既存） | provider, path, label, placement, variant | **クリックであり、成約・承認ではない**。名前は既存の記録と比べられるよう変えない |
| sponsor_impression | `sponsor_viewable` | campaign, placement, slug | 同じ基準 |
| sponsor_click | `sponsor_click` | campaign, placement, slug | — |
| cost_lab_start | `cost_lab_start` | saas, oss | 最初に入力したとき1回 |
| cost_lab_complete | `cost_lab_result`（既存） | saas, oss, years, verdict, example | 金額は送らない |
| deployment_guide_click | **未実装** | — | 導入ガイドがまだない（R8、Phase 2） |
| advertise_inquiry | `advertise_inquiry` | via（mail） | メールのリンクを押した数。**送信の完了ではない** |

**ボット・重複の抑制**：Umami側のボット除外に加え、自動操作のブラウザ（`navigator.webdriver`）からは送らない。表示のイベントは1表示1回。個人の情報・入力した金額は送らない。

**イベント数の上限**：Umami Cloud の無料の範囲にはイベント数の上限がある（具体値は**未確認**）。表示のイベントが上限に近づいたら、表示のイベントから止める（批判役の中止の基準）。運営者が月に1回、Umamiの使用量を確かめる。
