---
title: "GitHubの代わりになるオープンソース{n}選｜自前で動かせるGitホスティング【{year}年】"
description: "GitHubの代わりに自前で動かせるオープンソースのGitホスティング。Gitea・OneDev・Gogs・Gitnessを、軽さ・CIとの一体化・移行のしやすさから比較します。"
updated: "2026-10-27"
intro: "GitHubの代替は、ソースコードを自社サーバーで管理したい場合の選択肢です。社外に出せないコードがある、社内ネットワークの中で完結させたい、という理由で選ばれます。Issue（課題管理）やプルリクエスト、CIまで含めて移すかどうかで、選ぶ候補が変わります。"
picks:
  - tool: gitea
    fit: "Issue・プルリクエスト・CIまで、GitHubに近い機能を軽いサーバーで動かしたい"
  - tool: onedev
    fit: "GitホスティングとCIを1つにし、強力なコード検索も使いたい"
  - tool: gogs
    fit: "機能は最小限でよく、とにかく軽く動かしたい"
  - tool: gitness
    fit: "Gitホスティングとパイプラインを備えた、軽い開発基盤がほしい"
---

## 選び方

- **GitHubに近い使い勝手**：Giteaはもっとも広く使われている候補で、GitHubと似た画面と機能を持ちます。CIの機能（Gitea Actions）はGitHub Actionsに近い書き方ができますが、完全に同じではありません。
- **CIとの一体化**：OneDevとGitnessは、GitホスティングとCI/CDを1つのツールで持てます。
- **軽さ**：Gogsは機能を絞った軽量型です。Giteaは、もともとGogsから分かれて開発が進んだツールです。
- **ライセンス**：Gitea・Gogs・OneDevはMIT、GitnessはApache-2.0です。

## Giteaを候補にする場合

「GitHubの代替オープンソースはどれがよいか」と迷う場合、まず[Giteaの詳細・ライセンス・更新状況](/tools/gitea/)を確認してください。GitHubに近いコードレビューやIssue管理が必要か、社内で使う軽量なGitサーバーが必要かによって、比較する観点が変わります。

### GitHubとGiteaの機能の違い

Giteaの[公式の比較表](https://docs.gitea.com/installation/comparison)（GitHub Enterpriseとの比較）に基づくと、主な違いは次のとおりです。

| 項目 | Gitea | GitHub Enterprise |
| --- | --- | --- |
| Issue・プルリクエスト・組み込みCI・パッケージレジストリ・Webhook | あり | あり |
| LDAP・OIDCによるログイン | あり | あり |
| SAML 2.0（サービス提供側として） | なし | あり |
| ブラウザ上でのマージコンフリクトの解消 | なし | あり |
| Pages・Gistのような機能 | 標準では持たない（外部ツールで補う） | あり |
| リポジトリのミラー（push／pull） | あり | 本ページでは未確認 |

比較表は更新されるため、導入前に最新の公式ページを確認してください。SAML連携が必須の組織や、Pagesを多用している組織は、この表の「なし」の行が移行の障害になりえます。

### GitHub Actionsからの移行

Gitea Actionsは、GitHub Actionsと「ほぼ互換」とされていますが、公式が挙げる違いがあります（[公式説明](https://docs.gitea.com/usage/actions/overview/)）。

- `GITEA_TOKEN` ではパッケージレジストリへの公開ができない。
- 問題マッチャー（problem matcher）やエラーの注釈（annotation）は無視される。
- `permissions` の一部のスコープが未対応。
- ワークフローを実行する「ランナー」は、本体とは別に用意して動かす必要がある。

主要なワークフローを1つ選び、移行先で最後まで動くかを先に試してください。

### 移行の進め方

- **リポジトリを移すだけの場合**：Gitの履歴とアクセス権限が維持できるかを確認する。
- **Issueやプルリクエストも移す場合**：Giteaの[公式移行機能](https://docs.gitea.com/1.26/usage/repository/migration/)の対応範囲を確認して、小規模に試す。GitHubからIssueやプルリクエストを取り込む際は、ユーザー名の指定が必要です。

## 移行するときの注意

- リポジトリ自体はGitの機能でそのまま移せます。Giteaのように、GitHubからリポジトリとIssueなどをまとめて取り込む機能を持つツールもあります（対応範囲は公式で確認してください）。
- GitHub Actionsのワークフローや、外部サービスとの連携（Webhook、アプリ）は、移行先で動くか一つずつ確認しましょう。
- 外部に公開しているオープンソースのプロジェクトは、利用者や協力者が集まるGitHubに残し、社内のコードだけを移す、という使い分けもよく選ばれます。
