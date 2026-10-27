# 掲載ツールの棚卸し：残すもの・足すもの（2026-10-27）

掲載382件の見直しと、未掲載の候補の洗い出し。**これは提案であり、掲載の追加・削除はしていません。** 追加は `docs/discovery/CLOUDFLARE_DISCOVERY.md` の手順（運営者の承認→「ツール追加」ワークフロー）で行います。

## 0. 方法と限界
- 掲載データ：`public/data/tools.json`（382件。アーカイブ済み9件は除く）。
- 未掲載の候補：`data-source/discovery/openalt-queue.json`（614件。OpenAlternative系の一覧から機械的に集めた候補。Star・最終push・ライセンスはGitHub APIの値、取得は2026-10-19ごろ）。「置き換え元のSaaS」はその一覧の記載で、**OSSALTでは未検証**。
- 検索の需要：運営者が持つSearch Consoleの実績（約4週間分。数値は公開しない）。期間が短く、「需要がない」とは言えない。
- 「必要か」は、運営者の価値判断です。ここでは (1) 日本のチームが自前運用でSaaSを置き換える用途に合うか、(2) 保守が続いているか、(3) 検索の需要がある領域か、で並べた**仮説**です。

## 1. 掲載382件：本当に必要か
**結論：大半は残してよい。** 見直しの候補は少数です。
- 最終コミットが1年以上前：9件（うち2年以上：4件）。Starが500未満：3件、1,000未満：12件。
- 整理の目的は「減らす」より、**保守が止まったものを正直に示す**ことです。

### 1-A. 保守の停滞を明示する候補（要承認）
| ツール | 最終コミット | 置き換え元 | 提案 |
| --- | --- | --- | --- |
| helpy | 2023-03 | Intercom | 保守停止の注記、または掲載終了。代替の Chatwoot・Zammad は掲載済み |
| mailhog | 2024-02 | Mailtrap | 同上。代替の Mailpit は掲載済み |
| papercups | 2024-02 | Intercom | 同上 |
| crater | 2024-08 | freee | 同上（後継の有無は未確認） |
| gpt4all | 2025-05 | ChatGPT | 注記して様子を見る（Starが多く検索需要がありうる） |
| kokoro / mkdocs / mailtrain / taiga | 2025-10前後 | — | 1年を少し超えた程度。次回の更新で判断 |

「掲載をやめる」は、既存の転送の仕組み（`data-source/redirects.json`）とURLの扱いが絡むため、**削除ではなく「保守停止」の表示を先に**することを勧めます。

### 1-B. 残す（見直し不要）
- Starが少なくても、**置き換え元のSaaSが日本で需要のある領域**（freee・SmartHR・CloudSign・King of Time 向けの国産寄りのツール）は、代替の選択肢として価値があるので残す。例：tryton、libresign、docassemble、orangehrm、horilla。
- 掲載の約27%（103件）はDockerの有無が「未確認」。**これは削除理由ではなく、調査の宿題**です。

## 2. 未掲載で、足す価値が高い候補
候補を、次の2種類に分けました（Star 2,000以上・直近180日にpushあり・OSIが承認するライセンス）。

### 2-A. すでに扱っているSaaSの「代替の選択肢が増える」もの（87件のうち主なもの）
| 置き換え元 | 候補（リポジトリ・ライセンス・Star） | 備考 |
| --- | --- | --- |
| Notion | blinkospace/blinko（GPL-3.0・約1.1万） | 個人向けのメモ。Notion代替ページ（検索需要が最も高い）の厚みになる |
| Pocket | linkding（MIT・約1.1万）、wallabag（MIT・約1.3万） | Karakeepは掲載済み。Linkwardenは承認済みで、掲載は#23（未マージ）待ち |
| Datadog | HyperDX（MIT・約1万）、Loki・Vector・SkyWalking | 監視は17件で厚い領域。HyperDXは単体のSaaS代替として有力 |
| Postman | yaak、mockoon、keploy、scalar | APIクライアント系。Hoppscotch・Brunoは掲載済み |
| Airtable | apitable（AGPL-3.0・約1.6万） | |
| Asana | ever-gauzy（AGPL-3.0・約8千） | |
| Google Analytics | openpanel（AGPL-3.0・約7千） | Plausible・Umami・Matomo・PostHogは掲載済み |
| Auth0 | pocket-id、better-auth（ライブラリ）、permify | 認証は27件で厚い。差別化が小さい |
| Google Drive | opencloud、spacedrive、puter | Puterは保留中（#23）。OpenCloudはNextcloud/ownCloud系の選択肢 |
| Stripe Billing | lago（保留中）、flexprice、polar | 課金基盤。日本では需要の確認が必要 |

### 2-B. まだ扱っていないSaaS（機会）
業務・チーム向けで、日本の運営者が説明しやすいもの：
| 置き換え元 | 候補 | 備考 |
| --- | --- | --- |
| LaunchDarkly | unleash（AGPL-3.0・約1.4万） | フィーチャーフラグ |
| Boxcryptor | cryptomator（GPL-3.0・約1.6万） | 個人のファイル暗号化 |
| Clockify | solidtime（AGPL-3.0・約9千） | 勤怠・工数。KimaiとTraggoは掲載済み |
| Monday / Todoist | super-productivity（MIT・約2.3万）、donetick | タスク管理（Monday・Todoist・ClickUpは未対応） |
| 外形監視・ステータスページ | openstatus、checkmate | Uptime Kumaは掲載済み |
| cPanel | 1panel（GPL-3.0・約3.7万） | VPS運用の導線（収益導線に近い） |
| Teleport | jumpserver（GPL-3.0・約3.2万） | 踏み台サーバー |
| Visio / dbdiagram | mermaid、drawdb | 図の作成 |
| Amazon S3 | garage（AGPL-3.0・約4.7千） | MinIOは未掲載（ライセンスと保守の状況は要確認） |
| Resend / メール配信 | billionmail | Listmonk・Postalは掲載済み |
| Udemy / Skool | learnhouse、apache/answer | 教育・Q&A |

### 2-C. 要調査（データだけでは判断できない）
- **Forgejo**・**GitLab**：GitHub代替の検索需要が高い（「github 代替」「github オープンソース」系のクエリが複数）。現在はGitea・OneDev・Gogs・Gitness。Forgejo（Giteaのコミュニティ派生）とGitLab Community Editionは、**ライセンスと提供形態を一次情報で確認してから**追加を判断してください。
- **日本の主なSaaSで、まだ置き換え元にしていないもの**（キュー候補には無い。個別の調査が必要）：サイボウズ（Garoon）、マネーフォワード、Sansan、STORES、LINE（LINE WORKSを含む）、Zoho、Twilio、Power BI、Amplitude、Canva、Webflow、QuickBooks・Xero、Telegram・WhatsApp。
- **Mastodon・Lemmy・Pixelfed・Signal**：SNS・メッセージ。業務のSaaS置き換えではないので、**対象に含めるかを運営者が決める**（スコープの判断）。
- **AIエージェント・コーディング支援系**（openclaw、opencode、codex、cline、aider など上位の大半）：Starは巨大だが「置き換え元」が AI製品で、自前サーバーのSaaS置き換えとは性格が違う。**対象外とする方針の確認が必要。**

## 3. 検索の実績から言えること
- 上位のクエリは、**すでに掲載しているSaaS・ツール**（Notion、Plane、Zendesk、Salesforce、HubSpot、GitHub、Zammad、Vikunja、Mattermost、Gitea、Casdoorなど）に集中しています。「掲載がないために検索で取りこぼしている」という強いシグナルは、この期間のデータからは見えません。
- 優先すべきは**新規の追加より、需要のある領域の厚み**：Notion・GitHub・Zendesk・Salesforce・HubSpot の代替ページ（本文の充実は#49で一部実施）。
- 汎用のクエリ（「オープンソース 一覧」「プロジェクト管理 オープンソース」）が多い。カテゴリ・一覧ページの改善（#52）の効果は、実測で見る。

## 4. 推奨する進め方（承認が必要）
1. **1-Aの保守停滞**を「保守停止」の表示にする（掲載は残す）。
2. **追加の第1弾（10件前後）**：HyperDX、linkding、wallabag、blinko、apitable、openpanel、unleash、cryptomator、solidtime、super-productivity。各ツールは、公式のREADME・LICENSE・Docker・日本語の有無を**1件ずつ一次情報で確認**してから、承認フロー（`decisions.json`）に載せる。
3. **Forgejo・GitLab**は、ライセンスの確認ができ次第、GitHub代替の需要に合わせて優先して追加を検討。
4. 日本のSaaS（2-C）は、置き換え候補のOSSを探す調査を別に実施。
5. AI系・SNS系を対象に含めるかの方針を決める。

## 5. 数値の出どころ（再現用）
- 掲載の件数・古さ：`public/data/tools.json` の `last_commit`・`stars_num`・`docker_available`（2026-10-27時点）。
- 未掲載候補の抽出：`openalt-queue.json` から、掲載済み・アーカイブ済み・マッチ済みを除き、Star 2,000以上・pushが180日以内・OSI承認ライセンスで絞り込み。置き換え元が掲載済みのSaaSなら2-A、そうでなければ2-B。
- 「置き換え元」は候補一覧の記載のままで、同名のSaaSを大文字小文字を無視して照合しただけ（表記ゆれで取りこぼしがありうる）。
