# スポンサー掲載の運用手順

対象：運営者。部品：`src/components/sponsor-slot.tsx`・`sponsor-card.tsx`、設定：`data-source/sponsors.json`、検査：`src/lib/sponsors.ts`。

## 掲載の流れ

1. 問い合わせを受ける（`/advertise/` のメール）。社名・サービス・希望の時期と場所を確かめる。
2. 掲載してよいかを判断する（読者の検討に関係があるか、確認できない価格・割引・性能の表現がないか）。
3. 条件（期間・場所・料金・報告の内容）を合意する。**決済や請求の仕組みはない**ので、請求は運営者が個別に行う。
4. `data-source/sponsors.json` に1件を追加する（下の例）。`contract_confirmed_on` に合意を確認した日を書く。これがないと表示されない。
5. `npm test` が通ることを確かめて、既定ブランチに入れる（毎日の再ビルドで、開始日から自動で表示される）。
6. 終了後、Umami で `sponsor_viewable`・`sponsor_click` を `campaign` で絞り、報告する（個人を特定する情報は渡さない）。
7. 終わった掲載は `status` を `"ended"` にする（記録として残す）。

```json
{
  "id": "example-2026-11",
  "advertiser": "（広告主の正式な名前）",
  "title": "（40字以内）",
  "description": "（120字以内。確認できない数値・割引を書かない）",
  "destination_url": "https://...",
  "placement": "alternative",
  "targets": ["slack"],
  "start_date": "2026-11-01",
  "end_date": "2026-11-30",
  "status": "active",
  "contract_confirmed_on": "2026-10-20"
}
```

- `placement`：`alternative`（SaaSの代替ページ）／`category`（カテゴリ）／`blog`（ブログ記事）。1ページに1枠。
- `targets`：載せるページの slug。空なら、その種類のすべてのページ。
- 期間は日本時間の日付で、両端を含む。ビルドが止まっていても、終了日を過ぎたらブラウザ側で消える。

## 守ること

- 架空の企業・合意していない企業を載せない（テストの例以外で、試しの掲載を入れない）。
- 掲載の順番・スコア・比較・記事の内容は変えない。
- 画像・動画・追従する表示・ポップアップは使わない（表示の速さを守るため。必要になったら別に判断する）。
- 自動の営業メールを送らない。
