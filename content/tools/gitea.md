---
description: "Giteaとは、GitHubのようなソースコードの管理を、小さなサーバーでも自社で動かせる軽量なオープンソースです。できること、GitHub・GitLabとの違い、導入の目安を解説します。"
updated: "2026-11-04"
at_a_glance:
  what: "GitHubに近い画面と機能を持つ、ソースコード管理（Gitのリポジトリ）を自社のサーバーで行うためのツールです。少ないメモリでも動く軽さが特徴です。"
  good_for:
    - "コードを社外のサービスに置きたくない人"
    - "必要な機能を軽く動かしたい人（小さなサーバーでも試せます）"
  not_for:
    - "サーバーの管理をしたくない人（外部サービスのGitHubなら、管理は不要です）"
    - "GitHub Actionsとまったく同じCI/CDが必要な人（多くの構成は似ていますが完全互換ではなく、Gitea Runnerの用意が必要です）"
    - "GitLabのように、多くの機能を1つでまとめて使いたい人"
  check:
    - "バックアップと、戻せることの確認"
    - "ライセンスはMITです"
verification:
  status: official
  checked_at: "2026-11-10"
  sources:
    - https://docs.gitea.com/
    - https://docs.gitea.com/installation/install-with-docker
    - https://docs.gitea.com/installation/install-with-docker-rootless
    - https://docs.gitea.com/installation/install-from-binary
    - https://docs.gitea.com/usage/actions/overview
    - https://docs.gitea.com/usage/repository/migration
    - https://docs.gitea.com/usage/packages/overview
    - https://docs.gitea.com/administration/config-cheat-sheet
    - https://github.com/go-gitea/gitea/blob/HEAD/README.md
    - https://github.com/go-gitea/gitea/blob/HEAD/LICENSE
    - https://github.com/go-gitea/gitea/tree/HEAD/options/locale
    - https://docs.gitlab.com/install/requirements/
  note: "公式ドキュメント（概要・Docker・バイナリ・Actions・移行・パッケージ・設定）、README、LICENSE、翻訳ファイルの一覧と、この解説の機能・導入手順・必要な環境・ポート番号・ライセンスの記述を照合した。GitLabの必要な性能は、GitLabの公式ドキュメントで確認した。実機では動かしていない"
---

Gitea（ギッティー）は、ソースコードの管理（Gitのリポジトリ）を、自社のサーバーで行うためのツールです。GitHubに近い画面と機能を持ちながら、少ないメモリでも動く軽さが特徴です。画面の日本語翻訳もあります。

### できること

- **リポジトリの管理**：Gitのリポジトリを作り、ブラウザでコードや変更の履歴を見られます。
- **課題とプルリクエスト**：課題（Issue）の管理や、プルリクエストでのコードのレビューができます。
- **CI（Gitea Actions）**：GitHub Actionsに近い書き方で、テストや公開を自動化する仕組みを使えます。動かすには、別に実行用の仕組み（ランナー）を用意します。
- **パッケージの公開**：Dockerのイメージや、各種のプログラムのパッケージを置く場所としても使えます。

### GitHub・GitLabとの違い

- **GitHub**：外部のサービスなので、サーバーの管理は不要です。Giteaは、コードを社外のサービスに置きたくない場合の選択肢です。
- **GitLab**：自前で動かせる点は同じですが、GitLabは機能が多い分、必要なサーバーの性能も大きくなります。Giteaは、必要な機能を軽く動かしたい場合に向いています。

### GitHubから移行するなら

GiteaにはGitHubなどからリポジトリを取り込むための[公式の移行機能](https://docs.gitea.com/1.26/usage/repository/migration/)があります。ただし、Gitの履歴が移せることと、GitHub上での運用がすべて同じように再現できることは別です。

1. **Gitの履歴を移す**：ブランチ、タグ、Git LFSを使っている場合は大きなファイルも検証する。
2. **共同作業のデータを確認**：Issue、プルリクエスト、ラベル、Wikiなど必要な情報の移行結果を照合する。
3. **CI/CDを確認**：Gitea ActionsはGitHub Actionsと多くの構成が似ていますが、完全互換ではありません。Gitea Runnerのセットアップが必要です（[Gitea Actions公式ガイド](https://docs.gitea.com/usage/actions/overview/)）。
4. **公開範囲とバックアップを決める**：外部OSSはGitHubに残し、社内のリポジトリだけGiteaへ移す併用も検討する。

比較する際は、[GitHubのオープンソース代替一覧](/alternatives/github/)で他の選択肢も確認できます。[Git開発ツールのカテゴリ](/categories/devtools/)から用途の近いOSSも探せます。

### 始め方の目安

公式の資料では、Dockerで動かす方法と、実行ファイル（バイナリ）で動かす方法が案内されています（[Dockerでの導入](https://docs.gitea.com/installation/install-with-docker)、[バイナリでの導入](https://docs.gitea.com/installation/install-from-binary)）。

**Dockerで動かす場合**

- 公式のイメージを使い、`docker compose` で起動する手順が示されています。データベースを用意しなくても、SQLite3で始められると書かれています。MySQLやPostgreSQLを使う設定の例もあります。
- 起動したら、ブラウザで `http://サーバーのアドレス:3000` を開き、画面の案内に沿って初期設定を終えます。例の設定では、Webは3000番、SSHは22番（ホスト側は222番）に割り当てられています。
- データは `/data` に置かれます。ホスト側のフォルダを使う場合は、そのフォルダの所有者を、設定したUID・GIDに合わせないと、起動しないことがあると書かれています。
- イメージには、通常版（rootful）と、rootlessの版があります。**2つには互換性がなく、あとから切り替えてはいけない**と書かれているので、最初に選んでください。
- アップデートは、公式の手順では、データを取り出せる場所に置いたうえで、新しいイメージを取得し直して再起動します。

**バイナリで動かす場合**

- ダウンロードしたファイルは、SQLite・MySQL・PostgreSQLのどれにも対応していると書かれています。
- サーバーには、Gitのバージョン2.0以上が必要です。
- 実行用のユーザーとフォルダを用意し、サービスとして登録して動かす方法が推奨されています。アップデートは、サービスを止めて、バイナリを同じ名前のまま置き換えます。更新の前にはバックアップを取るよう案内されています。

どちらの方法でも、初期設定で作られる設定ファイル（`app.ini`）に、鍵などの秘密の情報が書かれます。設定ファイルとデータのバックアップを、一緒に取ってください。

### 注意点

- ソースコードの置き場所になるので、バックアップと、戻せることの確認を必ず行ってください。
- ライセンスはMITです。
- 「使い方」を調べる人は、まず上の「始め方の目安」と、公式ドキュメントの[導入の手順](https://docs.gitea.com/installation/install-with-docker)を見てください。ここでは、動かして確かめた内容ではなく、公式の記載の要点を整理しています。
