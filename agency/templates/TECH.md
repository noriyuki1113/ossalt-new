# TECH — {{PR / 変更}}（Technician）

- `npm run build` → `node scripts/seo-audit.mjs --strict`：（結果・新しい「直す必要がある事実」の有無）
- 変更前後の監査の差分（件数）：
- title / description / canonical / robots・noindex / 構造化データ / sitemap：
- 解説の無い比較ページの noindex（`src/app/compare/[slug]/page.tsx`・`sitemap.ts`）への影響：なし / あり（承認済み）
- モバイル表示（375px幅で横スクロールなし）・読み込み：（確認した方法。未確認なら「未確認」）
- 影響範囲を調べずに一括変更していない：[ ]
- 次に調べること：
