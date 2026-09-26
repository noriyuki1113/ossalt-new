---
description: "Nottaの代わりに自前で動かせるオープンソースの文字起こし。Whisper・WhisperX・faster-whisper・whisper.cppを、速度・話者の区別・必要な性能の違いから比較します。"
updated: "2026-09-26"
intro: "このページの候補は、音声を文字にするAI（Whisperとその派生）です。会議の録音を外部のサービスに送らずに文字起こしできます。ただし、どれもNottaのような画面や共有機能を持つアプリではなく、コマンドや別のアプリから呼び出して使う「部品」だと考えてください。"
picks:
  - tool: whisperx
    fit: "話者ごとに区別し、時刻付きで文字起こしして議事録を作りたい"
  - tool: faster-whisper
    fit: "文字起こしの速度を上げたい"
  - tool: whisper-cpp
    fit: "GPUの無いPCやサーバーでも動かしたい"
  - tool: whisper
    fit: "本家のモデルをそのまま使いたい"
---

## 選び方

- **議事録に使うなら**：WhisperXは「誰が話したか」の区別と時刻の付与に対応しており、会議の議事録づくりに向いています。
- **速度と性能**：faster-whisperは処理を速くした実装です。whisper.cppはGPUが無くても動きますが、長い録音には時間がかかります。
- **画面が必要なら**：ブラウザから使える形にしたい場合は、[Otter.aiの代替](/alternatives/otter-ai/)で紹介しているWhisper ASR Webserviceのように、APIとして動かす仕組みと組み合わせます。
- **ライセンス**：Whisper・faster-whisper・whisper.cppはMIT、WhisperXはBSD-2-Clauseです。

## 移行するときの注意

- Nottaに保存している文字起こしのデータは、必要なものを書き出して保管しておきましょう。
- 精度は、録音の品質や専門用語の多さで大きく変わります。自社の会議の録音で試し、実用になるかを確かめてから切り替えましょう。
- 会議の録音には個人情報や社外秘の内容が含まれます。録音ファイルと文字起こしの保存場所・保存期間を決めておきましょう。
