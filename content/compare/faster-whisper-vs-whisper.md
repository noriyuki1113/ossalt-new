---
description: "faster-whisperとWhisperの違いを比べます。faster-whisperは、OpenAIの文字起こしのモデルWhisperを、別の推論の仕組み（CTranslate2）で速く、少ないメモリで動かせるようにしたものです。"
updated: "2026-10-06"
---

**結論：同じWhisperのモデルを、より速く、少ないメモリで動かしたいならfaster-whisper、OpenAIが公開した元の実装をそのまま使いたい、研究や検証で本家と同じ動きを確かめたいならWhisper（本家）です。**

- **faster-whisperを選ぶ場合**：Whisperのモデルを、CTranslate2という推論の仕組みで動かします。公式の説明では、本家より速く、メモリの使用量も少なく動くとされています。GPUがない環境でも、量子化（モデルを軽くする工夫）を使って動かせます。
- **Whisper（本家）を選ぶ場合**：OpenAIが公開した元の実装です。Pythonから使い、NVIDIAのGPUがあると速く動きます。

**認識の精度について**：どちらも同じWhisperのモデルを使うので、同じ大きさのモデルなら、日本語の認識の傾向は大きく変わりません。精度は主に**選ぶモデルの大きさ**で決まります。

**ほかの候補**：Macや、GPUのない小さな機械で動かすなら[whisper.cpp](/compare/whisper-vs-whisper-cpp/)も候補です。話者の区別まで付けたい場合は、faster-whisperを使う[WhisperX](/tools/whisperx/)もあります。ライセンスはどちらもMITです。

詳しくは[Whisperとは](/tools/whisper/)、[Nottaの代替](/alternatives/notta/)のページを参照してください。
