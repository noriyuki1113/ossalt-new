# OSSALT Agent Council

作成：2026-10-09（Phase 0）／ 記録：`docs/council/*.json` ／ 検査：`src/lib/council.ts`・`council.test.ts`

## 1. 6つの役割

| ID | 役割 | 評価の軸 |
|---|---|---|
| `chief_editor` | Chief Editor（読者第一、実用性） | この記事・機能で、読者は具体的に何ができるようになるか |
| `seo_strategist` | SEO Strategist（慎重、データ主義） | 検索意図・重複・インデックス品質。実績がなければ「仮説」と明記 |
| `revenue_officer` | Revenue Growth Officer（投資対効果） | どの仕組みで収益につながるか |
| `ux_designer` | UX & Product Designer（初心者目線） | 初めての人が、必要な情報を見つけられるか |
| `automation_architect` | Automation Architect（保守性） | 既存の処理の再利用、保守の負担、コスト |
| `critical_investor` | Critical Investor（懐疑的） | なぜ他サイトではなくOSSALTか。中止の基準 |

**独立性の担保**：Claude Code のサブエージェントを役割ごとに別々に起動し、同じ監査ブリーフ（事実のみ）を渡す。ほかの役割の結果ファイルは読ませない。同じ出力を6人分に複製しない。

2026-10-09 の Phase 0 で実際にこの方式で評価し、独立評価のうち2役割（UX・収益）が、統括（lead）の監査の誤り（「VPSの導線は0」）をコードから見つけて訂正した。

## 2. 評価の方式

各役割が、候補ごとに次を0〜100で採点する：`user_value`, `revenue_potential`, `seo_opportunity`, `differentiation`, `implementation_cost`（高いほど軽い）, `maintenance_cost`（高いほど軽い）, `confidence`。さらに行動（BUILD / WRITE / IMPROVE / RESEARCH / REJECT）、根拠、反対意見を書く。批判役は中止の基準（kill_criteria）も書く。

### 集計（`aggregate()`）— 単純な平均にしない

- 総合点：重み（ユーザー価値0.25、収益0.2、SEO0.15、差別化0.15、実装0.1、保守0.15）の点を、**各役割の確からしさで重みづけ**した平均。
- 推奨の行動：役割ごとの行動の多数決。同数なら慎重な側（RESEARCH → REJECT → IMPROVE → WRITE → BUILD）。
- 人の判断が必須（`dissent`）：批判役が確からしさ60以上で REJECT なのに多数決が REJECT でない場合／評価が6役割そろわない場合。
- **最終判断**（`decision`）は、運営者（owner）か統括（lead）が理由・工数の見積もり・検証の指標とともに記録する。役割の見解が違う理由を残す。

## 3. 品質ゲート

1. 事実と推測の分離（ブリーフは事実のみ。仮説は「仮説」と明記）
2. 公開してはいけない内容の検査（収益の金額・メールアドレスをテストで機械的に検出。リポジトリは公開）
3. 形式の検査（6役割分の評価、0〜100、行動の値、判断の理由）
4. 記事の公開は、初期状態では**人の承認が必須**（Phase 3以降の新しい種類の記事。既存の週次の解説追加は、点検・テストを通ったものだけを公開する現行の運用を維持）

## 4. データの構造（`CouncilRecord`）

```
{ session, date, summary, overalls: {役割: 全体所見},
  candidates: [{ id, title, problem（課題）, proposal（提案）, audience（対象ユーザー）,
                 evidence（根拠URL）, expected_effect, revenue_link（収益へのつながり）,
                 evaluations: [{ agent, scores, action, rationale, objection, kill_criteria? } ×6],
                 decision: { action, decided_by, reason, effort_hours_estimate, success_metrics, phase, status } }] }
```

管理画面は作らない（静的サイト・公開リポジトリのため非公開にできない）。記録はGitHub上のJSONで確認する。

## 5. Phase 0 の結果（`docs/council/2026-10-09-phase0.json`）

| 候補 | 多数の行動 | 統括の判断 | 主な対立 |
|---|---|---|---|
| C1 Cost Lab | BUILD（5/6） | BUILD・Phase 1 | 批判役：推測の初期値は信頼を削る → 既定値なし・仮入力の明示で対応 |
| C2 VPS導線を文脈に | BUILD/IMPROVE（6/6） | IMPROVE・Phase 1 | SEO：解説のない薄いページ＋広告の形を懸念 → P3の基準と合わせてPhase 2で再確認 |
| C3 導入ガイド | RESEARCH（3）／REJECT（批判役） | RESEARCH | 収益・自動化はWRITE。検証できない手順は出さない |
| C4 計測の整備 | BUILD（4/6） | BUILD・Phase 1 | — |
| C5 評価の記録 | REJECT（3/6） | BUILD（最小限）・Phase 1 | 読者価値なしの反対を記録。運営者の指示のため、JSONとテストのみで実施 |
| C6 更新の監視 | 分かれる | RESEARCH・Phase 2 | 批判役：ライセンス変更の検知だけなら可 |
| C7 内部リンク | BUILD/IMPROVE | IMPROVE（一部Phase 1） | — |
| C8 収益ダッシュボード | REJECT（6/6） | REJECT | — |
| C9 OSS 20件の追加 | 分かれる | RESEARCH・Phase 2 | 掲載の追加（増やす）とC10（薄いページを減らす）が逆向き |
| C10 インデックス品質 | IMPROVE（6/6） | IMPROVE・Phase 2 | 収益：noindexで導線つきページの流入が消える懸念 |
| C11 スポンサー枠 | REJECT/RESEARCH | REJECT（今は） | — |
| C12 AdSense | RESEARCH（4/6） | RESEARCH（12月） | Cookieを使わない方針とのトレードオフ |

## 6. 今後（Phase 3〜4）

候補の作成（点検・データの変化・Search Console）→ 6役割の独立評価（サブエージェント）→ 下書き → 事実確認 → **人の承認** → 公開 → 成果の追跡。1日の候補は3〜5件、重複は除外、価値のある変化がない日は作らない。AIの利用量に上限を設け、失敗時の再試行・停止の条件を決める。
