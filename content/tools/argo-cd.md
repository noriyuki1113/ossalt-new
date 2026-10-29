---
description: "Argo CDとは、Gitに書いた状態をKubernetesへ反映し続ける、GitOps型のデプロイ（継続的デリバリ）ツールです。できること、CircleCIなどCIツールとの違い、向く人と導入前の確認点を、公式READMEをもとに整理します。"
updated: "2026-10-29"
at_a_glance:
  what: "Gitに書いた状態をKubernetesへ反映し続ける、宣言的なGitOps型のデプロイ（継続的デリバリ）ツールです。"
  good_for:
    - "Kubernetesで動かすアプリの設定を、Gitで版管理して、デプロイを自動で追いたい人"
    - "デプロイの履歴を、あとから確認できる形にしたいチーム"
  not_for:
    - "Kubernetesを使っていない人（READMEの対象はKubernetesです）"
    - "テストやビルドを含むCIの全体を、1つで置き換えたい人（Argo CDはデプロイ側を担当します）"
  check:
    - "Kubernetesの運用に慣れた担当者がいるか"
    - "公式ドキュメント（argo-cd.readthedocs.io）の導入手順"
    - "ライセンスはApache-2.0です"
verification:
  status: official
  checked_at: "2026-10-29"
  sources:
    - https://github.com/argoproj/argo-cd/blob/HEAD/README.md
    - https://github.com/argoproj/argo-cd/blob/HEAD/LICENSE
  note: "READMEとLICENSEの内容と、この解説を照合した（実機では動かしていない）"
---

Argo CD（アルゴシーディー）は、Kubernetes向けの、宣言的なGitOps型の継続的デリバリ（CD）ツールです。公式のREADMEは、次の2つの考え方を挙げています。

- アプリケーションの定義・設定・環境は、宣言的で、版管理されているべきである。
- アプリケーションのデプロイと、その後の管理は、自動で、監査でき、分かりやすいべきである。

画面（UI）からデプロイの状態を見られます。READMEには、公式の動作確認用のデモ（cd.apps.argoproj.io）も案内されています。

### CircleCIなどとの違い

CircleCIは、テストやビルドを走らせるCI／CDのサービスです。Argo CDは、READMEの説明では**Kubernetesへのデプロイ（継続的デリバリ）**を担うツールです。CircleCIの代わりに、ビルドやテストまで置き換えるものではない点に注意してください。Gitに置いた状態をKubernetesに反映する部分を、自前で持ちたい場合の選択肢です。

### 向いている人

- Kubernetesで動かすアプリの設定を、Gitで管理したいチーム。
- デプロイを自動化し、あとから経緯を追えるようにしたい人。

### 向いていない人

- Kubernetesを使っていない人。
- テスト・ビルドを含むCIの全体を、1つのツールにまとめたい人。

### 始め方の目安

公式のドキュメント（argo-cd.readthedocs.io）に、導入の手順があります。このページでは、手順そのものは書いていません。公式の説明に沿って進めてください。

### 注意点

- ライセンスはApache-2.0です。
- コミュニティの窓口として、GitHub DiscussionsとSlackが案内されています。

### 出典と確認の範囲

- 確認した資料：公式リポジトリのREADME・LICENSE（2026-10-29）。
- 確認していないこと：実際の導入、性能、他のツールとの機能比較。
