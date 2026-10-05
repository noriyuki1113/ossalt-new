---
description: "OCRmyPDFとPaperless-ngxの違いを比べます。OCRmyPDFはスキャンしたPDFに文字のデータを付けるコマンドの道具、Paperless-ngxは書類を取り込んで整理・検索できる書類の管理システムです。Paperless-ngxは内部でOCRmyPDFを使っています。"
updated: "2026-10-06"
---

**結論：スキャンしたPDFを、文字で検索・コピーできるPDFに変換したいだけならOCRmyPDF、書類をため込んで、タグや取引先で整理し、あとから全文で探せるようにしたいならPaperless-ngxです。**

- **OCRmyPDFを選ぶ場合**：画像だけのPDFに、文字の認識（OCR）の結果を「透明な文字」として重ねて、検索やコピーができるPDFにします。見た目はそのままです。コマンドで使うので、たくさんのファイルの一括処理や、ほかの仕組みへの組み込みに向いています。
- **Paperless-ngxを選ぶ場合**：書類を取り込むと、OCRをかけて全文で検索できるようにし、タグ、取引先、書類の種類で自動で整理します。ブラウザの画面から使え、画面の日本語翻訳も確認できています。

**2つの関係**：Paperless-ngxは、内部の文字の認識にOCRmyPDFを使っています。書類の管理の仕組みまで必要かどうかで選べます。

**日本語の書類について**：どちらも、日本語の文字の認識には、OCRの言語のデータ（Tesseractの日本語のデータ）の設定が必要です。精度は書類によって変わるため、実際の書類で試してください。ライセンスはOCRmyPDFがMPL-2.0、Paperless-ngxがGPL-3.0です。

詳しくは[Paperless-ngxとは](/tools/paperless-ngx/)、[Adobe Acrobatの代替](/alternatives/adobe-acrobat/)のページを参照してください。
