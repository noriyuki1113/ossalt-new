---
description: "ComfyUIとは、処理の部品を線でつないで画像を生成できる、オープンソースの画像生成ツールです。できること、Stable Diffusion WebUIとの違い、必要なGPUの目安、モデルのライセンスに関する注意を解説します。"
updated: "2026-11-11"
verification:
  status: official
  checked_at: "2026-11-11"
  sources:
    - https://github.com/Comfy-Org/ComfyUI
    - https://github.com/Comfy-Org/ComfyUI/blob/master/LICENSE
    - https://github.com/AUTOMATIC1111/stable-diffusion-webui
    - https://huggingface.co/black-forest-labs/FLUX.1-dev
    - https://huggingface.co/black-forest-labs/FLUX.1-schnell
  note: "ComfyUIの公式のREADMEとLICENSEと、この解説の機能（ノードのグラフ、流れの保存、カスタムノード、GPUとCPU）・ライセンス（GPL-3.0）の記述を照合した。Stable Diffusion WebUIの記述は、そのREADMEで確認した。「CPUだととても遅い」はREADMEに記載がないため削除した。「モデルのライセンスは別」は、READMEが対応モデルに挙げるFLUX.1の公式のモデルカードで、[dev]は非商用のライセンス、[schnell]はApache-2.0と、モデルごとに異なることを確認した。「WebUIは手軽、ComfyUIは細かい調整向き」は編集上の判断であり、公式の資料で確認した事実ではない。実機では動かしていない"
---

ComfyUI（コンフィUI）は、画像を生成するAIを、処理の部品（ノード）を線でつないで動かすツールです。「文章の入力 → モデルの読み込み → 画像の生成 → 保存」といった流れを、画面で組み立てます。細かく制御できる分、仕組みを理解して使うタイプのツールです。

### できること

- **処理の流れの組み立て**：画像の生成の各段階を、部品として並べてつなぎます。同じ流れを使い回したり、共有したりできます。
- **作った流れの保存**：流れはJSONとして保存・読み込みできます。対応する形式で生成した画像や動画から、流れ全体とシード値を取り出すこともできます。
- **拡張**：コミュニティが作った部品（カスタムノード）を足して、機能を増やせます。

### Stable Diffusion WebUIとの違い

[Stable Diffusion WebUI](/tools/stable-diffusion-webui/)は、項目を入力してボタンを押す、昔ながらの画面で、手軽に始められます。ComfyUIは、流れを自分で組み立てる必要があるぶん、複雑な処理や、細かい調整がしやすいのが特徴です。まず試すならWebUI、凝った処理をしたいならComfyUI、という使い分けが目安です。

### 必要なGPUの目安

画像の生成には、GPU（特にメモリの多いもの）があると快適です。GPUがなく、CPUだけで動かすこともできます（公式のREADMEに、Windows用の「CPUだけで動かす」場合に使えるビルドの案内があります）。使うモデルの大きさによって、必要なメモリが変わります。

### 注意点

- **モデルのライセンスは別です。** ComfyUI自体はGPL-3.0ですが、使う画像生成のモデルごとに、商用利用の可否などの条件が異なります。業務で使う場合は、必ずモデルの利用条件を確認してください。
- カスタムノードは、第三者が作ったプログラムです。信頼できるものだけを入れましょう。
