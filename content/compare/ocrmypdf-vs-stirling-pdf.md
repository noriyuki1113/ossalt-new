---
description: "OCRmyPDFとStirling-PDFの違いを比べます。どちらもスキャンしたPDFに文字のデータを付けられるオープンソースですが、OCRmyPDFはOCRに特化したコマンドのツール、Stirling-PDFはOCRを含むPDFの加工をブラウザで行えるツールです。"
updated: "2026-10-06"
---

**結論：たくさんのPDFをまとめてOCRにかけたい、ほかの仕組みに組み込んで自動で処理したいならOCRmyPDF、OCRに加えて、PDFの結合・分割・圧縮・変換などを、ブラウザの画面から手軽に行いたいならStirling-PDFです。**

- **OCRmyPDFを選ぶ場合**：画像だけのPDFに、検索やコピーができる文字を付けることに特化しています。傾きの補正やノイズの除去、長期保存向けの形式（PDF/A）での書き出しもできます。コマンドで動くので、フォルダーを見張って自動で処理するような使い方に向いています。
- **Stirling-PDFを選ぶ場合**：Adobe Acrobatでよく使うPDFの加工の機能を、ブラウザの画面から使えます。OCRもその機能の1つです。画面の日本語翻訳も確認できています。

**日本語の書類について**：どちらも、日本語を認識するには、OCRの言語のデータ（Tesseractの日本語のデータ）の設定が必要です。精度は書類によって変わるため、実際の書類で試してください。

**ライセンス**：OCRmyPDFはMPL-2.0、Stirling-PDFはMITです。

詳しくは[OCRmyPDFとは](/tools/ocrmypdf/)、[Stirling-PDFとは](/tools/stirling-pdf/)、[Adobe Acrobatの代替](/alternatives/adobe-acrobat/)のページを参照してください。
