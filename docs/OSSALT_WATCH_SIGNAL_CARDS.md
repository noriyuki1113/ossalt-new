# OSSALT の実測観測カード — Watch連携

## 主役はOSSALT

OSSALTの既存377掲載OSS、スコア、ランキング、カテゴリー、検索URLは変えずに、
OSS Intelligence Watch の **GitHub一次データ観測**を追加表示する。

## 最初の対象

Watch の優先15件（n8n, Open WebUI, NocoDB, AppFlowy, Coolify,
Supabase, Gitea, Plausible, Umami, Vaultwarden, Nextcloud, Plane,
Baserow, Immich, Activepieces）のみ。

該当する `/tools/<id>/` 詳細ページにカードを表示する。
照合は `github.com/owner/repo` での完全一致。その他のOSSには
カードを生成しない。新しい独立のSEOページは増やさない。

## データ更新（追加費用・認証不要）

1. Watchの非公開トラックで15件を日次GitHub観測。
2. Watch側で公開して差し支えない**ホワイトリスト項目だけ**を
   `https://oss-intelligence-watch.onrender.com/data/ossalt-signals.json` に出力。
   生JSON、Watch内部DB、トークン、観測に使った非公開アーカイブは掲載しない。
3. OSSALTの既存「データ更新」ワークフローが
   `node scripts/fetch-osswatch-signals.mjs` を実行。
   自身のカタログに存在する owner/repo と完全一致する観測のみ採用。
   `public/data/osswatch-signals.json` を更新してサイトの静的ビルドに含める。
4. 外部サイトの取得失敗時は直前の検証済みファイルを残す。
   3日以上古い観測はカード内で注意表示する。

**重要：** 初回はまだ7日前の基準値がない。
Starの「7日間増加」は `null` = 比較履歴蓄積中であり、
0件増加と混同しない。安定版のタグが同じなら
リリース更新があったと断言しない。

## UI表示

- 最新のGitHub観測Star数（OSSALTの既存指標とは出所・時点が別）
- 7日間の増減（基準があるときのみ）
- GitHub `releases/latest` で確認できる安定版のタグ
- 最終観測日時（日本時間）、比較基準日、GitHub一次データへのリンク
- 観測された変化（アーカイブ化、タグの変化、7日Star増加など）
- 推定の安全性・性能・導入数・将来性の採点はしない

Google検索上、公開URLは従来のOSSALT `/tools/<id>/` を維持する。
旧WatchのSEOページの統合・301リダイレクトは未実施。

## テスト

`node --test scripts/osswatch-bridge.test.mjs scripts/fetch-osswatch-signals.test.mjs`

CIではこれに加え `npm ci && npm run build` を実行。
