---
description: "Collabora OnlineとLibreOfficeを比較。共通する技術、ブラウザ共同編集とデスクトップ利用の違い、Nextcloudなどの導入判断に必要なチェック項目を整理します。"
updated: "2026-10-20"
---

**結論：パソコンに直接インストールしてオフラインで文書を編集するならLibreOffice。ブラウザで複数人が共同編集する環境を自前で構築したいならCollabora Onlineを比較してください。**

Collabora Onlineは**LibreOfficeの技術を基盤にした**ブラウザ向けのオフィス編集環境です。名前の違う完全に無関係な製品というより、「どの環境で使うか」が主な判断軸になります。

| 判断する項目 | [LibreOffice](/tools/libreoffice/) | [Collabora Online](/tools/collabora-online/) |
| --- | --- | --- |
| 主な使い方 | Windows・macOS・Linuxなどに入れて文書を編集 | サーバー上の文書をブラウザで編集・共同作業 |
| サーバー管理 | 普通のデスクトップ利用なら不要 | 自前運用する場合は必要 |
| リアルタイム共同編集 | デスクトップ版単体では共同編集サーバーにならない | 共同編集を想定した構成 |
| 互換性の確認 | Writer/Calc/Impressで実ファイルを開いて試す | ブラウザ経由で同じファイルを編集し、表示や保存を試す |

## どちらを選ぶ？

- **1人で文書、表、プレゼン資料を作成したい**：まずLibreOfficeを試すのがシンプルです。バックアップやファイル共有は自分で管理します。
- **社内の複数人が同じファイルを同時に扱う**：Collabora Onlineを検討し、認証、ストレージ連携、ネットワーク接続、同時利用の条件を整理します。
- **デスクトップと共同編集を両方使いたい**：必ずしも二者択一ではありません。オフラインでの編集と、ブラウザでの共同編集を用途別に使い分ける方法もあります。

## 導入前に確認すること

1. 社内で実際に使うDOCX、XLSX、PPTXを両方で試す。フォント・表・図・印刷結果を比べる。
2. 共同編集する場合、利用者数、ファイルの保存先、アクセス制御を検討する。
3. ソフトの費用に加え、サーバー、バックアップ、更新・監視の運用費を計算する。

**公式資料**：[Collabora OnlineはLibreOffice技術を基盤とする（公式）](https://www.collaboraonline.com/based-on-libreoffice/)／[LibreOfficeの機能（公式）](https://ja.libreoffice.org/discover/libreoffice)

ブラウザ共同編集の別の選択肢も比べたい場合は、[LibreOfficeとONLYOFFICEの比較](/compare/libreoffice-vs-onlyoffice/)を参照してください。
