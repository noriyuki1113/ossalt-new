---
description: "Grypeとは、コンテナイメージやファイルシステム、SBOMの既知の脆弱性を調べる、コマンドラインの検査ツールです。できること、始め方、Snykとの違いを、公式READMEをもとに整理します。"
updated: "2026-10-29"
at_a_glance:
  what: "コンテナイメージ・ファイルシステム・SBOM（部品の一覧）に、既知の脆弱性がないかを調べるコマンドラインのツールです。"
  good_for:
    - "コンテナイメージの脆弱性を、手元やCIで調べたい人"
    - "Syftなどで作ったSBOMを、まとめて検査したい人"
    - "EPSSやKEVで、対応の優先度を付けたい人"
  not_for:
    - "検査の結果を、画面で管理・追跡する仕組みが欲しい人（Grypeはコマンドラインのツールです）"
    - "自分のコードの書き方の問題（静的解析）を見つけたい人（Grypeは、既知の脆弱性の検査です）"
  check:
    - "使っているOSや言語のパッケージに対応しているか"
    - "検査の結果を、どこに記録して追うか"
    - "ライセンスはApache-2.0です"
verification:
  status: official
  checked_at: "2026-10-29"
  sources:
    - https://github.com/anchore/grype/blob/HEAD/README.md
    - https://github.com/anchore/grype/blob/HEAD/LICENSE
  note: "READMEとLICENSEの内容と、この解説を照合した（実機では動かしていない）"
---

Grypeは、READMEで「コンテナイメージとファイルシステムのための、脆弱性の検査ツール」と説明されています。Anchoreが開発を支援しています。

### できること（READMEの記載）

- コンテナイメージ・ファイルシステム・SBOMに含まれる、既知の脆弱性を調べる。
- Alpine・Debian・Ubuntu・RHELなど、主要なOSのパッケージに対応する。
- Ruby・Java・JavaScript・Python・.NET・Go・PHP・Rustなど、言語ごとのパッケージに対応する。
- Docker・OCI・Singularityのイメージの形式に対応する。
- EPSS・KEV・リスクの点数で、優先度を付ける。
- OpenVEXで、結果を絞り込んだり、情報を補ったりする。

### Snykとの違い

Snykは、クラウドのサービスとして検査と管理の画面を提供します。Grypeは、**手元やCIで動かすコマンドラインのツール**で、結果を管理する画面は持ちません（この比較は、READMEの説明からの整理です）。結果をまとめて管理したい場合は、DefectDojoのような管理ツールと組み合わせる方法があります。

### 始め方（READMEの記載）

インストール用のスクリプト、Homebrew、Dockerなどで導入できます。`grype alpine:latest` のようにイメージを、`grype ./my-project` のようにディレクトリを指定して検査します。`grype sbom:./sbom.json` でSBOMを検査すると、より速く検査できるとされています。

### 向いている人

- コンテナや依存パッケージの脆弱性を、CIで自動で調べたいチーム。

### 向いていない人

- 結果を画面で管理・追跡したい人（別のツールが必要です）。
- 自分のコードの書き方の問題を見つけたい人。

### 注意点

- ライセンスはApache-2.0です（ロゴはCC BY 4.0）。
- 商用のサポートは、Anchoreへの問い合わせで案内されています。

### 出典と確認の範囲

- 確認した資料：公式リポジトリのREADME・LICENSE（2026-10-29）。
- 確認していないこと：実際の検査、検出の精度、Snykとの機能の細かい比較。
