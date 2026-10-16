# OSSALT × OSS Intelligence Watch — 統合監査と導入方針

## 事業上の優先順位

- **OSSALT.jp が唯一のメインブランド・集客・収益化の中心。**
- OSS Intelligence Watchは、長期実測、変化検知、証拠データのための裏方とする。
- OSSALTにはすでに377掲載OSS（2026-10-15の public/data/meta.json）、153代替SaaS、
  Star増減の履歴・比較・セキュリティ評価がある。これらをWatchに置換しない。
- 長期履歴の欠損、閾値アラート、根拠つき重要な変化に限定して段階的に統合する。

## 実際のID照合

2026-10-16付のWatch日次アーカイブ20件とOSSALT元カタログ389件を
GitHub owner/repoの **完全一致**で照合した結果、次の5件が一致した。

| WatchのGitHub repo | OSSALTのツールID |
| --- | --- |
| ggml-org/llama.cpp | llama-cpp |
| microsoft/playwright | playwright |
| ollama/ollama | ollama |
| prometheus/prometheus | prometheus |
| vllm-project/vllm | vllm |

**残り15件は現在のOSSALTカタログと一致しない。**
したがって、現状のWatch対象をそのまま反映してもOSSALTの377掲載OSSを十分に強化できない。
次にWatch側の監視対象を、OSSALTの利用者が探すSaaS代替プロジェクトへ最適化する。

対象OSSの選定はページ需要（Search Console）、代替SaaSの重要性、運用負担、
GitHub APIの取得限界に基づく。既存Watch履歴の削除・過去値の捏造は行わない。

## Phase A：安全な読み取り専用の橋（本PR）

`scripts/osswatch-bridge.mjs` は、Watchの `archive/snapshots/YYYY-MM-DD.json`
を手元に用意したときにだけ使用する**オフラインの照合・検証ツール**。

監査だけ（保存せず、既存サイトは変更しない）：

    node scripts/osswatch-bridge.mjs --snapshot path/to/2026-10-16.json

ホワイトリスト化した結果を明示的に出力する場合：

    node scripts/osswatch-bridge.mjs --snapshot path/to/2026-10-16.json --out reports/private/osswatch-observations.json

- Match条件: GitHub owner/repo の完全一致（名前・説明文の類似マッチをしない）
- ソースURL・UTC観測日時・数値・アーカイブ状態を検査
- 生APIレスポンスやトークンなどを転記しない
- リリース未取得は未取得のまま（0件と解釈しない）
- OSSALT側のStar、健全度、Scorecard、リリース数、既存履歴には**書き込まない**
- Watchのデータは外部からの入力として検証し、読み込み失敗時は処理中断
- `--out` を指定しない通常実行は互換性監査（dry-run）であり何も変更しない
- この段階ではWatchの非公開リポジトリを公開せず、公開API・画面への自動同期も行わない

## Phase B：OSSALTに合う監視対象への変更（次段階）

1. 重要なSaaS代替OSSをOSSALTの実データから優先リスト化する。
2. Watchの既存20件・履歴を維持したまま対象を段階的に追加。
3. 監視データの取得障害、履歴不足、最終観測日時を区別する。
4. 検証済みのWatchアラートだけをOSSALT上に表示（情報の根拠・最終取得日を必須表示）。
5. 検索流入の重複を避ける。OSSALTへ関連リンクを優先し、Watchの公開ページの扱いは
   既存Search Console状況を見て別途判断。確認なしに301/410を設定しない。

## Phase C：収益につながるUX

- お気に入りのOSSの変化一覧、意味のある更新通知、移行前チェックリスト
- まだ実装していない機能や安全性の保証を過大に表示しない
- 無料のRSSから使い始め、継続利用が確認できたら有料アラート・B2Bを検証

## 注意

GitHubのStar数は利用数・性能の優劣を示さない。
Watchの最新安定版APIにはtag-only、pre-releaseは含まれない。
`data-source/tools.json` の389件は、除外・アーカイブ等を適用する前の元データ数で、
公開サイトの377掲載OSSとは定義が違う。

本PRではWebサイト、広告導線、運営ドメイン、本番のデータ収集スケジュールは変更しない。
