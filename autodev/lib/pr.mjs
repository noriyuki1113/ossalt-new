/** Pull Request の本文を作る（純粋関数）。マージ・公開は人が行う。 */
export function renderPrBody({ task, branch, files, verification, before, after, limits, costUsd }) {
  const list = (xs) => (xs.length ? xs.map((x) => `- ${x}`).join("\n") : "- （なし）");
  const steps = verification.steps.map((s) => `| ${s.name} | ${s.ok ? "✅ 成功" : "❌ 失敗"} | ${s.detail ?? ""} |`).join("\n");
  return `## 解決した課題
**${task.id}：${task.title}**（対象機能：${task.feature}）

### 受け入れ条件
${list(task.acceptance)}

## 修正したファイル
${list(files)}

## テスト結果
| 手順 | 結果 | 内容 |
|---|---|---|
${steps}

## ブラウザ検証結果
- デスクトップ（1280×800）とスマホ（Pixel 7）の両方で実行
- ${verification.e2e ? `成功 ${verification.e2e.passed} ／ 失敗 ${verification.e2e.failed} ／ 不安定 ${verification.e2e.flaky}` : "ブラウザテストは実行していません"}
- 記録：\`${verification.evidenceDir ?? "（なし）"}\`（\`reports/qa/runs/\` は Git に入りません。必要ならCIの成果物を参照）

## 修正前後の証拠
**修正前（最初の失敗）**
${before ? "```\n" + before.slice(0, 1800) + "\n```" : "- 失敗の記録なし（新規の改善タスク）"}

**修正後**
${after}

## 既知の制約・残課題
${list(verification.notes ?? [])}

## 自動化の情報
- ブランチ：\`${branch}\`
- AI利用額：約 $${(costUsd ?? 0).toFixed(2)}（この起動の上限 $${limits.maxCostUsd}）
- **自動マージ・本番公開は行いません。** レビューのうえ、人がマージしてください。
`;
}
