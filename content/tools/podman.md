---
description: "Podmanとは、Dockerとほぼ同じ使い方で、コンテナを動かせるオープンソースのツールです。常駐するサービスなし、管理者の権限なしでも動きます。できること、Docker Desktopとの違い、移るときの注意点を解説します。"
updated: "2026-10-06"
---

Podman（ポッドマン）は、**コンテナを作って動かすためのツール**です。Dockerとほぼ同じコマンドで使えるため、Docker（Docker Desktop）の代わりとして選ばれています。Red Hatが中心になって開発しています。

### できること

- **Dockerとほぼ同じコマンド**：`podman run`、`podman build` など、`docker` を `podman` に置き換えるだけで、多くの操作ができます。
- **デーモンなし**：Dockerのように、裏で常に動くサービス（デーモン）を必要としません。
- **管理者の権限なし（rootless）**：一般の利用者の権限でコンテナを動かせるので、万一コンテナが乗っ取られても、影響を抑えやすい作りです。
- **Pod**：複数のコンテナを、Kubernetesと同じ「Pod」という単位でまとめて動かせます。Kubernetes用の設定ファイルを作ることもできます。
- **Podman Desktop**：WindowsやMacで、画面から使えるアプリも用意されています。

### Docker Desktopとの違い

Docker Desktopは、一定の規模以上の企業で使う場合に、有料の契約が必要です（条件はDockerの公式の案内で確認してください）。Podmanは、**ライセンスの費用なしで、パソコンでも、サーバーでも使えます**。

画面でコンテナを管理したい場合は、[Portainer](/tools/portainer/)と組み合わせる方法もあります（「[PodmanとPortainerの違い](/compare/podman-vs-portainer/)」）。

### 注意点

- **完全に同じではありません。** Docker Composeのファイルは、Podmanでも動かせることが多いですが、ネットワークやボリュームの扱いの違いで、そのままでは動かない場合があります。移る前に、よく使う構成で試してください。
- 管理者の権限なしで動かす場合、1024番より小さいポート（80番、443番など）を使うには、追加の設定が必要です。
- ライセンスはApache-2.0です。

[Docker Desktopの代替](/alternatives/docker-desktop/)のページで、ほかの候補も比べられます。
