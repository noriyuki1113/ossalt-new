# Revenue Council（収益化の6役割の会議）

記録：`docs/revenue/council/*.json` ／ 月次レビュー：`docs/revenue/monthly/*.json` ／ 検査：`src/lib/revenue-council.ts`（テストで全記録を検査）

Growth OS の [Agent Council](../OSSALT_AGENT_COUNCIL.md) と**同じ6役割・同じ独立性の担保・同じ「公開してはいけない内容」の検査**を使う。違うのは、採点の項目と行動だけ。

## 1. 役割（収益化の会議での基本原則）

| ID | 役割 | 基本原則 |
|---|---|---|
| `chief_editor` | Chief Editor | 読者に利益がない収益化施策は採用しない |
| `seo_strategist` | SEO Strategist | SEOを犠牲にした短期収益施策を認めない |
| `revenue_officer` | Revenue Growth Officer | 具体的な利益につながる施策を優先する |
| `ux_designer` | UX Designer | 収益導線は自然で、ユーザーが納得して選択できるものにする |
| `automation_architect` | Automation Architect | 計測できない施策は改善できない |
| `critical_investor` | Critical Investor | 売れる証拠がない商品を大規模開発しない（撤退の基準を必ず書く） |

**独立性**：役割ごとに別のサブエージェントを起動し、同じ監査ブリーフ（事実のみ）を渡す。ほかの役割の結果は読ませない。1つの結論を6人分に複製しない。

## 2. 採点と行動

- 採点（0〜100）：収益可能性、ユーザー価値、SEOへの影響、ブランドの信頼、開発の軽さ、維持の軽さ、収益化までの早さ、**判断根拠の信頼度**。
- **点数は実測ではなく、各役割の専門的な判断**（記録の `scores_note` に必ず書く）。
- 行動：BUILD（開発）／TEST（小規模の検証）／RESEARCH（追加の調査）／IMPROVE（既存の改善）／HOLD（保留）／REJECT（不採用）。
- 各役割は賛成の理由と反対の理由を必ず書く。批判役は撤退の基準も書く。

## 3. 集計と最終判断（`aggregateRc`）

- 総合点：重み（収益0.2、ユーザー0.2、信頼0.2、SEO0.1、開発0.1、維持0.1、早さ0.1）の点を、判断根拠の信頼度で重みづけした平均。
- 多数の行動：同数なら慎重な側（HOLD → RESEARCH → REJECT → TEST → IMPROVE → BUILD）。
- 人の判断が必須：批判役が信頼度60以上で REJECT か HOLD なのに、多数が BUILD か IMPROVE の場合。評価が6役割そろわない場合。
- **多数決だけで決めない**：最終判断が多数と違う場合や強い反対がある場合は、`dissent_handling` に、反対をどう扱ったかを書く（検査で必須）。

## 4. 2026-10-09 の会議の結果（`council/2026-10-09-revenue-phase0.json`）

| 提案 | 役割の行動（編集・SEO・収益・UX・自動化・批判） | 最終判断 |
|---|---|---|
| R1 媒体資料の初版 | IMPROVE・IMPROVE・BUILD・IMPROVE・IMPROVE・IMPROVE | IMPROVE（実施） |
| R2 スポンサー枠の部品 | HOLD・HOLD・BUILD・BUILD・HOLD・HOLD | **BUILD（最小限で実施。多数と違う）** |
| R3 既存のアフィリエイト表示の修正 | BUILD・BUILD・BUILD・BUILD・BUILD・BUILD | BUILD（実施） |
| R4 用途に合わせたVPS枠の文言 | TEST・TEST・TEST・TEST・TEST・TEST | TEST（実施） |
| R5 計測の統一 | IMPROVE・IMPROVE・BUILD・IMPROVE・BUILD・IMPROVE | BUILD（実施） |
| R6 試験スポンサー商品の今すぐの販売 | REJECT・REJECT・HOLD・HOLD・REJECT・RESEARCH | HOLD |
| R7 Revenue Dashboard | REJECT・REJECT・REJECT・REJECT・HOLD・REJECT | HOLD（Phase 2で再判断） |
| R8 収益につながる記事 | BUILD・BUILD・BUILD・BUILD・TEST・BUILD | BUILD（Phase 2） |
| R9 Intelligence の需要検証 | RESEARCH・RESEARCH・RESEARCH・RESEARCH・RESEARCH・RESEARCH | RESEARCH（設計のみ） |
| R10 VPS以外のアフィリエイト | RESEARCH・RESEARCH・RESEARCH・RESEARCH・RESEARCH・RESEARCH | RESEARCH |
| R11 AdSense | HOLD・HOLD・RESEARCH・HOLD・HOLD・RESEARCH | HOLD |
| R12 A8の成果の手入力 | HOLD・IMPROVE・IMPROVE・IMPROVE・TEST・IMPROVE | TEST（運用の手順のみ） |
| R13 会議の記録形式 | IMPROVE・IMPROVE・IMPROVE・IMPROVE・IMPROVE・IMPROVE | IMPROVE（実施） |

評価の全文（賛成・反対の理由、条件、撤退の基準）は記録の JSON を参照。

### 主な対立

1. **スポンサー枠を今作るか（R2）**：UX・収益は「器だけ先に作り、何も出さずに待つ」、編集・SEO・自動化・批判は「契約0件のための先行開発」としてHOLD。→ 運営者の指示（Phase 1 に「広告表示コンポーネントの基礎」）があるため、**表示0件・DBなし・管理画面なし・契約の確認日が必須**という最小限で実施し、反対を記録した。
2. **何から伸ばすか**：収益担当は「VPSの成約1件の報酬は、仮価格 月5,000円のスポンサー枠より大きくなり得る。まずVPSの導線」。批判役は「コードを書かない個別の打診で需要を確かめる」。→ Phase 1 はVPSの表示と計測を直し、スポンサーの販売は計測の実数がそろうまで保留。
3. **イベント名（R5）**：自動化担当は `ad_view` / `ad_click` にまとめる案。→ 既存の `affiliate_click` の過去の記録と比べられなくなるため、名前は変えず一覧で管理する形にした。
4. **ダッシュボード（R7）**：5役割が REJECT。自動化担当は「非公開リポジトリ＋Cloudflare Access、最初は月次の集計を Issue に投稿するだけ」の構成案を出した。→ Phase 2 で、手入力の記録（R12）が続いてから再判断。

### 役割ごとの新しい提案（今後の候補）

- 編集：広告表示のルールを1ページに集約／導入ガイドの品質基準と確認日／「セルフホストしないほうがよい場合」
- SEO：Search Console の月次確認とインデックスの方針の棚卸し／予約投稿10本の内部リンクの設計／VPS枠とA8の計測画像の表示速度への影響
- 収益：Cost Lab の結果からのVPSのクリックを優先して見る／代替ページにも、サーバー用のツールのときだけVPS枠／内製広告の誘導先の見直し
- UX：AdLabel（**実施**）／モバイルでVPS枠を2社＋「ほか2社」に／「VPSが要らない人」への一言
- 自動化：イベントの型付きの定義（**一部実施**：`EVENTS`）／Umamiの使用量の月次確認／収益に関係するページの公開前の点検
- 批判：PR #2 を先に公開して実数を1回見る／表示はあるがクリック率が低いページの改善／収益施策の月の作業時間の上限

## 5. 月次レビュー（将来）

`docs/revenue/monthly/YYYY-MM.json`（ひな形：`TEMPLATE.json`）。項目は、今月の収益・前月比・収益源別・伸びたコンテンツ・悪かった施策・コスト・各役割の評価・改善・中止・翌月の計画、と**データの不足**。

- 収益の指標（月間収益・承認済み報酬・スポンサー収益・利益・RPM）は、**数値を持てない**（検査でエラー）。状態は「非公開（運営者の手元で管理）」か「計測不可」。
- 計測していない指標に数値を入れられない。AIはデータが足りないときは `data_gaps` に書き、架空の売上やアクセス数を作らない。
