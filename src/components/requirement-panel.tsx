import { formatCheckedOn, formatSpec, type Requirement } from "@/lib/requirements";

/**
 * 「動かすのに必要なスペック（公式の資料の目安）」。編集の情報なので、広告（VPSの紹介枠）とは別の枠に置く。
 * 公式の資料に数値があるツールだけに出す（data-source/requirements.json）。
 */
export function RequirementPanel({ name, req }: { name: string; req: Requirement }) {
  return (
    <section className="mt2 panel req-panel" aria-labelledby="req-heading">
      <div className="panel__head">
        <h2 id="req-heading" className="panel__title">
          {name}を動かすのに必要なスペック（公式の目安）
        </h2>
      </div>
      <div className="panel__body">
        <table>
          <tbody>
            {req.minimum && (
              <tr>
                <th scope="row">最小</th>
                <td>{formatSpec(req.minimum)}</td>
              </tr>
            )}
            {req.recommended && (
              <tr>
                <th scope="row">推奨</th>
                <td>{formatSpec(req.recommended)}</td>
              </tr>
            )}
          </tbody>
        </table>
        {req.note && (
          <p className="muted" style={{ margin: "0.75rem 0 0", fontSize: "0.875rem" }}>
            {req.note}
          </p>
        )}
        <p className="muted req-panel__source">
          出典：
          <a href={req.source_url} target="_blank" rel="noopener noreferrer">
            {req.source_title}
          </a>
          （{formatCheckedOn(req.checked_on)}に確認）。使う人数やデータの量で必要な量は変わります。導入の前に、公式の最新の資料を確かめてください。
        </p>
      </div>
    </section>
  );
}
