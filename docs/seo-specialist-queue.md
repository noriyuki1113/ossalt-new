# 専門監査の優先候補（seo-specialist-queue）

Quality Intelligence の最新の監査（品質の欠点）と、手元の Search Console CSV から付いたページ別の実績を結び付け、**1ページずつ見直す候補を最大10件**選ぶ読み取り専用の道具です。外部のプラグイン・API・定期実行には依存しません。

```bash
npm run build && npm run qi:full
npm run seo:queue -- --json reports/seo/integration/queue.json   # 出力は reports/seo/（Git管理外）
```

- 点数 = 信頼度 ×（0.40×検索実績 ＋ 0.30×品質の欠点 ＋ 0.15×修正の見込み ＋ 0.15×範囲）。**重みは独自の仮説**で、順位・流入の改善を予測・保証しない。実測と仮説は出力で区別する
- 除外：アーカイブ済み、28日の確認が済んでいない変更済みのページ（`agency/ledger.json`）、欠点が無いページ
- 出力にはSearch Consoleの数値が入るため、Git管理外の場所にしか書けない（コードとテストで強制）
- ページの削除・統合・noindex・canonical・URLは、この道具では決めない（オーナーの承認事項）
- 見直しの記録の様式：`agency/templates/SPECIALIST.md`

経緯：もともと外部プラグイン（Claude SEO）の連携用に作ったが、導入は見送り（PR #88 は未マージで終了）。この道具は、プラグインと無関係に使えるため、独立して残した。
