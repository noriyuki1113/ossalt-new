---
description: "Firebaseの代わりに自前で動かせるオープンソースのバックエンド基盤。Supabase・Appwrite・PocketBaseなどを、データベースの型・規模・ライセンスの違いから比較します。"
updated: "2026-09-26"
intro: "Firebaseの代替は、認証・データベース・ファイル保存といったアプリの裏側（バックエンド）を、自社で管理できる形にしたい場合の選択肢です。特定のクラウドへの依存を減らしたい、利用量に応じた課金を読みやすくしたい、という理由でも検討されます。"
picks:
  - tool: supabase
    fit: "PostgreSQLを中心に、DB・認証・ストレージを一体で使いたい"
  - tool: appwrite
    fit: "認証・DB・ストレージ・関数を一式そろえ、Firebaseに近い使い方をしたい"
  - tool: pocketbase
    fit: "小規模なアプリを、1つのプログラムだけで手軽に動かしたい"
  - tool: parse
    fit: "モバイルアプリ向けに、各言語のSDKがそろった基盤を使いたい"
---

## 選び方

- **データベースの型**：FirebaseのFirestoreは「ドキュメント型」のデータベースです。SupabaseはPostgreSQL（表形式のリレーショナル型）なので、移行するとデータの持ち方を設計し直すことになります。
- **規模**：PocketBaseは1つのプログラムで動き、手軽な反面、大規模な構成には向きません。本格的なサービスならSupabaseやAppwriteが候補です。
- **ライセンス**：SupabaseとParseはApache-2.0、AppwriteはBSD-3-Clause、PocketBaseとNhostはMITです。SurrealDBはBUSL 1.1で、一般的なオープンソースライセンスではありません。

## 移行するときの注意

- アプリ側のコード（Firebaseのライブラリを使っている部分）は、移行先のライブラリに書き換える必要があります。
- 登録済みユーザーを移す場合、パスワードの扱いが最大の論点です。移行先がFirebaseのパスワード形式を取り込めるか、利用者にパスワードの再設定をしてもらうかを、移行先の手順で確認しましょう。
- Firebaseのセキュリティルールは、そのままでは移りません。移行先の権限設定（SupabaseならPostgreSQLの行単位の権限など）で作り直す必要があります。
