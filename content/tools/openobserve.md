---
description: "OpenObserveとは、ログ・メトリクス・トレースなどをまとめて扱える、オブザーバビリティ（監視）の基盤です。できること、オープンソース版と企業版の違い、ライセンスの注意点を、公式READMEをもとに整理します。"
updated: "2026-10-29"
at_a_glance:
  what: "ログ・メトリクス・トレース・分析・実ユーザーの監視（RUM）などを、1つで扱う監視の基盤です。READMEは、Datadogなどの代わりになると説明しています。"
  good_for:
    - "ログ・メトリクス・トレースを、1つの基盤で自分のサーバーに集めたい人"
    - "OpenTelemetryで送り、SQLやPromQLで検索したい人"
  not_for:
    - "SSO・高度な権限管理・監査ログが必要で、企業版を使わない人（READMEでは、これらは企業版の機能です）"
    - "AGPL-3.0の条件を受け入れられない人（改変して外部に提供する場合は、ソースの公開が必要です）"
  check:
    - "必要な機能が、オープンソース版と企業版のどちらにあるか"
    - "READMEの性能・費用の数値は、開発元の主張です（OSSALTは未検証）"
    - "ライセンスはオープンソース版がAGPL-3.0、企業版は商用です"
verification:
  status: official
  checked_at: "2026-10-29"
  sources:
    - https://github.com/openobserve/openobserve/blob/HEAD/README.md
    - https://github.com/openobserve/openobserve/blob/HEAD/LICENSE
  note: "READMEとLICENSEの内容と、この解説を照合した（実機では動かしていない）"
---

OpenObserve（O2）は、READMEで「ログ・メトリクス・トレース・分析・実ユーザーの監視（RUM）・AIとLLMの監視のための、クラウドネイティブの監視の基盤」と説明されています。Datadog・Splunk・Elasticsearchの代わりになる、費用を抑えた選択肢だとされています。

### 特徴（READMEの記載）

- 1つの実行ファイルで動き、複雑なクラスタの準備がいらない。
- OpenTelemetryの標準に沿う。
- ログ・メトリクス・トレース・RUM・ダッシュボード・アラート・インシデントを1つで扱う。
- ログとトレースはSQLで、メトリクスはSQLかPromQLで検索する。
- Rustで作られている。

READMEには「保存の費用が140分の1」「Elasticsearchより4分の1のハードウェアで速い」といった数値がありますが、**これは開発元の主張で、OSSALTは確認していません。**

### 始め方（READMEの記載）

Dockerで起動し、`http://localhost:5080` を開いて、起動時に指定した管理者のメールとパスワードでログインします。クラスタでの構成は、公式の高可用性の手順に案内されています。クラウド版（OpenObserve Cloud）もあり、無料の範囲が案内されています。

### オープンソース版と企業版

READMEによると、オープンソース版は「機能がそろっていて、本番で使える」とされています。企業版では、SSO（OIDC・SAML・LDAPなど）、高度な権限管理（RBAC）、監査ログなどが追加されます。

### 注意点（ライセンス）

オープンソース版はAGPL-3.0、企業版は商用のライセンス契約（AGPLではない）です。

### 出典と確認の範囲

- 確認した資料：公式リポジトリのREADME・LICENSE（2026-10-29）。
- 確認していないこと：実際の導入、性能・費用の数値、Datadogとの機能の細かい比較、企業版とクラウド版の料金。
