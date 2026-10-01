# 掲載バッジのお知らせ手順（開発者向け）

掲載中のオープンソースの開発者に、ossalt.jpに掲載したことと、掲載バッジ（/badge/）を知らせるための手順書です。
送るのは運営者の手作業で行います（自動送信はしない）。

## 基本方針

- **一度にたくさん送らない。** 1週間に2〜3件まで。まとめて送ると迷惑行為（スパム）とみなされ、アカウントや評判を傷つけます。
- **バッジを貼ってほしいと頼まない。** 「掲載しました。情報の誤りがあれば教えてください。よければバッジもあります」という、お知らせと確認の依頼にとどめる。
- **README にバッジを追加する Pull Request は送らない。** 自分のサイトの宣伝を相手のリポジトリに入れる行為で、嫌がられます（相手から頼まれた場合を除く）。
- **送る場所は、Discussions が最優先。** リポジトリに「Discussions」タブがあれば、その中の「Show and tell」「General」などに投稿する。無ければ、プロジェクトのコミュニティ（Discord、フォーラム）や、X での返信・DMを検討する。Issue は不具合報告の場所なので、原則使わない。
- **送る前に、そのツールのページの情報が正しいか確認する。** ライセンス・説明文・代替対象に誤りがあれば、先に直してから送る。
- **CONTRIBUTING.md や Code of Conduct を読み、宣伝を禁止していないか確認する。**

## 送る順番の候補

日本語の画面翻訳があり、最近90日以内に更新されていて、コミュニティ主体で運営されている中規模のプロジェクトから選んでいます（2026年10月1日時点のデータ）。大企業・財団のプロジェクト（Grafana、Apache Superset、Apache Airflow、Docusaurus など）は、反応を得にくいので後回しにします。

READMEに他サイトの掲載バッジを貼っている（＝バッジの文化がある）のは、調べた171件のうち Outline と Logto の2件でした。

| 優先 | ツール | リポジトリ | ossalt.jpのページ | メモ |
|---|---|---|---|---|
| 1 | Logto | https://github.com/logto-io/logto | https://ossalt.jp/tools/logto/ | READMEに掲載バッジあり |
| 2 | Uptime Kuma | https://github.com/louislam/uptime-kuma | https://ossalt.jp/tools/uptime-kuma/ | |
| 3 | Memos | https://github.com/usememos/memos | https://ossalt.jp/tools/memos/ | |
| 4 | Hoppscotch | https://github.com/hoppscotch/hoppscotch | https://ossalt.jp/tools/hoppscotch/ | |
| 5 | NocoDB | https://github.com/nocodb/nocodb | https://ossalt.jp/tools/nocodb/ | ソース公開型ライセンス |
| 6 | Plane | https://github.com/makeplane/plane | https://ossalt.jp/tools/plane/ | |
| 7 | AppFlowy | https://github.com/AppFlowy-IO/AppFlowy | https://ossalt.jp/tools/appflowy/ | |
| 8 | AFFiNE | https://github.com/toeverything/AFFiNE | https://ossalt.jp/tools/affine/ | |
| 9 | Twenty | https://github.com/twentyhq/twenty | https://ossalt.jp/tools/twenty/ | |
| 10 | Coolify | https://github.com/coollabsio/coolify | https://ossalt.jp/tools/coolify/ | |
| 11 | Joplin | https://github.com/laurent22/joplin | https://ossalt.jp/tools/joplin/ | |
| 12 | Outline | https://github.com/outline/outline | https://ossalt.jp/tools/outline/ | READMEに掲載バッジあり。BUSL 1.1 |

「ソース公開型ライセンス」のツールは、当サイトでその旨を表示しています。相手が気にする可能性があるので、文面で隠さず、ページで確認してもらう形にします。

## 文面（英語）

`<...>` の部分を書き換えて使います。短く、相手の時間を取らない内容にしています。

```
Hi <Project> team,

I run ossalt.jp, a Japanese directory that helps teams in Japan find open-source alternatives to SaaS products.

<Project> is listed here as an alternative to <SaaS>:
<ossalt.jp page URL>

The page shows public data from GitHub (license, activity, OpenSSF Scorecard, Japanese UI translation, etc.) with a Japanese description. If anything is inaccurate, please let me know and I'll fix it.

If it's useful, there is also an optional "Listed on ossalt.jp" badge (no sign-up needed). Using it or not has no effect on how <Project> is ranked or described:
https://ossalt.jp/badge/

Thanks for building <Project>!
```

### 日本語訳（確認用。送るのは英語版）

> <Project>チームの皆さま
>
> ossalt.jp という、日本のチームがSaaSの代わりになるオープンソースを探すための日本語のディレクトリを運営しています。
>
> <Project> を <SaaS> の代替として掲載しました：<ページのURL>
>
> ページには、GitHubの公開データ（ライセンス、更新状況、OpenSSF Scorecard、画面の日本語翻訳の有無など）と日本語の説明を載せています。誤りがあれば教えてください。すぐに直します。
>
> よければ「Listed on ossalt.jp」バッジもあります（申し込み不要）。使うかどうかで、<Project> の順位や紹介の内容が変わることはありません。
>
> <Project> を作ってくださり、ありがとうございます。

## 記録

送ったら、ここに追記していきます（同じ相手に何度も送らないため）。

| 送った日 | ツール | 送った場所 | 反応 |
|---|---|---|---|
| | | | |
