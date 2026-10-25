import Link from "next/link";
import type { ToolBrief } from "@/lib/tool-brief";

function Items({ items, tone }: { items: ToolBrief["strengths"]; tone: "good" | "check" }) {
  if (items.length === 0) return <p className="muted">掲載データから言えることは、いまのところありません。</p>;
  return (
    <ul className={`brief__list brief__list--${tone}`}>
      {items.map((it) => (
        <li key={it.text}>
          {it.text}
          <small>根拠：{it.basis}</small>
        </li>
      ))}
    </ul>
  );
}

/** 選ぶ前に知りたいことを、掲載データの根拠つきで1か所にまとめた要約 */
export function ToolBriefPanel({ name, brief, asOf }: { name: string; brief: ToolBrief; asOf: string }) {
  return (
    <section className="brief panel" aria-labelledby="brief-h">
      <div className="panel__head">
        <h2 id="brief-h" className="panel__title">{`${name}を選ぶ前に（掲載データからの要約）`}</h2>
        <span className="panel__meta">取得日：{asOf}</span>
      </div>
      <div className="panel__body">
        <div className="brief__cols">
          <div>
            <h3 className="brief__h">データから分かる強み</h3>
            <Items items={brief.strengths} tone="good" />
          </div>
          <div>
            <h3 className="brief__h">確認しておきたい点・向かない条件</h3>
            <Items items={brief.cautions} tone="check" />
          </div>
        </div>

        <dl className="brief__facts">
          <div>
            <dt>導入・運用</dt>
            <dd>
              <strong>{brief.setup.label}</strong>
              <small>{brief.setup.basis}</small>
            </dd>
          </div>
          <div>
            <dt>保守・更新</dt>
            <dd>
              <strong>{brief.maintenance.label}</strong>
            </dd>
          </div>
          <div>
            <dt>人気・成長</dt>
            <dd>
              <strong>{brief.standing.popular}</strong>
              <strong>{brief.standing.growth}</strong>
              <small><Link href={brief.standing.link}>計算の根拠を見る →</Link></small>
            </dd>
          </div>
          <div>
            <dt>公式の情報</dt>
            <dd>
              {brief.links.map((l) => (
                <span key={l.label} className="brief__link">
                  <a href={l.href} rel="noopener">{l.label}</a>
                  <small>{l.note}</small>
                </span>
              ))}
            </dd>
          </div>
        </dl>
        <p className="muted brief__foot">
          掲載データ（GitHubの公開情報・OpenSSF Scorecard・OSSALTの記録）から自動で作っています。値が無い項目は、強みにも弱みにもせず「未確認」と示しています。導入前に、公式の最新の情報を確認してください。
        </p>
      </div>
    </section>
  );
}
