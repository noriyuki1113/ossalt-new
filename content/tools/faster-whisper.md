---
description: "faster-whisperとは、OpenAIの文字起こしのモデルWhisperを、速く、少ないメモリで動かせるようにしたオープンソースです。できること、本家のWhisper・whisper.cppとの違い、使うときの注意点を解説します。"
updated: "2026-10-06"
---

faster-whisper（ファスター・ウィスパー）は、OpenAIが公開した文字起こしのモデル「Whisper」を、**CTranslate2という推論の仕組みで、より速く、少ないメモリで動かす**ためのPythonのライブラリです。

### できること

- **速い文字起こし**：公式の説明では、本家のWhisperより速く、メモリの使用量も少なく動くとされています。
- **量子化**：モデルを軽くする工夫（量子化）を使い、GPUがない環境やメモリの少ない環境でも動かせます。
- **単語ごとの時刻**：単語ごとの時刻を付けて書き出せます。
- **無音の部分の除去**：声のない部分を飛ばす機能で、処理の時間を短くできます。
- **ほかの道具の土台**：話者の区別までできる[WhisperX](/tools/whisperx/)など、ほかの文字起こしの道具の内部でも使われています。

### 本家のWhisper・whisper.cppとの違い

[本家のWhisper](/tools/whisper/)は、OpenAIが公開した元の実装です。faster-whisperは、**同じモデルを、Pythonから、より速く動かす**ための選択肢です。Macや、GPUのない小さな機械で動かすなら、C/C++で作り直された[whisper.cpp](/tools/whisper-cpp/)も候補です（「[faster-whisperとWhisperの違い](/compare/faster-whisper-vs-whisper/)」）。

### 注意点

- **精度は、選ぶモデルの大きさで決まります。** 速く動かせても、小さいモデルでは聞き間違いが増えます。日本語の会議なら、中くらい以上のモデルで、実際の録音を試してください。
- Pythonから使うライブラリで、画面はありません。
- ライセンスはMITです。

[Nottaの代替](/alternatives/notta/)のページで、ほかの候補も比べられます。
