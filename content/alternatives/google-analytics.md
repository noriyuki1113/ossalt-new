---
description: "Google Analyticsの代わりに自前で動かせるオープンソースのアクセス解析。Umami・Plausible・Matomoなどを、機能の多さとCookieの扱い、ライセンスから比較します。"
updated: "2026-10-01"
intro: "Google Analyticsの代替を自前で動かす主な理由は、訪問者のデータを外部に送らないことと、Cookie同意バナーの負担を減らすことです。当サイト自身も、アクセス解析にUmami（クラウド版）を使っています。"
picks:
  - tool: umami
    fit: "シンプルな画面で、ページビューと流入元を把握できれば十分"
  - tool: plausible
    fit: "1ページのダッシュボードで、要点だけを素早く見たい"
  - tool: matomo
    fit: "Google Analyticsに近い機能（詳細なレポートや目標設定）が必要"
  - tool: goatcounter
    fit: "とにかく軽量で、個人情報を集めない計測にしたい"
---

## 選び方

- **機能の多さ**：MatomoがもっともGoogle Analyticsに近く、細かい分析ができます。Umami・Plausible・GoatCounterは指標を絞った軽量型です。
- **Cookieを使うか**：Umami・Plausible・GoatCounterはCookieを使わない設計です。Cookie同意バナーが不要になるかどうかは、計測以外の要素も含めてサイトごとに判断が必要です。
- **ライセンス**：UmamiとFathomはMIT、PlausibleはAGPL-3.0、MatomoはGPL-3.0です。GoatCounterはEUPL派生の独自条項つきです。

より詳しい比較は、ブログ記事「[セルフホストできるアクセス解析ツールの比較](/blog/selfhosted-analytics/)」にまとめています。

## 移行するときの注意

- 過去の計測データは、基本的に新しいツールへそのまま移せません。Google Analytics側のデータは参照用に残し、新ツールの計測は切り替えた日から始まると考えましょう。なおMatomoはGoogle Analyticsからデータを取り込むプラグインを提供しています（対応範囲は公式で確認してください）。
- 切り替え直後は数値が一致しません。Cookieの有無やボットの除外方法など、計測の方式が違うためです。しばらく両方を並行して動かし、差の傾向をつかんでから旧ツールを止めると判断を誤りにくくなります。

## Google Analyticsのままのほうがよい場合

- **広告と組み合わせて分析している**：Google広告やサーチコンソールとの連携、広告の成果の計測を使っている場合、同じことは代替ツールでは難しいことが多いです。
- **詳しい分析を社内の多くの人が使っている**：レポートの作り方や見方がGoogle Analyticsに慣れた形で定着しているなら、移行の負担は小さくありません。
- **併用という選択肢もある**：まずは代替ツールを並行して入れ、数字の出方や使い勝手を比べてから決める方法もあります。
