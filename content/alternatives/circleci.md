---
description: "CircleCIの代わりに自前で動かせるオープンソースのCI/CD。Woodpecker CI・Jenkins・Argo CD・Tektonを、軽さ・拡張性・Kubernetesとの関係から比較します。"
updated: "2026-09-26"
intro: "CircleCIの代替は、テストやビルド、デプロイの自動化（CI/CD）を自社の環境で動かしたい場合の選択肢です。実行時間に応じた課金から離れられ、社内ネットワークの中にある環境にも配備しやすくなります。"
picks:
  - tool: woodpecker
    fit: "設定ファイル（YAML）で書ける、軽いCIを動かしたい"
  - tool: jenkins
    fit: "プラグインで拡張しながら、複雑な処理も自動化したい"
  - tool: argo-cd
    fit: "Gitの内容をKubernetesへ継続的に反映させたい"
  - tool: tekton
    fit: "Kubernetes上で、部品を組み合わせてCI/CDを作りたい"
---

## 選び方

- **手軽さ**：Woodpecker CIは設定がシンプルで、CircleCIからの移行でも考え方が近いツールです。
- **拡張性**：Jenkinsはプラグインでほぼ何でもできる老舗ですが、プラグインの更新と管理に手間がかかります。
- **Kubernetesを使っているか**：Argo CDはデプロイ（配備）に特化し、Gitの内容とKubernetesの状態を一致させ続けます。TektonはKubernetes上でCI/CDそのものを組むための部品です。
- **Gitサービスと一体で**：GiteaなどのGitホスティングには、CIの機能を持つものもあります（[GitHubの代替](/alternatives/github/)を参照）。
- **ライセンス**：JenkinsはMIT、Woodpecker CI・Argo CD・TektonはApache-2.0です。

## 移行するときの注意

- CircleCIの設定ファイルは、移行先の書き方に書き直す必要があります。まず、実行時間が長いものや、よく失敗するものから整理しましょう。
- APIキーなどの秘密情報は、移行先の管理機能に登録し直してください。
- 自前で動かす場合、ビルドを実行するサーバーの性能と台数が、待ち時間を左右します。同時に動かす数と、依存ライブラリのキャッシュの持ち方を最初に決めましょう。
