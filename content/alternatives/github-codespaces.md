---
description: "GitHub Codespacesの代わりに自前で動かせるオープンソースのクラウド開発環境。code-server・OpenVSCode Server・DevPodを、仕組みと注意点から比較します。"
updated: "2026-09-26"
intro: "GitHub Codespacesの代替は、ブラウザから使える開発環境を自社のサーバーで動かしたい場合の選択肢です。社外に出せないソースコードを扱う場合や、手元のPCの性能に頼らず開発したい場合に向きます。"
picks:
  - tool: coder
    fit: "サーバー上でVS Codeを動かし、ブラウザから開発したい"
  - tool: openvscode
    fit: "VS Codeとほぼ同じ画面を、軽い構成でブラウザから使いたい"
  - tool: devpod
    fit: "開発環境の定義を持ち運び、どのクラウドでも同じ環境を作りたい"
---

## 選び方

- **ブラウザでVS Codeを使う**：code-serverとOpenVSCode Serverは、サーバー上でVS Codeを動かし、ブラウザから使えるようにするツールです。
- **環境の定義を持ち運ぶ**：DevPodは、開発環境の定義ファイルをもとに、さまざまなクラウドや手元のPCで同じ環境を作ります。
- **チームでの管理**：多数の開発者の環境をまとめて管理する基盤が必要なら、[Coder](/tools/coder-oss/)も候補になります。
- **拡張機能の入手先**：これらのツールでは、Microsoft公式の拡張機能ストアではなく、Open VSXという別のストアを使うのが一般的です。必要な拡張機能があるか確認しましょう。
- **ライセンス**：code-serverとOpenVSCode ServerはMIT、DevPodはMPL-2.0です。

## 移行するときの注意

- Codespacesで使っていた開発環境の定義（devcontainer.json）は、移行先で使えるかを確認しましょう。DevPodはこの定義ファイルを使えます。
- APIキーなどの秘密情報の渡し方を、移行先で決め直す必要があります。
- 開発者の人数と作業内容に応じて、サーバーの性能と台数を見積もりましょう。
