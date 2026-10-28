# 解説の検証状態の付け方

OSS詳細の解説（`content/tools/<id>.md`）の先頭に、検証状態が出ます。**記録が無いものは「未検証」と表示**します（確認したようには見せません）。

## 付け方（frontmatter）

```yaml
verification:
  status: official        # official | hands-on | recheck （無ければ未検証）
  checked_at: "2026-10-28" # 照合した日
  sources:                 # 照合した公式資料のURL（https のみ・1つ以上）
    - https://docs.gitea.com/installation/install-with-docker
  note: "Ubuntu 24.04 で docker compose up を実行し、初期設定とログインまで確認した"  # hands-on のときは必須
```

| status | 意味 | 必要なもの |
| --- | --- | --- |
| official（公式資料確認済み） | 公式のドキュメント・README・公式サイトと照らして確認した | checked_at、sources |
| hands-on（実機検証済み） | 実際に動かして確認した | checked_at、sources、note（何を・どの環境で確認したか） |
| recheck（要再確認） | 以前に確認したが、時間がたっている・内容が変わった可能性がある | checked_at、sources |
| （記録なし）未検証 | 照合の記録がない | なし |

## ルール
- **実際に動かしていないものを hands-on にしない。** 動かした環境（OS・バージョン・手順）を note に書く。
- 書き方が不正（日付や出典が無い等）のときは、自動で「未検証」に戻り、`npm test` が失敗する。
- 公式資料の内容が変わったら、`recheck` に変えるか、再度照合して日付を更新する。
- 検証状態は、順位や品質の保証ではない。
