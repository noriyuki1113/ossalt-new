---
description: "LosslessCutとは、動画や音声を再エンコードせずに切り出し・結合できる、無料のオープンソースのアプリです。画質を落とさず、短い時間で処理できます。できること、動画編集ソフトとの違い、使うときの注意点を解説します。"
updated: "2026-11-11"
verification:
  status: official
  checked_at: "2026-11-11"
  sources:
    - https://github.com/mifi/lossless-cut
    - https://github.com/mifi/lossless-cut/blob/master/LICENSE
    - https://losslesscut.app/docs/faq
    - https://losslesscut.app/docs/features
    - https://github.com/mifi/lossless-cut/tree/master/locales
    - https://kdenlive.org/
  note: "README、LICENSE、公式サイトのドキュメント（機能・FAQ）、翻訳ファイルの一覧と、この解説の機能・制限・対応環境・ライセンスの記述を照合した。Shotcutの記述は、LosslessCutのFAQで確認し、Kdenliveは公式サイトで確認した。使い方の例（会議やゲームの録画）は、照合の対象外。実機では動かしていない"
---

LosslessCut（ロスレスカット）は、動画や音声の**不要な部分を切り取ったり、つないだりする**ことに特化したアプリです。「再エンコード」（動画をもう一度圧縮し直す処理）をしないので、**画質が落ちず、処理がとても速い**のが特徴です。

### できること

- **切り出し**：長い録画から、必要な部分だけを取り出せます。複数の区間をまとめて切り出すこともできます。
- **結合**：同じコーデック（圧縮の方式）の動画を、つなげられます。
- **音声や字幕のトラックの操作**：音声だけを取り出したり、不要なトラックを外したりできます。
- **スナップショット**：動画の1コマを、画像として保存できます。
- Windows・Mac・Linuxで動き、画面の日本語翻訳を確認できています。

### 動画編集ソフトとの違い

[Shotcut](/tools/shotcut/)や[Kdenlive](/tools/kdenlive/)のような動画編集ソフトは、文字や効果を加えたり、複数の素材を重ねたりできる一方、書き出しのときに再エンコードするので、時間がかかります。LosslessCutは、**「切る・つなぐ」だけを、速く、画質を落とさずに行う**道具です。会議やゲームの録画の不要な部分を削る、といった用途にぴったりです。

### 注意点

- **切れる位置に制限があります。** 再エンコードしない仕組みのため、切り出す位置が、動画の中の「キーフレーム」という区切りに合わせてずれることがあります。1コマ単位の正確な編集が必要なら、動画編集ソフトを使います。
- 文字の追加や、色の調整などの編集はできません。
- 結合できるのは、コーデックの設定がそろっている動画どうしです（たとえば、同じカメラで撮ったものです）。
- 内部で[FFmpeg](/tools/ffmpeg/)を使っています。ライセンスはGPL-2.0です。

[Adobe Premiereの代替](/alternatives/adobe-premiere/)のページで、ほかの候補も比べられます。
