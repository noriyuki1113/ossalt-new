---
description: "Docker Desktopの代わりに使えるオープンソースのコンテナ環境。Rancher Desktop・Podman・Portainerを、役割と移行時の互換性の注意点から比較します。"
updated: "2026-09-26"
intro: "Docker Desktopは、一定規模以上の企業で利用する場合に有償の契約が必要になりました。その費用や契約管理を避けるために、開発者のPCでコンテナを動かす環境を置き換える、という検討がよく行われます。"
picks:
  - tool: rancher-desktop
    fit: "PC上でコンテナとKubernetesを動かす環境を、そのまま置き換えたい"
  - tool: podman
    fit: "常駐プログラムを使わず、管理者権限なしでコンテナを動かしたい"
  - tool: portainer
    fit: "サーバー上のコンテナを、画面から操作・管理したい"
---

## 選び方

- **PCの開発環境の置き換え**：Rancher Desktopは、Docker Desktopと同じようにPC上でコンテナとKubernetesを動かすアプリです。もっとも素直な置き換え先です。
- **仕組みごと変える**：Podmanは常駐プログラム（デーモン）を使わない設計で、管理者権限なしでも動かせます。Dockerと似たコマンドで使えます。
- **管理画面**：Portainerは、サーバー上のDockerやKubernetesを画面から操作するツールで、PCの開発環境の代わりではありません。
- **ライセンス**：Rancher DesktopとPodmanはApache-2.0、PortainerはZlibです。

## 移行するときの注意

- docker composeの設定ファイルや、dockerコマンドを使っているスクリプトが、移行先でもそのまま動くかを確認しましょう。多くは動きますが、細かな違いで止まることがあります。
- 既存のコンテナのデータ（ボリューム）は自動では移りません。必要なデータは移行前に書き出しておきましょう。
- 開発者全員の環境を切り替えるため、手順書を用意して、まず数人で試してから広げると混乱が少なくなります。
