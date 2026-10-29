---
description: "Hermes Agentとは、Nous Researchが開発する、使うほど記憶とスキルが育つAIエージェントです。できること、導入の流れ、Nous Portalとの関係、注意点を、公式READMEをもとに整理します。"
updated: "2026-10-29"
at_a_glance:
  what: "経験からスキルを作り、使いながら改善する仕組みを持つ、AIエージェントです。ターミナルと、Telegram・Discord・Slackなどのチャットから使えます。"
  good_for:
    - "ターミナルやチャットから、定期的な作業も含めてAIエージェントに任せたい人"
    - "モデルの提供元を、自由に切り替えたい人"
  not_for:
    - "コマンドの実行など、広い権限を持つエージェントを管理できない人（ツールでコマンドを実行し、スキルを自分で作り変えます）"
    - "APIキーなどの管理をしたくない人（モデルやツールの利用には、提供元の契約やキーが必要です）"
  check:
    - "使うモデルの提供元と、その費用（Nous Portalは任意の有料の契約）"
    - "実行する環境（ローカル・Docker・SSHなど）の権限の範囲"
    - "ライセンスはMITです"
verification:
  status: official
  checked_at: "2026-10-29"
  sources:
    - https://github.com/NousResearch/hermes-agent/blob/HEAD/README.md
    - https://github.com/NousResearch/hermes-agent/blob/HEAD/LICENSE
  note: "READMEとLICENSEの内容と、この解説を照合した（実機では動かしていない）"
---

Hermes Agent（ヘルメス・エージェント）は、READMEで「Nous Researchが作った、自分で改善するAIエージェント」と説明されています。経験からスキルを作り、使いながら改善し、知識を残し、過去の会話を検索する、学習の仕組みを持つとされています。

### できること（READMEの記載）

- ターミナルの画面（TUI）：複数行の編集、スラッシュコマンドの補完、会話の履歴など。
- チャット：Telegram・Discord・Slack・WhatsApp・Signal・メールから、1つのGatewayで使える。
- 定期実行：組み込みのスケジューラーで、日報や夜間のバックアップなどを、自然な言葉で指示して自動で実行する。
- サブエージェント：独立したエージェントを並行して動かす。
- 実行環境：ローカル・Docker・SSH・Modal・Daytona・Vercel Sandboxなど。
- モデル：Nous Portal、OpenRouter、OpenAI、自分のエンドポイントなどを、`hermes model` で切り替えられる。

### 導入の流れ（READMEの記載）

Linux・macOS・WSL2はインストール用のスクリプト、WindowsはPowerShellで入れます。`hermes setup` で全体を設定し、`hermes` で会話を始め、`hermes gateway` でチャット用のGatewayを起動します。

### Nous Portalとの関係

Hermesは、好きな提供元のモデルで使えます。Nous Portal（有料の契約）を使うと、モデル・Web検索・画像生成・読み上げ・クラウドのブラウザを、1つの契約でまとめて使える、とREADMEにあります。**必須ではありません。**

### ほかのエージェントからの移行

OpenClaw、Claude Code、Codex CLI、Cursorから、設定・記憶・スキルを取り込めます（OpenClawは、求めればAPIキーも）。`--dry-run` で、移す内容を事前に確認できます。

### 注意点

- ライセンスはMITです。
- コマンドを実行でき、スキルを自分で作り変えるため、権限が広いエージェントです。
- OSSALTでは、ChatGPTの「関連ツール」に分類しています。

### 出典と確認の範囲

- 確認した資料：公式リポジトリのREADME・LICENSE（2026-10-29）。
- 確認していないこと：実際の導入、学習の仕組みの効果、モデルごとの性能、Nous Portalの料金。
