---
description: "Actual Budgetとは、収入を項目ごとに先に割り振る「予算」の考え方で家計を管理できる、オープンソースの家計簿のアプリです。データを手元に置けます。できること、マネーフォワードとの違い、使うときの注意点を解説します。"
updated: "2026-11-01"
at_a_glance:
  what: "収入を用途別の予算に割り振る、ローカルファーストの家計管理アプリです。"
  good_for:
    - "使った金額の記録に加え、使う前の予算配分を管理したい人"
    - "明細ファイルの取り込みやバックアップを自分で確認できる人"
  not_for:
    - "日本の銀行やカードとの自動連携を、確認せずに前提にしたい人"
  check:
    - "自分の金融機関に対応する銀行連携があるか"
    - "明細の列・日付・入出金・重複の扱い"
    - "予算のエクスポートと復元、暗号化の対象範囲"
verification:
  status: official
  checked_at: "2026-11-01"
  sources:
    - https://github.com/actualbudget/actual/blob/f2cc89778255755faaa8c7b239e20a47640543b5/README.md
    - https://github.com/actualbudget/actual/blob/f2cc89778255755faaa8c7b239e20a47640543b5/LICENSE.txt
    - https://github.com/actualbudget/actual/blob/f2cc89778255755faaa8c7b239e20a47640543b5/packages/docs/docs/advanced/bank-sync.md
    - https://github.com/actualbudget/actual/blob/f2cc89778255755faaa8c7b239e20a47640543b5/packages/docs/docs/transactions/importing.md
    - https://github.com/actualbudget/actual/blob/f2cc89778255755faaa8c7b239e20a47640543b5/packages/docs/docs/backup-restore/backup.md
    - https://github.com/actualbudget/actual/blob/f2cc89778255755faaa8c7b239e20a47640543b5/packages/docs/docs/backup-restore/restore.md
    - https://github.com/actualbudget/actual/blob/f2cc89778255755faaa8c7b239e20a47640543b5/packages/docs/docs/getting-started/sync.md
  note: "公式資料とライセンスを照合。実機の導入・同期・復元や性能は未検証。"
---

Actual Budget（アクチュアル・バジェット）は、**収入を、食費や家賃などの項目に先に割り振って、使いすぎを防ぐ**考え方（封筒式の予算）で作られた家計簿のアプリです。データを手元に置く作り（ローカルファースト）です。速度は当サイトで実測していません。

### できること

- **予算の割り振り**：毎月の収入を、項目ごとに割り振ります。使った分が引かれ、残りがひと目で分かります。
- **口座の管理**：銀行の口座やカードごとに、入出金を記録できます。
- **明細の取り込み**：CSVなどの明細のファイルを取り込めます。取り込むときのルール（自動の分類）も作れます。
- **レポート**：支出の内訳や、純資産の推移をグラフで確認できます。
- **複数の端末で使う**：同期用のサーバーを自分で動かすと、パソコンやスマホのブラウザから同じデータを使えます。

### マネーフォワードとの違い

乗り換えを考えるときは、日本の金融機関との連携を先に確認してください。Actualの公式の銀行連携資料にある対象地域は、欧州・北米・ニュージーランド・ブラジルで、日本向けの案内は確認できませんでした。**日本の銀行との自動連携を前提にせず**、明細ファイルの取り込みや手入力で運用できるかを確かめます。銀行連携を使う場合は同期サーバーと外部の連携サービスの認証情報が必要です。

口座ごとの記録や分析を細かくしたいなら、[Firefly III](/tools/firefly-iii/)も候補です（「[Actual BudgetとFirefly IIIの違い](/compare/actual-vs-firefly-iii/)」）。

### 明細の取り込みで確認したいこと

公式資料ではCSV・QIF・OFX・QFX・CAMTの取り込みを案内しています。CSVでは、日付や金額の列、日付形式、区切り文字、入金と出金が別の列かどうかを設定できます。自分の金融機関が出すファイルを、少数の明細で試してください。

重複を避ける仕組みもありますが、取り込み前後の件数と残高を照合することを勧めます。公式資料では、OFX/QFXの取引IDに加え、日付・金額・支払先を使った照合を説明しています。どのファイルでも完全に重複を防げるという保証ではありません。

### バックアップと暗号化の範囲

公式のバックアップ手順は、設定のデータ欄から **Export data** でファイルを書き出す方法です。復元はファイルの選択画面の **Import file** からActual形式の書き出しを取り込みます。導入時に少量のデータで書き出しと再取り込みを試し、同期先とは別にもコピーを保管することを勧めます。

端末間の予算データには、任意でエンドツーエンド暗号化を設定できます。ただし、公式資料では**端末内のデータは暗号化されず、銀行連携のトークンもこの暗号化の対象外**とされています。端末の保護とサーバー管理者のアクセス範囲も確認してください。

### 注意点

- 当サイトでは、画面の日本語翻訳は確認できていません。
- 自動の連携の手軽さを重視するなら、マネーフォワードのままのほうが楽です。
- 同期用のサーバーを使う場合は、データのバックアップを取ってください。
- ライセンスはMITです。

[マネーフォワードの代替](/alternatives/moneyforward/)のページで、ほかの候補も比べられます。

### 出典と確認の範囲

2026年11月1日に、[公式README](https://github.com/actualbudget/actual/blob/f2cc89778255755faaa8c7b239e20a47640543b5/README.md)、[ライセンス](https://github.com/actualbudget/actual/blob/f2cc89778255755faaa8c7b239e20a47640543b5/LICENSE.txt)、[銀行連携の説明](https://github.com/actualbudget/actual/blob/f2cc89778255755faaa8c7b239e20a47640543b5/packages/docs/docs/advanced/bank-sync.md)、[明細取り込みの説明](https://github.com/actualbudget/actual/blob/f2cc89778255755faaa8c7b239e20a47640543b5/packages/docs/docs/transactions/importing.md)、[バックアップの説明](https://github.com/actualbudget/actual/blob/f2cc89778255755faaa8c7b239e20a47640543b5/packages/docs/docs/backup-restore/backup.md)、[復元の説明](https://github.com/actualbudget/actual/blob/f2cc89778255755faaa8c7b239e20a47640543b5/packages/docs/docs/backup-restore/restore.md)、[同期と暗号化の説明](https://github.com/actualbudget/actual/blob/f2cc89778255755faaa8c7b239e20a47640543b5/packages/docs/docs/getting-started/sync.md)を確認しました。導入前の確認手順は、資料を踏まえた当サイトの提案です。実機での導入・同期・復元や、速度・容量削減の実測は行っていません。
