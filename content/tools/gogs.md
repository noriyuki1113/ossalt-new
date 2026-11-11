---
description: "Gogsとは、1つの実行ファイルで動く、軽いGitのホスティングのオープンソースです。小さなサーバーでも、チームのコードの置き場所を自分で持てます。できること、Giteaとの違い、選ぶときの注意点を解説します。"
updated: "2026-11-11"
verification:
  status: official
  checked_at: "2026-11-11"
  sources:
    - https://github.com/gogs/gogs
    - https://github.com/gogs/gogs/blob/main/LICENSE
    - https://github.com/gogs/gogs/tree/main/conf/locale
    - https://github.com/gogs/gogs/blob/main/conf/locale/locale_en-US.ini
    - https://gogs.io/docs/intro/faqs
    - https://docs.gitea.com/
    - https://forum.gitea.com/t/welcome-to-gitea/423
  note: "Gogsの公式のREADME・LICENSE・翻訳ファイル（画面の文言の一覧。コミットの履歴、組織のチームの権限の文言を含む）と、この解説の機能・ライセンス・Giteaとの関係の記述を照合した。Giteaの記述（Gogsからの分岐、Gitea Actions、パッケージの管理）は、Giteaの公式ドキュメントで確認した。「Woodpeckerと組み合わせる」の記述は、Woodpeckerの公式ドキュメントの対応するGitのサービスの一覧にGogsが無いため、READMEにある Jenkins に置き換えた。「開発に関わる人の数がGiteaより少ない」は公式の資料では確認できないため削除した。実機では動かしていない"
---

Gogs（ゴグス）は、GitHubのように、チームのコードを置いて共有するための**Gitのサーバー**を、自分で動かすソフトです。Go言語で作られた1つの実行ファイルで動き、必要なサーバーの資源がとても少ないのが特徴です。

### できること

- **リポジトリの管理**：コードの置き場所を作り、ブラウザでファイルや変更の履歴を見られます。
- **イシューとプルリクエスト**：課題の管理や、変更の取り込みの依頼と確認ができます。
- **組織とチーム**：組織の中でチームを作り、リポジトリごとに権限を分けられます。
- **Webhook**：変更があったときに、ほかのサービスへ通知できます。
- 画面の日本語翻訳があります（公式のリポジトリに日本語の翻訳ファイルがあります）。Docker用のDockerfileも、公式のリポジトリに含まれています。

### Giteaとの違い

[Gitea](/tools/gitea/)は、2016年にGogsから分かれて生まれたプロジェクトです。その後、Giteaは機能を大きく増やし、GitHub Actionsに近い書き方のCI（Gitea Actions）や、パッケージの置き場所なども備えています。Gogsは、**機能を絞った、シンプルな構成**を保っています。

コードを置いて共有できれば十分ならGogs、CIまで1つにまとめたいならGiteaが向いています。違いは「[GiteaとGogsの違い](/compare/gitea-vs-gogs/)」にまとめています。

### 注意点

- 公式のREADMEの機能一覧に、CIの機能はありません。自動テストやデプロイを行うには、CIのツールと組み合わせます。公式のREADMEは、Jenkinsとの連携（JenkinsのGogs用プラグイン）を紹介しています。
- 導入の前に、公式のリポジトリで、最近の更新の状況を確認してください。
- 自分で動かす場合、**コードのバックアップ**は自分たちの責任になります。リポジトリとデータベースの両方を、定期的に別の場所へ保存してください。
- ライセンスはMITです。

[GitHubの代替](/alternatives/github/)のページで、ほかの候補も比べられます。
