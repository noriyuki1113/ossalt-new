---
description: "PageSpeed Insightsを1ページずつ試す代わりに、サイトの全ページの表示速度をまとめて計測できるオープンソース。Unlighthouseの使い方の目安と注意点を整理します。"
updated: "2026-10-01"
intro: "PageSpeed InsightsはGoogleが無料で提供している計測ツールですが、調べられるのは1回に1ページです。ページ数の多いサイトで「どのページが遅いのか」を知りたいときは、同じ計測エンジン（Lighthouse）を全ページに対してまとめて実行できるUnlighthouseが便利です。"
picks:
  - tool: unlighthouse
    fit: "サイトの全ページについて、表示速度やSEOの点数を一覧で比べたい"
---

## Unlighthouse でできること

- **全ページをまとめて計測**：サイトを巡回し、見つかったページにLighthouseを実行します。表示速度・SEO・アクセシビリティなどの点数を、ページごとに一覧で比べられます。
- **すぐに試せる**：Node.js（バージョン22.18.0以上）が入ったパソコンなら、`npx unlighthouse --site https://example.com` のコマンド1つで始められます。

## PageSpeed Insights との違い

- **PageSpeed Insights は実際の利用者のデータも見られる**：Chromeの利用者から集めた実際の表示速度（フィールドデータ）が表示されることがあります。Unlighthouseが出すのは、その場で計測した結果（ラボデータ）です。
- **使い分け**：Unlighthouseで点数の低いページを見つけ、PageSpeed Insightsでそのページを詳しく確かめる、という組み合わせが効率的です。

## 使うときの注意

全ページに対して計測を行うため、ページ数が多いサイトでは時間がかかり、対象のサイトにも多くのアクセスが発生します。自分が管理しているサイトに対して使ってください。
