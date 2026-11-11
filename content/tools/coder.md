---
description: "code-serverとは、VS Codeをブラウザで使えるようにして、サーバー上の資源で開発できる、オープンソースのツールです。できること、GitHub Codespacesとの違い、必ず設定すべき認証とHTTPS、拡張機能の入手先に関する注意を解説します。"
updated: "2026-11-11"
verification:
  status: official
  checked_at: "2026-11-11"
  sources:
    - https://github.com/coder/code-server
    - https://github.com/coder/code-server/blob/main/LICENSE
    - https://coder.com/docs/code-server/FAQ
    - https://coder.com/docs/code-server/guide
    - https://coder.com/docs/code-server/ipad
    - https://open-vsx.org/extension/MS-CEINTL/vscode-language-pack-ja
    - https://docs.github.com/en/billing/managing-billing-for-github-codespaces/about-billing-for-github-codespaces
    - https://github.com/loft-sh/devpod
  note: "code-serverの公式のREADME・LICENSE・FAQ・公開の手順のガイド・iPadの案内と、この解説の記述（認証とHTTPS、拡張機能の入手先、ライセンス）を照合した。GitHub CodespacesはGitHubの公式の料金のドキュメント、DevPodはDevPodの公式のREADMEで確認した。「日本の通信環境では入力の反応が遅い」は公式の資料では確認できないため削除した。日本語化は、Open VSXの言語パックの存在までを確認し、code-serverでの動作は確認できていない。実機では動かしていない"
---

code-server（コード・サーバー）は、VS Codeをサーバー上で動かし、ブラウザから使えるようにするツールです。手元のパソコンの性能が低くても、サーバーの性能で開発でき、どの端末からでも同じ環境で作業できます。画面の日本語化は、Open VSXに公開されているVS Code用の日本語の言語パックがありますが、code-serverで動くことは、公式の資料では確認できませんでした。GitHub Codespacesと同じく、ブラウザでVS Codeを使えるもので、公式のFAQにも比較があります。

### できること

- **ブラウザでのVS Code**：見慣れたVS Codeの画面を、ブラウザで使えます。タブレットなどからも作業できます。
- **サーバーの資源の利用**：重いビルドや実行を、サーバー側で行えます。
- **環境の一元化**：開発環境をサーバーに置くので、端末ごとの環境の違いを減らせます。

### GitHub Codespacesとの違い

Codespacesは、GitHubが運営するサービスで、リポジトリごとに環境を自動で用意してくれます。code-serverは、自分のサーバーに入れて使うもので、環境の用意と管理は、自分で行います。そのかわり、利用時間に応じた料金から離れられ、コードを社外のサービスに置かずに済みます。環境の自動化まで求めるなら、[DevPod](/tools/devpod/)のようなツールも候補です。

### 注意点

- **必ず認証をかけ、HTTPSで公開してください。** code-serverは、サーバー上でコマンドを実行できる、権限の強いツールです。パスワードなしでインターネットに公開すると、サーバーを乗っ取られるおそれがあります。
- **拡張機能の入手先が、Microsoftの公式のマーケットとは違います。** code-serverでは、Open VSXという別の公開の場所を使うため、一部の拡張機能は、そのままでは入れられません。
- ライセンスはMITです。

比較は「[code-serverとOpenVSCode Serverの違い](/compare/coder-vs-openvscode/)」も参照してください。ほかの候補は、[GitHub Codespacesの代替](/alternatives/github-codespaces/)のページで比べられます。
