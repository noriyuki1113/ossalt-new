import { VERIFICATION_DESCRIPTIONS, VERIFICATION_LABELS, type Verification, type VerificationStatus } from "@/lib/verification";

const ORDER: VerificationStatus[] = ["official", "hands-on", "recheck", "unverified"];

/** 解説の検証状態。記録が無いものは「未検証」と出し、確認したようには見せない */
export function VerificationNote({ v, checkedAtLabel }: { v: Verification; checkedAtLabel?: string }) {
  return (
    <div className="vnote">
      <p className="vnote__line">
        <span className={`vnote__badge vnote__badge--${v.status}`}>{VERIFICATION_LABELS[v.status]}</span>
        {v.status === "unverified" && "この解説は、公式資料との照合を記録していません。導入前に、公式の情報でご確認ください。"}
        {v.status === "official" && `公式資料と照合しました${checkedAtLabel ? `（${checkedAtLabel}）` : ""}。`}
        {v.status === "hands-on" && `実際に動かして確認しました${checkedAtLabel ? `（${checkedAtLabel}）` : ""}。`}
        {v.status === "recheck" && `以前の確認${checkedAtLabel ? `（${checkedAtLabel}）` : ""}から時間がたっており、再確認が必要です。`}
      </p>
      {v.note && <p className="vnote__note">{v.note}</p>}
      {v.sources.length > 0 && (
        <p className="vnote__src">
          {"出典："}
          {v.sources.map((u, i) => (
            <span key={u}>{i > 0 && "　"}<a href={u} rel="noopener">{new URL(u).hostname}</a></span>
          ))}
        </p>
      )}
      <details className="vnote__legend">
        <summary>検証状態の意味</summary>
        <ul>
          {ORDER.map((k) => (
            <li key={k}><span className={`vnote__badge vnote__badge--${k}`}>{VERIFICATION_LABELS[k]}</span>{VERIFICATION_DESCRIPTIONS[k]}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
