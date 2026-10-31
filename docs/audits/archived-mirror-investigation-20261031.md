# アーカイブ済み10ページと、ミラー取得7ページの個別調査（2026-10-31）

> 承認の範囲：個別に調査し、事実を区別する。**自動の削除・noindex・サイトマップ除外・大量のリダイレクトの変更は、していない。** このPRは文書だけ（サイトの出力・データは変更しない）。
> 区分：**公式の記載**（READMEの文、開発者の発表、LICENSE。出典URLつき）／**実測**（掲載データ・ビルド結果）／**推測**（明記）。確認日は 2026-10-31。

## 1. アーカイブ済み（GitHub）の10ページ

GitHub の「アーカイブ」は、読み取り専用にする設定で、**理由を区別しない**（開発終了・移転・保守終了・一時停止のどれでも同じ表示）。そのため、OSSALTの掲載データの `github_archived: true` を、そのまま「開発終了」と読むと誤る（PocketBaseの例。#90で補正）。個別に、公式の記載で区別しました。

| OSSALT | 区分（公式の記載による） | 根拠（出典） | 後継・移転先 | 現在の扱い（実測）と、提案 |
| --- | --- | --- | --- | --- |
| **PocketBase** | **移転**（開発は継続） | 開発者の発表 discussions/7873（2026-10-26）。READMEの先頭にも案内 | https://ganigeorgiev.com/pocketbase/pocketbase | #90 で、移転として掲載を継続（リンク切れ2件も解消）。本表の他のツールの対応の基準 |
| **Piper** | **移転**（別リポジトリで継続）。**ライセンスが変わった** | 旧README：「Development has moved: https://github.com/OHF-Voice/piper1-gpl」。新リポジトリは COPYING が GPL-3.0（旧：MIT） | OHF-Voice/piper1-gpl（GPL-3.0） | 現在は旧リポジトリ（MIT・アーカイブ）を取得。**新しいリポジトリへ取得先を切り替え、ライセンスを GPL-3.0 に更新**する案（データの変更。承認が要る）。ライセンスの条件が変わるため、解説には、旧版（MIT）と新版（GPL-3.0）の違いを書く |
| **Papermerge** | **移転**（コミュニティが継続） | 旧README：「ARCHIVED — development has moved to papermerge/papermerge-core」。新READMEに「Actively maintained by the community maintainer team」。作者は Papermerge Cloud（SaaS）に集中 | papermerge/papermerge-core（Apache-2.0） | 現在は旧リポジトリ（ciur/papermerge）を取得。**取得先を papermerge-core に切り替える**案（承認が要る） |
| **Luckysheet** | **後継への移行**（保守終了） | README：「Luckysheet is no longer maintained. It is recommended to use the upgraded version of Univer」 | Univer（OSSALTに掲載あり、Apache-2.0） | 「開発終了」の表示を、「**後継の Univer への案内**」に変える案（本文のリンクのみ。noindexなどはしない） |
| **undb** | **後継への統合**（移転） | README：「This repository is archived. The project has moved to Teable」 | Teable（teableio/teable。OSSALTに掲載あり、AGPL-3.0） | 同上：後継の Teable への案内を足す案 |
| **File Browser** | **保守終了**（セキュリティ修正も無し） | README：「archived on 2026-09-01. The last planned release has already shipped. There will be no further releases, bug fixes, or security fixes.」。**未修正の脆弱性の種類が、READMEに明記**。背景は作者のブログ（2026-07-28） | なし（フォークは可） | ページに、「保守終了・セキュリティ修正なし」を、READMEの文を根拠に、目立つ形で出す案（導入の判断に直結する警告）。**実測**：解説（content/tools）は無し |
| **Maybe（maybe-finance）** | **保守終了**（プロジェクトの終了） | README：「This repository is no longer actively maintained」「final release v0.6.0」。フォークはAGPLv3で自由（商標の「Maybe」は使用不可） | コミュニティのフォーク（OSSALTでは未確認） | 「保守終了」の根拠として、READMEを引用する案。フォークの名前・状態は、確認していないため書かない |
| **Flowise** | **事業の終了**（開発終了） | 開発チームの発表 discussions/6727（2026-08-13）：コードの凍結 2026-07-29、リポジトリのアーカイブ 2026-08-13、**EOL 2026-08-31**。npmパッケージ・Dockerイメージは非推奨。Apache-2.0のコードは公開、フォークを推奨 | なし（コミュニティのフォーク） | 「開発終了」で、事実と一致。**EOLの日付つきで、発表へのリンクを出す**案。解説（content/tools/flowise.md）がある。確認：その解説の内容が、発表と矛盾しないか（未確認） |
| **Peppermint** | **不明**（公式の説明が見つからない） | リポジトリは **2026-07-17** にオーナーがアーカイブ。READMEに、アーカイブの理由・後継の記載なし。直近のリリースは 2024-11（掲載データ）。SECURITY.md は古い版の表（5.1.x など） | 不明 | 「開発終了」と断定せず、「**GitHubでアーカイブ済み。理由・後継は公式に記載なし**」と書く案。ライセンスのファイルに、商用ライセンスに関する記述があるため、**ライセンスも再確認が要る**（未確認） |
| **OhMyForm** | **不明**（公式の説明が見つからない） | リポジトリは **2024-10-31** にオーナーがアーカイブ。READMEに理由・後継の記載なし。最後のリリース 1.0.3 | 不明 | 同上：「アーカイブ済み。理由・後継は公式に記載なし」。最後の更新から約2年（実測）で、新規の導入には向かない可能性が高いが、**推測** |

**一時停止**に当たるものは、この10件では見つかりませんでした（アーカイブは一時停止ではなく、READMEにも「再開」の記載はない）。

### 現在の扱い（実測）と、変えないこと
- アーカイブ済みのツールは、一覧・比較・ランキング・サイトマップの対象外（`github_archived`）。詳細ページは残り、indexされる（`seo-audit` の「archived-info」：意図した設計）
- **変えないこと（禁止）**：削除、noindex、サイトマップからの除外の変更、リダイレクトの変更。区分の表示だけを、公式の根拠つきで直す

### 提案（すべて承認が要る。別のPRで）
1. **表示の区分を作る**：`github_archived` の1つの真偽値では、移転・後継・保守終了・事業の終了・不明を区別できない。`development_move`（#90で追加済み）に加え、`archive_reason`（`ended`・`maintenance-ended`・`successor`・`unknown`）と、後継のid・公式の発表のURL・確認日を、`overrides.json` の patch で持つ
2. **Piper・Papermerge** は、取得先を新しいリポジトリへ切り替える（掲載を継続する価値がある。ライセンスの更新を伴う）
3. **File Browser・Flowise** は、導入の判断に直結するため、**警告の表示を優先**する（公式の文を根拠に）
4. 不明の2件（Peppermint・OhMyForm）は、断定しない文面にする

## 2. ミラーから取得している7ページ

OSSALTは、掲載データを GitHub の API から取得しています。次の7件は、GitHub のリポジトリが**ミラー**（本当の開発場所は別）です。**ミラーから取得すると、次の数値が、実際の開発の状況と一致しません。**

| 数値 | ミラーで起こること（実測：掲載データ） |
| --- | --- |
| OpenSSF Scorecard | ミラーのリポジトリの設定（ブランチ保護・コードレビュー等）を採点する。**開発の実態ではない**（7件中5件に点数がある：FFmpeg 5.2・Blender 3.5・GIMP 3.1・MediaWiki 3.1・Trac 3.6） |
| リリースの回数・最新のリリース | GitHub に Releases が無いため、**7件すべて「0回・日付なし」**（実際は別の場所でリリースしている） |
| SECURITY.md・Dependabot | ミラーには無いことが多く、**7件すべて「なし」**。実際の脆弱性の報告の窓口は、公式サイトにあるかもしれない（未確認） |
| コントリビューター数 | ミラーのコミット履歴から数える。GlitchTip は **1人**（実際の開発は GitLab の別リポジトリ） |
| 最終コミット（pushed_at） | ミラーの同期の時刻に近く、開発の状況の目安にはなる（ただし、同期が止まれば古くなる） |
| Star・Fork | ミラーのStar。GitHubでの注目度としては事実だが、開発の場ではない |

| OSSALT | 一次の開発元（公式の記載） | 出典 | ライセンスの照合（LICENSE・README と掲載データ） | 提案（承認が要る） |
| --- | --- | --- | --- | --- |
| **FFmpeg** | code.ffmpeg.org（Forgejo）・開発者のメーリングリスト。GitHub は「Mirror of git.ffmpeg.org」 | README：「Patches should be submitted to Forgejo … or the ffmpeg-devel mailing list」 | **食い違い**：LICENSE.md は「大半が LGPL v2.1以降。一部のオプション部品が GPL v2以降。組み合わせると LGPL v2.1以降が適用される」。掲載データは **GPL-2.0**（出典なし） | ライセンスを「LGPL-2.1以降（オプション部品の一部は GPL-2.0以降。有効にすると全体にGPLが及ぶ）」に補正。Scorecard・リリース・セキュリティ窓口は「ミラーのため非表示」 |
| **Blender** | projects.blender.org（コードレビュー・バグ管理）。GitHub は「Official mirror」 | README の Development の節 | **要確認**：READMEは「Blender as a whole is licensed under the GNU GPL, **Version 3**」、COPYING が指す文書（doc/license/GPL-license.txt）は **Version 2** の本文。掲載データは GPL-2.0（手動の設定）。どちらが現行か、blender.org/about/license で確認が要る | 確認後に補正。Scorecard 等は非表示 |
| **GIMP** | gitlab.gnome.org/GNOME/gimp。GitHub は「Read-only mirror」 | README の Contributing | 一致（本体は GPL-3.0。LICENSE に、プラグイン向けの例外の記載あり。ライブラリのLGPLは未確認） | Scorecard 等は非表示。ライセンスの注記（例外）は、任意 |
| **MediaWiki** | gerrit.wikimedia.org（Gerrit）。GitHub は「Mirror」 | READMEの説明・説明文（"Mirror from https://gerrit.wikimedia.org/…"） | 一致（COPYING：GPL v2 以降）。掲載データ「GPL-2.0」は「以降」が欠けている（表記の精度） | 「GPL-2.0以降」に補正（任意）。Scorecard 等は非表示 |
| **Send** | gitlab.com/timvisee/send（READMEの先頭が GitLab） | README の先頭のリンク | 一致（MPL-2.0） | Scorecard 等は非表示（現在も Scorecard は無し）。取得先を GitLab にする案（GitHub API が使えないため、**新しいActionsの実行・新しい取得処理が要る＝今回は提案のみ**） |
| **Trac** | trac.edgewall.org（Edgewall）。GitHub は「(mirror)」 | リポジトリの説明 | 一致（COPYING：BSD 3条項） | Scorecard 等は非表示 |
| **GlitchTip** | gitlab.com/glitchtip/glitchtip-backend・frontend。GitHub（burke-software/GlitchTip）は「Main development is on GitLab; GitHub repo is a mirror」 | リポジトリの説明・README の先頭 | 一致（MIT） | コントリビューター数（1人）は、ミラーの数値で誤解を招くため非表示。Scorecard 等は非表示 |

### 提案（承認が要る）
1. **ミラー判定を、データに持つ**：`metadata_source: "mirror"` と、一次の開発元のURL・出典・確認日を、`overrides.json` の patch で持つ。ミラーのときは、ページに「GitHubはミラーのため、Scorecard・リリース・セキュリティの数値は参考にならない」と出し、**該当の数値を「未確認」にする**（QIの R3 と整合）。取得先の切り替え（GitLab・Gerrit・Forgejo）は、新しい取得処理が要るため、別に承認を取る
2. **ライセンスの補正**：FFmpeg（掲載データと、LICENSE.md が食い違う）は、確実。Blender は、公式サイトで確認してから
3. **コントリビューター数**など、ミラーから取れない数値は、推測で補わない

## 3. この調査の限界
- アーカイブの日付は、確認できたもの（Flowise・Peppermint・OhMyForm・File Browser・PocketBase）だけを書いた。ほかは、未確認
- File Browser の作者のブログ、Maybe のフォーク、Flowise のフォークの状態は、読んでいない・確認していない
- 一次の開発元（GitLab・Gerrit・Forgejo）のリポジトリへは、この環境から直接アクセスしていない（README・説明文の記載と、取得できたページの記録による）
- ミラーの Scorecard・リリースなどが「実際の開発と異なる」という点は、掲載データの値（実測）と、ミラーの性質（開発は別の場所）からの**推論**。各プロジェクトの実際のScorecard・リリースの状況は、確認していない

## 4. 次の判断（承認が要る）
1. 表示の区分（`archive_reason`）の導入
2. Piper・Papermerge の取得先の切り替え（ライセンスの更新を含む）
3. File Browser・Flowise の警告の表示
4. ミラーの判定と、数値の「未確認」化／FFmpeg のライセンスの補正／Blender の確認
