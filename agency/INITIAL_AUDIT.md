# 初回のテクニカル・リンク監査（2026-10-27）

ビルド済みの `out/`（本番と同じ設定：`NEXT_PUBLIC_FEATURE_FOR_YOU=1`、`NEXT_PUBLIC_SITE_URL=https://ossalt.jp`）を `node scripts/seo-audit.mjs` で読み取り専用に監査した結果です。**Search Console のデータは使っていません**（未取得）。サイトの設定は変更していません。

## 事実（監査の数値）
- ページ 970件：index可能 869（転送ページ 147件を除くと 723）、サイトマップ 712URL。
- 種類別：tools 391、alternatives 154、compare 208（index 110・解説が無く noindex 98）、categories 29、blog 7、licenses 5 ほか。
- **直す必要がある事実：0件。** title・canonical（自分のURLと一致）・meta description（indexされるページ）・h1（1つ）・viewport・html lang・JSON-LDの構文・robots.txt（Sitemap行あり、全体Disallowなし）・サイトマップ（noindex・転送ページ・存在しないURLを含まない）・内部リンク切れ・転送ページの転送先の存在・転送ページのcanonical。
- 解説の無い比較ページの noindex（98件）は、サイトマップに載っておらず、設計どおりに一致している。
- 掲載をやめたURLの転送ページ 147件は、すべて転送先が存在する。

## 影響範囲を見てから判断するもの（変更の提案ではない）
| 項目 | 事実 | 判断に必要なもの |
| --- | --- | --- |
| titleの長さ | 半角1・全角2で数えて70を超えるtitleが、tools 391件・alternatives 154件のすべてと、blog・categories・compareの一部。代表例：`/alternatives/notion/` は77。中央値は alternatives 80、tools 84 | **仮説**：検索結果で末尾が省略される可能性。Googleはtitleを書き換えることがあり、省略されても順位の評価とは別。実際のCTRと表示（GSC・SERP）を見てから、テンプレートの変更を提案する。今は変更しない |
| `/feed/` | index可能だがサイトマップに無い | 意図的か確認（フィード用のページ） |
| 開発終了（アーカイブ）のツール 9件 | サイトマップ外・内部リンク元ゼロ（`filebrowser` `flowise` `luckysheet` `maybe-finance` `ohmyform` `papermerge` `peppermint` `piper` `undb`） | 設計どおり（`src/app/sitemap.ts`）。ページ自体はindexされる |
| `/diagnosis/result/` | noindex | 意図的（診断結果のページ） |

## 内部リンク（事実）
- ツール詳細ページ（掲載中）へのリンク元は、中央値10。リンク元ゼロは、上の9件（アーカイブ）だけ。
- 代替ページ：中央値6。転送ページ（旧URL）を除くと、リンク元ゼロの代替ページは無い。
- `node scripts/seo-links.mjs --target …` で、`/alternatives/acronis/`（リンク元3件）や `/tools/immich/` を試した結果、データ上関連するのに未リンクの実在ページは見つからなかった。**内部リンクの構造は、すでに整っている。** 追加のリンクは、数合わせではなく、検索データで必要な検索意図が見えたページに、本文の文脈で置く。

## この監査では分からないこと
どのページ・クエリに検索流入があるか、順位、CTR、インデックスの状態（Googleが実際に登録したか）、コンバージョン。いずれも Search Console のデータ（`agency/README.md` の手順で取り込む）が必要。
