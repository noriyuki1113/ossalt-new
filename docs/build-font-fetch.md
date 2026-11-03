# ビルド時の Google Fonts 取得エラーへの対応（提案）

## 事実（2026-11-03 に確認）
- `src/app/layout.tsx` は `next/font/google` で Noto Sans JP・Zen Kaku Gothic New・JetBrains Mono を使う。**ビルドのたびに** fonts.googleapis.com / fonts.gstatic.com から取得する
- 取得に失敗すると、コードに関係なくビルドが落ちる。ログは `module-not-found`（`internal/font/google/...module.css`）
- 同じ原因の失敗：GitHub Pages 公開 run 513（11/1）・518（11/3、#90）、e2e（#97、11/3）。いずれも、同じコミットの再実行・次のビルドで成功した（一時的）
- 落ちたビルドは公開物を更新しない（公開中のサイトは前のまま）。ただし、反映が遅れ、PR の CI も止まる
- 私には Actions の再実行の権限がない（403）ため、再実行は人手になる

## 案
| 案 | 内容 | 利点 | 欠点 |
| --- | --- | --- | --- |
| **A（この PR）** | ビルドの失敗が「フォント取得の一時的な失敗」のときだけ、最大3回まで再実行（15秒・45秒待つ）。`scripts/build-retry.mjs` | 変更が小さい。サイトの出力・見た目は変わらない。依存の追加なし。戻すのは1行 | 外部取得は残る。長い障害のときは3回でも落ちる（その場合は失敗のまま） |
| B | フォントをリポジトリに同梱（`next/font/local`、または `@fontsource`） | 外部取得がなくなる | 日本語フォントは大きい（`@fontsource/noto-sans-jp` の展開サイズが約84MB、Zen Kaku が約27MB。使う太さと分割だけに絞っても数MB〜）。リポジトリの肥大、見た目・表示速度（CLS・LCP）の再検証が必要。フォントのライセンス（OFL）の表記の確認も要る |

## 推奨
まず A。B は、A でも失敗が続くときの次の手として、別の承認で。

## A の安全性
- 再試行するのは、出力に「フォントの取得元」と「取得失敗の語」が両方あるときだけ。型エラー・テストの失敗・フォントと無関係な `module-not-found` は、再試行せず、そのまま失敗にする（`scripts/build-retry.test.mjs`）
- 終了コードは、最後の試行の結果をそのまま返す
- 変更するワークフローは、ビルド工程の `run:` の1行だけ（`deploy-pages.yml`・`e2e.yml`）。トリガー・schedule・権限・秘密情報は変更しない

## 採用した対応（案B：フォントの同梱。2026-11-03）
再試行（案A）でも、同日の公開（run 539）が失敗したため、案Bに進んだ。

- `next/font/google` をやめ、`@fontsource-variable/noto-sans-jp` 5.3.1・`@fontsource/zen-kaku-gothic-new` 5.3.1・`@fontsource/jetbrains-mono` 5.3.0（いずれも OFL-1.1）を依存に追加。ビルド時の外部取得がなくなる。
- `scripts/gen-fonts-css.mjs`（`npm run fonts:gen`）が、fontsource の CSS から `src/app/fonts.css` を生成する。生成物はコミットする。`--check` で最新か確認でき、`scripts/gen-fonts-css.test.mjs` が `npm test` で確認する（生成物が古い・外部URLを含む・`layout.tsx` が `next/font/google` に戻る、のいずれでも失敗する）。
- 以前と同じ：太さ（Noto 400/500/700 を使用、Zen 700/900、JetBrains 400/700）、分割（unicode-range のスライス。Noto 124、Zen 121、JetBrains 6）、`font-display: optional`、ビルド出力の `_next/static/media` のサイズ（約8.9MB）。
- Noto Sans JP は、Google の配信と同じ**可変フォント**（スライスごとに1ファイルで全太さ）にした。静的ファイル版を先に試したところ、太さごとに別ファイルになり、出力が約13MB・1ページのフォント要求が増えた（186件）ため、可変に切り替えた（同じページで124件）。
- 変えた点：
  - woff（旧形式）の予備を外し、woff2のみ。
  - JetBrains Mono の latin の `preload` が無くなった（`next/font` が自動で付けていた）。`display: optional` のため、初回の表示では等幅が代替フォントのままになる可能性がある（Noto・Zen は以前から `preload: false`）。
  - `next/font` が付けていた、代替フォントのサイズ調整（`* Fallback`）は無くなった。サイトは `--font-body` などに直接フォント名を指定している。
- 戻す方法：この変更をrevertする。
