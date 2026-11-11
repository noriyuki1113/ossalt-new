---
description: "Zulipとは、チャンネルの中の会話を「トピック」ごとに整理できる、オープンソースのチャットです。会話が流れて追えなくなる問題を減らせます。できること、Slack・Mattermostとの違い、導入するときの注意点を解説します。"
updated: "2026-11-11"
verification:
  status: official
  checked_at: "2026-11-11"
  sources:
    - https://github.com/zulip/zulip
    - https://github.com/zulip/zulip/blob/main/LICENSE
    - https://github.com/zulip/zulip/blob/main/locale/ja/translations.json
    - https://zulip.com/help/introduction-to-topics
    - https://zulip.com/help/marking-messages-as-read
    - https://zulip.com/help/search-for-messages
    - https://zulip.com/help/integrations-overview
    - https://zulip.com/integrations/github-actions
    - https://zulip.com/integrations/nagios
    - https://zulip.readthedocs.io/en/latest/production/mobile-push-notifications.html
    - https://zulip.readthedocs.io/en/latest/production/install.html
    - https://slack.com/help/articles/115000769927-Use-threads-to-organize-discussions
    - https://docs.mattermost.com/about/editions-and-offerings.html
  note: "ZulipのREADME・LICENSE（Apache-2.0）・日本語の翻訳ファイル・ヘルプセンター・連携の一覧・自分で動かす手順と公式のスマホ通知サービスの案内と、この解説の記述を照合した。Slackのスレッドは、Slackのヘルプで、Mattermostのスレッドは、公式のエディションの説明で確認した。スマホの通知は、公式の案内で、ユーザーが10人を超える組織は有料プランか無料のコミュニティプランが必要と書かれていて、解説の記述と一致した。「最大の特徴」「すべての会話にトピック」は、公式が「トピックで整理された会話を中心に設計されている」と書くにとどまるため、公式の表現に合わせた。「休み明けや、やり取りの多いチームで、読み逃しを減らせます」「会話が多いチームほど効果が出やすい」は公式の資料では確認できないため削除した。実機では動かしていない"
---

Zulip（ズーリップ）は、Slackの代わりになるチャットです。特徴は、**チャンネルの中の会話に「トピック」（件名）を付けて整理する**仕組みです。メールの件名のように話題ごとに会話が分かれるので、時間がたってからでも、必要な話題だけを追えます。

### できること

- **トピックで整理された会話**：同じチャンネルの中でも、話題ごとに会話がまとまります。
- **未読の管理**：トピックごとに未読を確認でき、関係のない話題はまとめて既読にできます。
- **検索**：チャンネル、トピック、送った人などで絞り込んで検索できます。
- **連携**：GitHub、監視のツール、CIなどの通知を、トピックに流せます。
- 画面の日本語翻訳とDockerでの導入方法を確認でき、スマホのアプリもあります。

### Slack・Mattermostとの違い

Slackや[Mattermost](/tools/mattermost/)は、チャンネルとスレッドで会話する形です。Zulipは、**会話がトピックに分かれる**形です。違いは「[MattermostとZulipの違い](/compare/mattermost-vs-zulip/)」「[Rocket.ChatとZulipの違い](/compare/rocket-chat-vs-zulip/)」にまとめています。

### 注意点

- **トピックを付ける習慣づけが必要です。** チームで、トピックの付け方の簡単なルールを決めておくと、使いやすくなります。
- 自分で動かす場合、スマホへのプッシュ通知には、公式の通知の中継サービスを使う設定が必要です。規模によっては、有料のプランが必要になる場合があるため、公式の案内を確認してください。
- ライセンスはApache-2.0です。

[Slackの代替](/alternatives/slack/)のページで、ほかの候補も比べられます。
