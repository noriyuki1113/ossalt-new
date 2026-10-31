# Claude SEO と OSSALT の品質管理の連携（運用手順書）

最終確認：2026-10-31。Claude SEO の仕様は、公式リポジトリ（AgriciDaniel/claude-seo、v2.5.0、コミット 6be93f4・2026-10-22）の README・docs/INSTALLATION.md・SECURITY.md・PRIVACY.md・各 SKILL.md・requirements.txt・install.sh・hooks・agents を取得して確認しました。**オーナーの承認（条件付き）のもと、このClaude Code実行環境（クラウド）にプラグインを導入し、ヘルパースクリプトの試験を1ページで実施しました（11章）。** この環境は一時的なもので、セッションが終わると導入は失われます。

## 1. 方針（変えない条件）

- 既存の仕組みを使い、重複する基盤を作らない。Claude SEO は、**専門監査の補助（任意）**
- GitHub Actions の定期実行を新設・有効化しない。すべて手動
- 有料のSEO API・LLM API を、新たに契約・自動で呼び出さない
- 本番デプロイ・PRのマージ・noindex・canonical・robots・URLの大量変更は、オーナーの承認を待つ
- Search Console の認証情報・数値を、公開リポジトリ・PR・ログに出さない（`agency/data/`・`agency/reports/`・`reports/seo/` は Git管理外）
- 全ページ（399）への一括実行をしない。**1ページずつ、手動、上位5ページまで**
- Claude SEO が使えなくても、既存の無料監査だけで運用できる（8章）

## 2. 既存の仕組みと、役割の分担（重複の整理）

| 仕組み | 役割 | 入力 | 出力（Git管理外のもの） |
| --- | --- | --- | --- |
| `.claude/skills/ossalt-seo`（5部門の承認制） | 運用の規則・承認ゲート。**そのまま維持** | — | `agency/reports/` |
| `scripts/seo-audit.mjs` | 全ページの技術SEO・内部リンク（読み取り専用） | `out/` | `agency/reports/audit.md` |
| `scripts/page-audit.mjs` | 重要ページのブラウザ監査（axe・JSON-LD・LCP/CLS）。`--only <URL>` で1ページ | `out/` | `reports/seo/` |
| `scripts/tool-pages-audit.mjs` | OSS詳細399ページの一括監査 | `out/` | `reports/seo/` |
| `scripts/quality/qi.mjs`（Quality Intelligence） | OSS詳細の品質の基準（独自性・正確さ・判断材料・SEO・使いやすさ）と履歴 | `out/`、GSC CSV（任意） | `reports/quality/`、`quality/history/`（数値なし） |
| `scripts/seo-agency.mjs` ＋ `seo-priority.mjs` ＋ `gsc-weekly-report.mjs` | GSCのCSV → 候補と採点（クエリ別・ページ別。結び付けない） | GSC CSV | `agency/reports/` |
| `scripts/gsc-api-fetch.mjs` | Search Console API（読み取り専用）→ CSV。**認証情報は未発行** | キー（環境変数） | `agency/data/` |
| `scripts/seo-ledger.mjs` | 公開した変更の記録と、28日・約90日の確認期限（数値は書かない） | — | `agency/ledger.json`・`LEDGER.md` |
| **`scripts/seo-specialist-queue.mjs`（今回の追加）** | QIの品質の欠点 ＋ GSCのページ別実績 ＋ 修正の見込み ＋ 範囲 ＋ 信頼度から、専門監査に回す候補を最大10件選ぶ | QIの最新の監査 | `reports/seo/integration/` |
| **Claude SEO（任意・今回は未導入）** | 専門監査の補助。`page`・`content`・`schema`・`geo` を、1ページずつ | 公開URL | 利用者の端末。結果は `agency/templates/SPECIALIST.md` の様式で記録 |

重複を避ける線引き：
- 「何を直すか」の優先順位は、既存の QI・`seo-agency`・新しい `seo-specialist-queue` が決める。Claude SEO は、**優先順位を決めない**
- 全件の監査・履歴・差分は QI。Claude SEO では行わない（`/seo audit`・`/seo drift` は使わない）
- 変更の記録と効果の測定は `seo-ledger.mjs`。Claude SEO の `drift`（SQLite）は使わない

## 3. Claude SEO の調査結果（2026-10-31に確認）

| 項目 | 内容（出典） |
| --- | --- |
| 概要 | Claude Code 用の、MITライセンスのSEO監査プラグイン。26のサブスキル・19のエージェント。バージョン 2.5.0（`plugin.json`） |
| 導入の前提 | Claude Code 1.0.33以降、Python 3.11〜3.14、git（INSTALLATION.md） |
| 導入 | `/plugin marketplace add AgriciDaniel/claude-seo` → `/plugin install claude-seo@agricidaniel-claude-seo` → `/seo setup`。プラグインのインストール自体はパッケージマネージャーを実行しない。`/seo setup` が、**専用のPython環境とヘッドレスのChromiumを、プラグインのデータ領域に作る**。`/seo doctor` は読み取り専用の確認 |
| 手動導入 | `git clone` ＋ `install.sh`。`~/.claude/skills/seo*`・`~/.claude/agents/seo-*.md`・`~/.claude/skills/seo/.venv/` に書く（`curl | bash` の形は、公式も「確認してから実行」と注意） |
| 主な依存 | beautifulsoup4・requests・lxml・playwright・trafilatura・matplotlib・numpy・weasyprint・openpyxl・pillow・google-api-python-client・google-auth・google-analytics-data・**google-ads**（requirements.txt）。範囲指定つき |
| 権限・副作用 | ① 編集・書き込み（Edit/Write）のたびに、`validate-schema.py` を実行する **PostToolUse フック**（`hooks.json`、30秒の上限）② 指定したURLへのHTTP取得（SSRF・DNS再バインド対策あり。ローカル・内部アドレスは拒否）③ `/seo google` でOAuth連携すると、`~/.config/claude-seo/oauth-token.json`（0600）にトークンを保存 |
| 任意の拡張（有料の外部サービスを含む） | DataForSEO・SE Ranking・Profound・Bing Webmaster・Moz など。**使わない** |
| 並列実行 | `/seo audit` は、最大17のエージェントを並列に動かす。専門のエージェントには Opus を使うものがある（content・geo・cluster・sxo・drift）。**利用者の Claude Code の利用枠を、まとめて消費する** |
| 既知の制約（公式） | Playwright/Chromium のDNS再バインドの残余リスク、プロキシ下ではDNSの固定が弱まる、IPv6のみのサイトは失敗する（SECURITY.md） |
| 未確認 | ① 私は、プラグインのコードを実行・精査していない（READMEと各SKILL.mdの記載を読んだのみ）② Google の現行ガイドライン（この環境から到達できない）③ `/seo page` 等の実際の出力の品質 |

## 4. 導入の手順と、オーナーの承認事項（導入の前に）

導入は**あなたの端末の Claude Code**で行います（このクラウドのセッションからは実行できません）。次の承認を、先にお願いします。

承認してほしいこと：
1. あなたの端末に、`~/.claude` 配下のスキル・エージェント・専用のPython環境・Chromiumが、追加されること（数百MBの見込み。未計測）
2. Edit/Write のたびに、スキーマの検証のフックが動くこと（ほぼ無害ですが、すべての編集で動きます）
3. Claude Code の利用枠を、専門監査のために使うこと（1ページあたりの量は未計測。5ページまで）
4. 外部のSEOサービス（有料）・Google の認証（`/seo google setup`）を**使わない**こと

手順：
```text
# Claude Code の中で
/plugin marketplace add AgriciDaniel/claude-seo
/plugin install claude-seo@agricidaniel-claude-seo
/seo setup          # 専用のPython環境とChromiumを作る（1回）
/seo doctor         # 読み取り専用の確認。失敗したら、導入を止めて報告
```
取り消し：`/plugin uninstall claude-seo@agricidaniel-claude-seo` と `/plugin marketplace remove AgriciDaniel/claude-seo`。

## 5. 使い方の制限（予算）

- 対象は、**`seo-specialist-queue` の上位から、最大5ページ**。1ページずつ、順番に
- 使うコマンド：`/seo page <URL>`、必要に応じて `/seo content <URL>`・`/seo schema <URL>`・`/seo geo <URL>`
- **使わないコマンド**：`/seo audit`（並列のフル監査）、`/seo drift`、`/seo google …`、`/seo backlinks`・`/seo seranking`・`/seo profound`・`/seo bing`・`/seo image-gen`・`/seo unlighthouse`、`/seo cluster`・`/seo programmatic`・`/seo competitor-pages`（新規ページの量産につながるため）
- 対象URLは `https://ossalt.jp/...` の公開ページ。ローカルの `out/` を配信して試すときは、公式の許可リスト `CLAUDE_SEO_LOCAL_TARGETS=127.0.0.1:<ポート>`（最初のURLだけが対象。生のHTTP取得のみで、Chromiumでの描画は不可）を使う
- 次のときは、**費用・理由を示して停止**し、承認を待つ：有料のAPI・拡張が必要／追加のエージェントの並列実行が必要／認証情報が必要／5ページを超える
- 1回の作業は、5ページ以内。次の回は、前回の結果を記録し、実測の確認（28日）が済んだページを優先する

## 6. 結果の記録（様式）

`agency/templates/SPECIALIST.md` に、1ページずつ記録する。指摘ごとに、次の6項目をそろえる：**観測事実／問題の根拠／推奨変更／信頼度／期待する効果／検証方法**。ほかに、対象URL・確認日時・実行の経路（実行した、または未実行）を書く。保存先は `agency/reports/claude-seo/<日付>/`（Git管理外）。

- 検索実績の**数値は書かない**（順位帯などの相対的な表現にとどめる）。数値は `agency/data/`（非公開）
- **AI検索での引用されやすさは、推測として書き、実際の引用の結果と混同しない**。観測した事実（クロール許可・llms.txt・Markdown版・本文の構造）と、推測を、別の見出しに分ける
- Claude SEO の出力は、そのまま採用しない。一次情報（公式のGitHub・ドキュメント・LICENSE）で、1つずつ確かめる

## 7. 毎回の運用（手動のコマンド）

```bash
# 0) 準備（最新のデータでビルドして、全件を監査）
git checkout claude/ossalt-jp-setup-deploy-tsv3x8 && git pull
NEXT_PUBLIC_FEATURE_FOR_YOU=1 npm run build
npm run qi:full                      # 全件の品質監査（reports/quality/、履歴は quality/history/）
node scripts/seo-audit.mjs --out agency/reports/audit.md
node scripts/tool-pages-audit.mjs --out-dir reports/seo/integration/tool-pages
node scripts/page-audit.mjs --out-dir reports/seo/integration/page-audit

# 1) 実績の取り込み（手元のCSV。数値はGit管理外）
node scripts/seo-agency.mjs --queries agency/data/<export>/クエリ.csv --pages agency/data/<export>/ページ.csv \
  --period "過去28日間（<export>。ウェブ・全国・全デバイス）" --site out --out agency/reports/weekly-<日付>.md
#   ページCSVの非ブランド化を、GSCの画面で確かめていなければ --pages-nonbrand-confirmed は付けない

# 2) 専門監査に回す候補（最大10件）
npm run seo:queue -- --json reports/seo/integration/queue.json
#   → reports/seo/integration/queue.md（点数の内訳は、実測／仮説の区分つき）

# 3) 上位5ページを、1ページずつ専門監査（Claude SEO、または8章の手動）
#   Claude Code で： /seo page https://ossalt.jp/tools/<id>/  など（5章の制限の範囲）

# 4) 承認された改善だけを、PRにする（既存ページ最大2件。公式の一次情報で根拠を確認）
npm test && npm run build && node scripts/seo-audit.mjs --strict && node scripts/content-check.mjs  # content-check は docs/content-check.md を書き換える。差分は戻す
node scripts/quality/qi.mjs one <id>

# 5) 公開（マージ）後、変更を記録し、28日・約90日の確認期限を管理
node scripts/seo-ledger.mjs add --date <公開日> --url https://ossalt.jp/tools/<id>/ --query "<対象のクエリ>" \
  --change "<変更内容と根拠>" --pr <PRのURL> --window "<比較の条件。期間・ウェブ・全国・全デバイス>"
node scripts/seo-ledger.mjs due
node scripts/seo-ledger.mjs record --id <番号> --stage 28 --outcome improved|flat|worse|not-assessable --note "<他の変更・季節の影響>"
```

### 候補の点数（`seo-specialist-queue`）

`点数 = 信頼度 × (0.40×検索実績 ＋ 0.30×品質の欠点 ＋ 0.15×修正の見込み ＋ 0.15×範囲)`。**重みはOSSALT独自の仮説**で、順位・流入の改善を予測・保証しません（重みは `scripts/seo-specialist-queue.mjs` の `WEIGHTS`）。

| 項目 | 区分 | 中身 |
| --- | --- | --- |
| 検索実績 | 実測 | ページ別のGSC（表示・順位・同順位帯のCTR中央値との差。`seo-priority.mjs` を再利用）。行が無いページは「未確認」（0とは区別）。クエリとは結び付けない |
| 品質の欠点 | 実測 | QIの点数の不足分。ミラー・用語・リンク切れ・件数の食い違いの警告は、別に上乗せ |
| 修正の見込み | 仮説 | 欠点の種類で分類（データ・出典／用語・整合／解説の追加／要約の追加） |
| 範囲 | 仮説 | 同じ警告を持つページの数（実測）を、対数で重み付け |
| 信頼度 | 実測 | 検索実績が無い→0.5、表示が少ない→0.7、解説が公式資料と未照合→×0.85 |

除外：アーカイブ済み（掲載の扱いは承認事項）、28日の確認が済んでいない変更済みのページ（効果の測定を乱さない）、欠点が無いページ。**ページの削除・統合・noindex・canonical・URLの変更は、この道具では決めません。**

## 8. Claude SEO が使えないとき（既存の無料監査だけの運用）

- 7章の 0)〜2) は、Claude SEO なしで動く
- 3) の専門監査は、**同じ観点を、既存の道具と手動の確認で代替**する：
  - page：`node scripts/page-audit.mjs --only <パス>`（title・description・canonical・h1・OG・JSON-LD・axe・LCP/CLS）
  - content：`node scripts/quality/qi.mjs one <id>`（独自性・正確さ・判断材料）と、公式の README・LICENSE・ドキュメントとの照合
  - schema：JSON-LD の実物の確認（`page-audit` の JSON-LD 検証）。表示と一致しない主張がないか
  - geo：`robots.txt`・`llms.txt`・Markdown版（`/md/`）・本文の先頭の要約・出典の有無を、**事実として**確認。引用されやすさは推測
  - 内部リンク：`node scripts/seo-links.mjs --target <パス>`
- 記録は、同じ `SPECIALIST.md` の様式で、実行の経路に「Claude SEO 未実行（代わりに〜）」と書く（2026-10-31の5ページは、この経路）

## 9. 追加コストと運用リスク

| 項目 | 内容 |
| --- | --- |
| 追加の費用 | 0円（新しい契約・API・Actionsの実行なし）。Claude SEO を使う場合は、あなたの Claude Code の利用枠を消費（量は未計測） |
| GitHub Actions | 追加なし（既存の週次の `seo-weekly.yml`・毎日の `update-data.yml` は変更していない） |
| リスク：権限 | プラグインは、あなたの端末で、外部のURLを取得し、ファイルを書き、編集のたびにフックを動かす。導入の前に、4章の承認を |
| リスク：過信 | Claude SEO の点数・指摘は、検索順位の保証ではない。AI検索の引用の見込みは推測 |
| リスク：量産 | 並列のフル監査・新規ページの量産系のコマンドは、使わない（5章） |
| リスク：測定の混同 | 同じページを短い間隔で何度も変更すると、効果を見分けられない。28日の確認が済むまで、同じページ・関連ページを変えない（`seo-specialist-queue` が除外する） |
| リスク：データの規模 | ページ別の実績は、28日で表示が数千回の小さなサイト。順位・CTRは偶然で大きく振れる（信頼度で割り引く） |

## 10. 未検証・未実行（2026-10-31）

- Claude SEO の導入・実行（`/plugin`・`/seo setup`・`/seo page`・`content`・`schema`・`geo`）
- 実際のSERP（日本・日本語）の順位の確認。Search Console の「クエリ×ページ」の完全一致の実測
- Google の現行ガイドライン（構造化データ・AI検索）の原典の確認
- 日本語の検索意図の実測（検索結果ツールの出力は、地域・言語を指定できない）

## 11. 導入と試験の結果（2026-10-31・このクラウドの実行環境）

承認の条件（公式の無料プラグインのみ／有料の拡張・seo-cockpit・Google認証・有料のSEO APIは導入しない／`doctor` で確認してから重要ページ1件だけ／全サイトの並列フル監査は禁止）に沿って実施しました。

### 導入の前の確認（実際のコード。コミット 6be93f4）
| 項目 | 確認した内容 |
| --- | --- |
| フック | `hooks.json` は **PostToolUse（Edit・Write）** のみ。`validate-schema.py`（341行）は、編集したファイルを**ローカルで読むだけ**（ネットワーク・サブプロセスなし。`open()` のみ）。実行は `run-python-hook.js` が Python を起動 |
| 権限（エージェントの道具） | 専門のエージェントは `Read`・`Bash`・`Write`・`Glob`・`Grep`。一部は `WebFetch`・`WebSearch`。**呼び出したときだけ**動く。`seo-dataforseo` は `mcp__dataforseo__*`（有料の拡張。使わない） |
| 外部への通信 | コアは、監査の対象のURL以外に、第三者のAPIを呼ばない（PRIVACY.md の記載）。テレメトリ・利用の追跡なし（PRIVACY.md の記載。コードの全体は精査していない）。拡張・バックリンクのAPIは、認証情報を設定したときだけ（設定しない） |
| 依存 | `requirements.txt` の範囲指定（Python 3.11〜3.14）。専用の仮想環境に入る（グローバルに入れない） |
| 導入の手順 | `claude plugin marketplace add AgriciDaniel/claude-seo` → `claude plugin install claude-seo@agricidaniel-claude-seo`（スコープ：user）→ `scripts/claude-seo setup`（`/seo setup` と同じ） |

### 実行の結果
| 段階 | 結果 |
| --- | --- |
| マーケットプレイスの追加・プラグインの導入 | 成功（v2.5.0、有効） |
| `setup` | 専用のPython環境は完成（Python 3.13、**約750MB**）。**Chromiumの導入は失敗**（`cdn.playwright.dev` が、この環境のネットワーク許可に無く、403）。終了コード10（核の導入は完了、描画は不可） |
| `doctor` | `Runtime: ready`／`Chromium: not installed` |
| 重要ページ1件の試験（`/tools/gitea/`） | 公開サイトに接続できないため、ビルド済みの `out/` をローカルで配信し、`CLAUDE_SEO_LOCAL_TARGETS` で許可して、ヘルパースクリプトを実行（記録：`agency/templates/SPECIALIST.md` の様式。非公開の `agency/reports/claude-seo/`）。**`/seo page` のサブエージェントは実行していない**（追加のエージェント実行を避けた） |

試験で分かったこと：
- `metadata_template`（テンプレート由来のメタデータの判定）・`agentic_check`（クロール許可・llms.txt・JSなしの本文・404）は動き、**このページに新しい欠陥は見つからなかった**（OSSALT 自身の監査と同じ結論）
- **`content_quality`（内容の品質の採点）は、日本語に対応していない**（辞書が英語のみ、entity density は未計算）。繰り返しの多い日本語の定型の見出し・表を、過大に「repetitive」と判定した。**日本語のページには、この採点を使わない**（上の「使わないコマンド」に準じる）
- Chromiumが無い環境では、描画（SPA）・スクリーンショット・Core Web Vitals の実測はできない（あなたの端末では、`/seo setup` が成功する見込み。環境による）

### 未実施（承認の範囲外、または環境の制約）
`/seo page`・`content`・`schema`・`geo` のサブエージェントの実行／Chromiumでの描画／Google・有料の拡張／全サイトの監査
