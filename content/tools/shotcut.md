---
description: "Shotcutとは、Windows・Mac・Linuxで使える、無料のオープンソースの動画編集ソフトです。多くの動画の形式を、変換せずにそのまま編集できます。できること、Adobe Premiereとの違い、対応するOSと注意点を解説します。"
updated: "2026-11-14"
at_a_glance:
  what: "パソコンで使う動画編集のソフトです。タイムラインでの切り貼り、字幕、色の補正、音の調整などができ、多くの形式の動画を読み込みの変換なしで扱えます。"
  good_for:
    - "動画の編集を、ソフトの費用をかけずに始めたい人"
    - "Windows・Mac・Linuxのどれでも、同じソフトを使いたい人"
  not_for:
    - "Adobeのほかのソフトと行き来する、決まった制作の流れがある人"
    - "スマホやタブレットで編集したい人（パソコン向けのソフトです）"
  check:
    - "使っているパソコンのOSの版に対応しているか（古いOSは、古い版のShotcutを使います）"
    - "ライセンスはGPL-3.0です"
verification:
  status: official
  checked_at: "2026-11-14"
  sources:
    - https://github.com/mltframework/shotcut/blob/HEAD/README.md
    - https://github.com/mltframework/shotcut/blob/HEAD/COPYING
    - https://www.shotcut.org/features/
    - https://www.shotcut.org/download/
  note: "README、ライセンスのファイル、公式サイト（機能の一覧・ダウンロード）と、この解説の機能・対応するOS・ライセンスの記述を照合した。実機では動かしていない"
---

Shotcut（ショットカット）は、**無料で使える、オープンソースの動画編集ソフト**です。公式の説明では、Windows・Mac・Linuxで動き、多くの形式に対応し、**読み込みの変換をせずにタイムラインで直接編集できる**ことが主な特長です。パソコンに入れて使うソフトで、サーバーは不要です。

### できること

- **多くの形式**：FFmpegを使い、新しい音声・動画の形式に対応しています。4Kや8Kの解像度、HDRも扱えます。
- **タイムラインでの編集**：複数のトラックで、切り取り・貼り付け・挿入・上書き・リップル削除などができます。キーフレームで効果を変化させられます。
- **字幕**：字幕の作成・読み込み（SRT・VTT・ASS・SSA）・編集・書き出しができます。話した言葉から字幕を作る機能もあります。
- **色と音の調整**：3つのカラーホイールでの色の補正、多くの映像と音声のフィルター、音量の自動の調整などがあります。
- **録画と録音**：Webカメラ、マイク、画面の録画ができます。
- 画面の日本語翻訳を確認できています。

### Adobe Premiereとの違い

Adobe Premiereは、Adobeが提供する動画編集ソフトです。Shotcutは**無料で使え、ソースコードが公開されている**のが違いです。基本の編集から字幕・色の補正まで一通りできます。一方で、Adobeのほかのソフトと連携した制作の流れや、Premiere向けのプラグインを前提にしている場合は、その流れが変わります。ほかのOSSと比べるなら、[LosslessCutとの比較](/compare/lossless-cut-vs-shotcut/)や[OpenShotとの比較](/compare/openshot-vs-shotcut/)も参考になります。

### 対応するOS

公式のダウンロードのページでは、Windows 10・11（IntelかAMDのCPU、ARMのCPU）、macOS 12以降、Linux（Flathub、Snap、AppImageなど）向けに配布されています。Windows 7・8や、古いmacOSでは、それぞれに対応した古い版を使うよう案内されています。

### 注意点

- 公式は、**公式のサイトからダウンロードした場合に限り**、マルウェアや広告が含まれないことを約束すると書いています。ほかのサイトから入手しないでください。
- 重い効果を使うと、プレビューが遅くなることがあります。公式は、低い解像度でのプレビューや、軽い仮のファイル（プロキシ）での編集の機能を用意しています。
- ライセンスはGPL-3.0です。

[Adobe Premiereの代替](/alternatives/adobe-premiere/)のページで、ほかの候補も比べられます。
