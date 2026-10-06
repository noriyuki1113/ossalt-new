---
description: "faster-whisperとwhisper.cppの違いを比べます。どちらもOpenAIの文字起こしのモデルWhisperを速く動かすためのオープンソースですが、faster-whisperはPythonから使うライブラリ、whisper.cppはC/C++で作り直した、GPUなしやMacでも動く実装です。"
updated: "2026-10-06"
---

**結論：Pythonのプログラムに組み込んで、NVIDIAのGPUのあるサーバーなどで速く動かしたいならfaster-whisper、Pythonを使わずに、GPUのないパソコンやMac、小さな機械で動かしたいならwhisper.cppです。**

- **faster-whisperを選ぶ場合**：CTranslate2という推論の仕組みで、Whisperのモデルを動かすPythonのライブラリです。量子化（モデルを軽くする工夫）にも対応しています。話者の区別まで付ける[WhisperX](/tools/whisperx/)など、ほかの道具の内部でも使われています。
- **whisper.cppを選ぶ場合**：WhisperをC/C++で作り直したもので、GPUがなくても動き、Apple製のチップを積んだMacでも速く動くように工夫されています。コマンドやライブラリ、付属のサーバーの機能から使えます。

**認識の精度について**：どちらも同じWhisperのモデルを使うので、同じ大きさのモデルなら、日本語の認識の傾向は大きく変わりません。精度は主に**選ぶモデルの大きさ**で決まります。

**共通の点**：どちらも画面のない道具で、ライセンスはMITです。

詳しくは[faster-whisperとは](/tools/faster-whisper/)、[whisper.cppとは](/tools/whisper-cpp/)、[Nottaの代替](/alternatives/notta/)のページを参照してください。
