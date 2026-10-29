# 品質監査の結果（初回・2026-10-29、基準 qi-1.0）

実行：`npm run build` → `npm run qi:full`（監査ID は `quality/history/index.json`）。対象は掲載データの全399件（掲載中389件＋アーカイブ済み10件）で、**399件すべてを監査（未監査0・失敗0）**。

## 1. 全体

| A | B | C | D | 未評価 | 暫定 |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 18 | 157 | 224 | 0 | 0 | 0 |

- **A（18件）**：手書きの解説＋要約＋公式資料（README・LICENSE）との照合の記録があるページ（#82・#83）。
- **B（157件）**：手書きの解説はあるが、公式資料との照合の記録が無い（Aの条件を満たさない）か、要約が無い。
- **C（224件）**：手書きの解説が無い（自動の要約とデータだけ）。
- D・未評価は0件。共通テンプレートの表示検査（代表5ページ）は問題なし。
- 優先度：P0 33・P1 14・P2 194・P3 158。

## 2. 共通の構造的な問題（TYPE A：1回の修正で多くのページが直る）

| 問題 | 影響 | 根拠 | 修正案 |
| --- | ---: | --- | --- |
| **OSI承認でないライセンスのツールにも、共通テンプレートが「〇〇の代替オープンソース」（title）・「〇〇 のオープンソース代替。」（導入文）と書いている** | 24件（n8n・Dify・Open WebUI・LobeChat・NocoDB・Outline・Sentry・Directus など） | `src/lib/seo-copy.ts` の toolTitle、`src/app/tools/[slug]/page.tsx` の導入文。サイト自身の分類（`licenseGroupOf`）は「ソース公開型」。n8nの解説も「一般的なオープンソースライセンスではありません」と書いており、ページ内で矛盾 | `licenseGroupOf` が source-available のときは「〇〇の代替（ソース公開型）」などに切り替える。#74 で代替ページに入れた仕組みと同じ考え方 |
| **GitHubのリポジトリが読み取り専用のミラー**で、最終コミット・Scorecardなどをミラーから取得している | 7件（GIMP・FFmpeg・Blender・MediaWiki・Send・Trac・GlitchTip） | GitHubの説明が「Read-only mirror of …」（例：GIMPは gitlab.gnome.org が開発場所）。GIMPのScorecard 3.1 はミラーに対する機械採点 | ミラーのときは、セキュリティ評価・Issue系の表示を「ミラーのため参考外」にし、公式の開発場所へのリンクを出す。データに `upstream_url` を持たせる |
| アーカイブ済みの10件が index のまま、一覧・サイトマップから外れている | 10件 | robots=index、サイトマップに無い | 流入を見て、noindex にするか、そのまま残すかを決める（機械的に除外しない） |
| 代替対象が SaaS ではなく OSS、または自分自身 | 7件（k3s→Kubernetes、Sentry→Sentry、GlitchTip・Bugsink→Sentry、phpMyAdmin↔Adminer、pgAdmin→DBeaver） | `primary_competitor` | k3s は「マネージドのKubernetes（EKS・GKEなど）の代わり」か「関連ツール」に。Sentry系は「Sentry（クラウド版）」とクラウドを明示 |
| FAQの約半分が、ほかのページと同じ文（ツール名を除く） | ほぼ全ページ（中央値 約56%） | 定型の回答が20ページ以上で一致 | 掲載データで答えられる問いに絞り、ツール固有の問い（解説がある場合）を足す |

## 3. 重点12ページの結論

| ページ | 評価 | 結論（監査仮説の検証） |
| --- | --- | --- |
| /tools/n8n/ | B 87・P0 | **確定**：説明文の「400以上のサービスと連携」が、公式README の「1500+ integrations」と食い違う（解説は1,500以上で正しい）。**確定**：ライセンスは Sustainable Use License（READMEも「fair-code」と表記）なのに、title と導入文が「オープンソース代替」。「セルフホストで無制限に使える」はREADMEに記載が無く、要確認 |
| /tools/dify/ | B 87・P0 | READMEは「LLMアプリの開発基盤（ワークフロー・RAG・エージェント）」。**ChatGPT Plus の直接の代替ではなく「関連ツール」または「組み合わせ型」が妥当**（修正案。分類は未変更）。ライセンスは「Apache 2.0＋追加条件」で、テンプレートの「オープンソース代替」表記も該当 |
| /tools/gimp/ | C 57・P0 | **確定**：GitHubは「Read-only mirror of gitlab.gnome.org/GNOME/gimp」。開発状況・Scorecard（3.1）はミラーの値で、誤解を招く。手書きの解説も無い |
| /tools/sops/ | A 95・P3 | #83で解説を追加済み。Vaultとの違い（ファイルの暗号化の道具で、秘密情報のサーバーではない）は説明済み。導入手順の記載が無い（READMEも公式ドキュメントへ誘導） |
| /tools/k3s/ | B 87・P1 | 解説は「軽量なKubernetes」「CNCF適合の正式なKubernetes」と説明済み（README の「fully conformant … Kubernetes distribution」と一致）。**問題は分類**：代替対象が「Kubernetes」（OSS）で、SaaS代替として不自然 |
| /tools/wbo/ | C 63・P2 | **確定**：手書きの解説が無い。READMEには「大きな仮想ボードに多人数で同時に描ける」「ボードはSVGで保存」などの固有の情報がある |
| /tools/grist/ | C 63・P2 | **確定**：手書きの解説が無い。READMEには「関係データベースの機能を持つスプレッドシート」「Community・デスクトップ・静的の3つの版」「有料版の追加機能」などの重要な情報がある |
| /tools/odoo/ | B 93・P3 | 解説あり。要約が無い |
| /tools/vllm/ | B 93・P3 | 解説あり（#45で拡充）。要約が無い |
| /tools/ntfy/ | B 100（Aの条件不足）・P3 | 解説・要約あり。公式資料との照合の記録が無いのでB |
| /tools/obs/ | B 88・P3 | 解説あり。要約と導入の判断材料が不足 |
| /tools/bruno/ | B 88・P3 | 解説あり。要約と導入の判断材料が不足 |

確認に使った資料：各リポジトリの README（raw.githubusercontent.com、2026-10-29）、掲載データ（public/data/tools.json）、ビルド結果（out/）。

## 4. 改善の優先度トップ20

| # | 対象 | 優先度 | 種類 | 問題 | 修正方針 |
| ---: | --- | --- | --- | --- | --- |
| 1 | 共通テンプレート（24件：n8n・Dify・Open WebUI・LobeChat・Outline ほか） | P0 | A | ソース公開型に「オープンソース代替」 | title・導入文をライセンスの分類で切り替える |
| 2 | ミラー7件（GIMP・FFmpeg・Blender・MediaWiki・Send・Trac・GlitchTip） | P0 | A | ミラーからの開発状況・Scorecard | 表示の切り替えと、公式の開発場所の記録 |
| 3 | /tools/n8n/ | P0 | B | 連携数の食い違い（400 vs 1500+） | 説明文を公式READMEに合わせる（overridesで補正） |
| 4 | /tools/appwrite/・/tools/pocketbase/ | P0 | B | 存在しない比較ページへのリンク | PocketBaseのアーカイブ判定を確定してから、リンクを直す |
| 5 | アーカイブ済み10件 | P0→要判断 | A | index だがサイトマップ外 | 流入を見て、noindex か維持かを決める |
| 6 | /tools/k3s/ ほか代替対象がOSSの7件 | P1 | B | SaaS代替として不自然 | 代替対象の見直し（クラウド版を明示、または関連ツール） |
| 7 | /tools/dify/ | P1 | B | ChatGPT Plus の代替という分類 | 代替の種類を「関連ツール」等に（alternative-relations に追加） |
| 8 | /tools/nocodb/ | P1 | B | 説明文がソース公開型を「オープンソース」と表記 | 説明文の修正 |
| 9〜20 | 手書きの解説が無く、検索の表示が多い順：EspoCRM・Notesnook・Grype・Anytype・Wazuh・Kratos・Shopware・WBO・OpenReplay・DefectDojo・Audiobookshelf・Planka | P2 | C | 独自の解説が無い | 公式README・LICENSEから解説と要約を追加（#82・#83と同じ方法） |

（9〜20の順番は手元の Search Console の表示回数による。数値は公開リポジトリに書かない）

## 5. 次の改善の進め方（推奨の順）
1. **TYPE A を先に**：テンプレートの「オープンソース代替」表記（1件の修正で24ページ）→ ミラーの扱い（7ページ）。
2. **データの補正**：n8n の連携数、NocoDB の説明文、代替対象の見直し（k3s など）、Dify の代替の種類。
3. **TYPE C**：解説が無く表示の多いページから、10件ずつ解説を追加（README・LICENSE が根拠）。
4. **既存の解説の照合**：B評価157件を、READMEと照合して記録し、要約を足す（Aにするための条件）。

いずれも、修正の前に運営者の承認を得る。

## 6. この監査で分からないこと
- 解説の内容が、最新の公式ドキュメントと一致しているか（照合したのは README・LICENSE だけ。照合の記録が無いページは「未確認」）。
- 本番のキャッシュの状態（ローカルのビルド結果を監査している）。
- 個々のページのスマホでの実操作（共通テンプレートを代表5ページで検査）。
- Core Web Vitals の実測。
