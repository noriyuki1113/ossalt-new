import Link from "next/link";
import type { AlternativeDecision } from "@/lib/alternative-decision";
import type { GuidePick } from "@/lib/alternative-guides";
import { ToolLogo } from "@/components/tool-logo";
import { RECOMMEND_WEIGHTS } from "@/lib/rankings";

const STATE_MARK = { true: "○", false: "×", unknown: "？" } as const;
const STATE_TEXT = { true: "対応を確認", false: "対応していないことを確認", unknown: "未確認" } as const;

function Rank({ n }: { n: number | null }) {
  return n == null ? <span className="muted">未観測</span> : <>{n}位</>;
}

/** 「結局どれを選ぶか」を判断するための要約（掲載データだけから作る） */
export function AlternativeDecisionPanel({
  saasName,
  slug,
  decision,
  picks,
  hasMigration,
  hasStay,
  asOf,
}: {
  saasName: string;
  slug: string;
  decision: AlternativeDecision;
  picks: Array<GuidePick & { name: string }>;
  hasMigration: boolean;
  hasStay: boolean;
  asOf: string;
}) {
  const { rows, matrix, recommended, fromData, general } = decision;
  if (rows.length === 0) return null;
  const rowByTool = new Map(rows.map((r) => [r.tool.id, r]));

  return (
    <section id="choose" className="section decide" aria-labelledby="choose-h">
      <h2 id="choose-h" className="h3">{`${saasName}の代替、結局どれを選ぶ？`}</h2>
      <p className="muted" style={{ fontSize: "0.8125rem" }}>
        {`掲載データ（GitHubの公開情報・OpenSSF Scorecard・OSSALTの記録、取得日：${asOf}）から作った判断の目安です。未確認の項目は結論にせず「未確認」と示しています。`}
      </p>

      {picks.length > 0 && (
        <>
          <h3 className="decide__h">用途別のおすすめ（編集部の整理）</h3>
          <ul className="decide__picks">
            {picks.map((p) => {
              const r = rowByTool.get(p.tool);
              return (
                <li key={p.tool}>
                  <div className="decide__pick-head">
                    {r && <ToolLogo githubUrl={r.tool.github_url} name={p.name} size={36} />}
                    <Link href={`/tools/${p.tool}/`}><strong>{p.name}</strong></Link>
                  </div>
                  <span>{p.fit}</span>
                  {r && (
                    <small>
                      {`ライセンス：${r.licenseLabel}／導入・運用：${r.difficultyLabel}／日本語：${r.japanese}`}
                    </small>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {recommended && recommended.length > 0 && (
        <>
          <h3 className="decide__h">おすすめの目安（点数の根拠つき）</h3>
          <p className="muted" style={{ fontSize: "0.8125rem" }}>
            {`用途適合度 ${Math.round(RECOMMEND_WEIGHTS.fit * 100)}%・保守 ${Math.round(RECOMMEND_WEIGHTS.maintenance * 100)}%・ライセンス ${Math.round(RECOMMEND_WEIGHTS.license * 100)}%・日本語 ${Math.round(RECOMMEND_WEIGHTS.docs * 100)}%・導入 ${Math.round(RECOMMEND_WEIGHTS.ease * 100)}% の合計（100点満点）です。内訳は`}
            <Link href="/rankings/#recommended">おすすめランキング</Link>
            {"で確認できます。"}
          </p>
          <ol className="decide__rec">
            {recommended.map((r) => (
              <li key={r.tool.id}>
                <Link href={`/tools/${r.tool.id}/`}>{r.tool.name}</Link>
                <strong>{r.score}点</strong>
              </li>
            ))}
          </ol>
        </>
      )}

      <h3 className="decide__h">判断の早見表</h3>
      <div className="ctable-scroll">
        <table className="ctable">
          <caption className="skip">候補の判断の早見表</caption>
          <thead>
            <tr>
              <th scope="col">ツール</th>
              <th scope="col">ライセンス</th>
              <th scope="col">導入・運用の負担</th>
              <th scope="col">Docker</th>
              <th scope="col">日本語</th>
              <th scope="col">最終コミット</th>
              <th scope="col">人気</th>
              <th scope="col">成長</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.tool.id} className="ctable__row">
                <td className="name"><Link href={`/tools/${r.tool.id}/`} className="ctable__link">{r.tool.name}</Link></td>
                <td>{r.licenseLabel}</td>
                <td>{r.difficultyLabel}</td>
                <td>{r.docker}</td>
                <td>{r.japanese}</td>
                <td>{r.update}</td>
                <td className="num"><Rank n={r.popularRank} /></td>
                <td className="num"><Rank n={r.growthRank} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: "0.75rem" }}>
        導入・運用の負担は、診断データのある5つのSaaS（Notion・Slack・Zapier・Trello・Google Analytics）の代替だけ評価しています。人気・成長は掲載中の全ツールの中での順位です（<Link href="/rankings/">計算の根拠</Link>）。
      </p>

      {matrix ? (
        <>
          <h3 className="decide__h">機能の比較（{saasName}の主要機能）</h3>
          <div className="ctable-scroll">
            <table className="ctable decide__matrix">
              <caption className="skip">主要機能の対応状況</caption>
              <thead>
                <tr>
                  <th scope="col">機能</th>
                  {matrix.rows.map((r) => <th scope="col" key={r.tool.id}>{r.tool.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {matrix.features.map((f, i) => (
                  <tr key={f.id}>
                    <th scope="row">{f.label}</th>
                    {matrix.rows.map((r) => {
                      const s = String(r.states[i]) as keyof typeof STATE_MARK;
                      return <td key={r.tool.id} title={STATE_TEXT[s]} aria-label={STATE_TEXT[s]}>{STATE_MARK[s]}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ fontSize: "0.75rem" }}>
            ○＝対応を確認／×＝対応していないことを確認／？＝未確認（「非対応」ではありません）。編集部が公式の情報から整理した診断データです。
          </p>
        </>
      ) : (
        <p className="muted" style={{ fontSize: "0.8125rem" }}>
          機能ごとの比較表は、機能データのある5つのSaaS（Notion・Slack・Zapier・Trello・Google Analytics）の代替だけに載せています。{saasName}については、上の比較表と各ツールのページで確認してください。
        </p>
      )}

      <h3 className="decide__h">移行の難しさ</h3>
      <p className="muted" style={{ fontSize: "0.8125rem" }}>
        {`データの書き出し・取り込みの対応は、ツールごとの公式ドキュメントで確認が必要で、点数にできるデータがまだありません。そのため、移行の難易度は点数で示していません。`}
        {hasMigration && <>{" "}<a href="#migration">下の「移行するときの注意」</a>{"に、確認したい点をまとめています。"}</>}
        {" "}
        <Link href={`/cost-lab/?saas=${slug}`}>移行にかかる手間と費用は、Cost Labで試算できます。</Link>
      </p>

      <h3 className="decide__h">乗り換えない方がよいケース</h3>
      {fromData.length > 0 && (
        <>
          <p className="muted" style={{ fontSize: "0.8125rem", margin: "0 0 0.25rem" }}>掲載データから言えること：</p>
          <ul className="decide__list">{fromData.map((t) => <li key={t}>{t}</li>)}</ul>
        </>
      )}
      <p className="muted" style={{ fontSize: "0.8125rem", margin: "0.5rem 0 0.25rem" }}>一般的な目安（データではなく、編集方針にもとづくもの）：</p>
      <ul className="decide__list">{general.map((t) => <li key={t}>{t}</li>)}</ul>
      {hasStay && <p><a href="#stay">{`${saasName}のままのほうがよい場合の解説は、下に載せています。`}</a></p>}
    </section>
  );
}
