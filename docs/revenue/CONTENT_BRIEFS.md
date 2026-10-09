# 収益につながる記事の企画（Revenue Strategy 2.0 / Phase 2）

作成：2026-10-09 ／ Revenue Council R8（BUILD）。下書きは `content/drafts/`（公開しない。運営者の承認後に `content/blog/` へ移す）。

## 方針

- **既存のページの改善を、新しい記事より先にする**（ツールの解説・ブログ・代替ページ）。
- 記事ごとに、①読者が解決したい問題、②OSSALTの独自の情報、③適切な収益の導線、を書いてから作る。
- 実機で試していない手順を「検証済み」と書かない。手順を書く記事は、運営者が試してから。
- 数値は公式の資料から出典つきで（`data-source/requirements.json` と同じ基準）。見つからなければ書かない。
- 量産しない。1テーマ1〜2本。

## 優先6テーマの現状と企画

| テーマ | 既存のページ | 公式の必要スペック | 企画 | 状態 |
|---|---|---|---|---|
| Immich | 解説あり（**2026-10-09に公式の要件の数値を追記**）、ブログ「Googleフォトからの移行」（12/8公開予定） | あり（メモリ6GB〜、CPU2コア〜） | 「Immichを動かすサーバーの選び方」 | **下書きあり**（`content/drafts/immich-server-sizing.md`、12/1以降に公開可） |
| n8n | 解説あり、ブログ「n8nのライセンスとZapier」 | 公式の資料（docs.n8n.io）に作業環境から接続できず**未確認** | 「n8nを社内で使う前に確かめること（ライセンス・常時起動・費用）」 | 企画のみ。要件は運営者が公式の資料で確認 |
| Uptime Kuma | 解説あり、ブログ「小さなチームの自前運用の構成」で言及 | READMEにメモリの数値なし（Node.js 20.4以上、対応OSのみ） | 「外からの死活監視をUptime Kumaで：監視する対象とは別の場所に置く」 | 企画のみ |
| AppFlowy | 解説あり、ブログ「チームのWiki」で言及 | 取得したデプロイの資料にメモリの数値なし | 「Notionからの移行先としてのAppFlowy：できること・できないこと」 | 企画のみ。実際の移行は運営者が試してから |
| Directus | 解説あり | 取得した資料にメモリの数値なし | 「Directusのライセンス（MSCL）：社内の利用と、サービスとしての提供の違い」 | 企画のみ。ライセンスの解釈は断定しない（専門家への確認を促す） |
| Ollama | 解説あり、ブログ「プライベートAIチャット」（11/24公開予定） | READMEにメモリの数値なし（モデルによって大きく変わる） | 既存のブログの改善を優先 | 新しい記事は作らない。GPUのサービスは提携がないため紹介しない |

## 各企画の3点

### Immich を動かすサーバーの選び方（下書きあり）
1. 問題：どのくらいのサーバーが要るか分からず、安すぎるVPSを選んで動かない／高すぎるプランを選ぶ。
2. 独自の情報：公式の要件の日本語での整理、VPSと自宅の比較、ディスクを写真の量の1.1〜1.2倍で見込むこと。
3. 導線：VPSの紹介枠（記事の下、PR表示つき）、Cost Lab（Googleフォトとの総費用）。

### n8n を社内で使う前に確かめること
1. 問題：Zapierから移りたいが、ライセンス（Sustainable Use License）とサーバーの準備が分からない。
2. 独自の情報：ソース公開型のライセンスの扱い（既存の記事と連携）、常時起動のサーバーが必要なこと、Cost Labでの費用の比べ方。
3. 導線：Cost Lab（Zapierとの比較）→ VPSの紹介枠。

### Uptime Kuma で外からの死活監視
1. 問題：社内のサービスが止まったことに気づけない。
2. 独自の情報：監視する対象と同じサーバーに置かない理由、小さなVPSで足りるかの考え方（公式の数値がないことを明記）。
3. 導線：VPSの紹介枠（監視の用途の一言つき）。

### Notion から AppFlowy へ
1. 問題：Notionの料金やデータの置き場所が気になる。
2. 独自の情報：日本語対応、できること・できないことの比較（運営者が試した範囲だけ）。
3. 導線：代替ページ・比較ページへの内部リンク。収益の導線は弱い（無理に付けない）。

### Directus のライセンス（MSCL）
1. 問題：オープンソースだと思って使ったら、商用の条件があった。
2. 独自の情報：ソース公開型とOSSの区別、条件の要点（原文へのリンク、断定しない）。
3. 導線：収益の導線は付けない（信頼のための記事）。

## 確認した出典（2026-10-09）

- Immich：https://github.com/immich-app/immich/blob/main/docs/docs/install/requirements.md
- Uptime Kuma：https://github.com/louislam/uptime-kuma/blob/master/README.md
- AppFlowy Cloud：https://github.com/AppFlowy-IO/AppFlowy-Cloud/blob/main/doc/DEPLOYMENT.md
- Directus：https://github.com/directus/docs/blob/main/content/self-hosting/1.overview.md
- Ollama：https://github.com/ollama/ollama/blob/main/README.md
- n8n：https://docs.n8n.io/hosting/ （作業環境から接続できず**未確認**）
