import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getMeta, getTools } from "@/lib/data";
import { pageMeta } from "@/lib/seo";
import { getWatchSignalFeed, getWatchSyncStatus, type WatchSyncStatus } from "@/lib/watch-signals";
import { activityDateJst, buildActivityReport, type ActivityRow } from "@/lib/watch-changes";
import styles from "./changes.module.css";

export const metadata: Metadata = pageMeta({
  title: "OSSの変化レポート｜開発状況・リリース・Star増減の実測",
  description: "n8n、Open WebUI、NocoDBなど、OSSALT掲載のOSSをGitHubの公開情報から定点観測。安定版タグ・7日間のStar変化・観測日時を根拠とともに確認できます。",
  path: "/changes/",
});

function ActivityCard({ row }: { row: ActivityRow }) {
  const obs = row.observation;
  const tone = row.severity === "attention" ? styles.attention : row.severity === "changed" ? styles.changed : "";
  return (
    <article className={[styles.card, tone].filter(Boolean).join(" ")}>
      <div className={styles.cardTop}>
        <div>
          <span className={styles.repo}>{obs.repo}</span>
          <h3 className={styles.cardTitle}>
            <Link href={"/tools/" + row.tool.id + "/"}>{row.tool.name} <span aria-hidden="true">↗</span></Link>
          </h3>
          <p className={styles.cardMeta}>{row.tool.primary_competitor_ja || row.tool.primary_competitor} の代替</p>
        </div>
        <span className={[styles.signal, row.severity === "attention" ? styles.red : row.severity === "changed" ? styles.green : styles.gray].join(" ")}>
          {row.headline}
        </span>
      </div>
      <div className={styles.cardStats}>
        <div><span>観測時Star</span><strong>{obs.stars.toLocaleString("ja-JP")}</strong></div>
        <div><span>7日間のStar増減</span><strong>
          {obs.stars_delta_7d === null ? <small>履歴蓄積中</small> : (obs.stars_delta_7d > 0 ? "+" : "") + obs.stars_delta_7d.toLocaleString("ja-JP")}
          {row.ownGain && (
            <small title="OSSALTが毎日GitHubから取得して記録したStar数の差です。Watchの観測値とは別の出典です">
              OSSALT記録：+{row.ownGain.gain.toLocaleString("ja-JP")}／{row.ownGain.days}日間
            </small>
          )}
        </strong></div>
        <div><span>最新安定版タグ</span><strong className={styles.release}>
          {obs.release_status === "ok" && obs.latest_stable_release_tag ? obs.latest_stable_release_tag : <small>未取得／対象外</small>}
        </strong></div>
      </div>
      <div className={styles.cardFoot}>
        <span>最終観測：{activityDateJst(obs.observed_at)}（JST）{row.outdated ? " · 要再確認" : ""}</span>
        <div>
          <a href={obs.source_url} target="_blank" rel="noopener noreferrer">GitHub一次データ ↗</a>
          <Link href={"/tools/" + row.tool.id + "/"}>OSSALTで詳しく見る ↗</Link>
        </div>
      </div>
    </article>
  );
}

/** 取り込みの状態。「最終成功」と「最終試行」を分け、失敗したときは理由を示す */
function SyncStatus({ status, generatedAt }: { status: WatchSyncStatus | null; generatedAt: string | null }) {
  return (
    <dl className={styles.sync} aria-label="観測データの取り込み状況">
      <div><dt>配信元の観測日時</dt><dd>{generatedAt ? activityDateJst(generatedAt) : "未取得"}</dd></div>
      <div><dt>最終取り込み成功</dt><dd>{status?.last_success_at ? activityDateJst(status.last_success_at) : status ? "記録なし" : "記録開始前"}</dd></div>
      <div><dt>最終試行</dt><dd>
        {status ? activityDateJst(status.last_attempt_at) : "記録開始前"}
        {status && (status.last_result === "ok"
          ? <small>（成功）</small>
          : <small className={styles.syncError}>
              （失敗：{status.error?.label ?? "原因不明"}{status.error?.http_status ? `・HTTP ${status.error.http_status}` : ""}
              {status.consecutive_failures > 1 ? `・${status.consecutive_failures}回連続` : ""}）
            </small>)}
      </dd></div>
    </dl>
  );
}

export default function ChangesPage() {
  const meta = getMeta();
  const report = buildActivityReport(getTools(), getWatchSignalFeed());
  const sync = getWatchSyncStatus();
  const notable = report.rows.filter(row => row.severity !== "observing");
  const other = report.rows.filter(row => row.severity === "observing");
  return (
    <>
      <SiteHeader current="/changes/" />
      <main className="wrap page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: "OSSの変化レポート" }]} />
        <header className={styles.hero}>
          <div className={styles.heroMarker}>OSSALT RESEARCH DESK <span> / GITHUB OBSERVATIONS</span></div>
          <h1>変化を追う。<br /><em>選択の根拠を増やす。</em></h1>
          <p>OSSを選ぶとき、今のStar数だけでなく、その後どう変わったかも大切です。
            OSSALTが掲載するOSSのうち、継続観測中のプロジェクトについて、
            GitHubの公開データから確認できた変化をまとめています。</p>
          <div className={styles.heroTail}>
            <span>OBSERVATION / {report.generatedAt ? activityDateJst(report.generatedAt) + " JST" : "NO VERIFIED DATA"}</span>
            <Link href="/trending/">Star増加ランキングを見る ↗</Link>
          </div>
        </header>

        <SyncStatus status={sync} generatedAt={report.generatedAt} />

        {report.feedStalled && report.generatedAt && (
          <aside className={styles.note} aria-label="観測データの更新について" role="status">
            <strong>観測データの更新が止まっている可能性があります。</strong>
            <p>配信元の最新の観測は{activityDateJst(report.generatedAt)}（JST）です。それより新しい変化は反映されていません。
              Star数などの最新の値は、各ツールのページと<Link href="/trending/">急上昇ランキング</Link>（OSSALTが毎日取得）で確認できます。</p>
          </aside>
        )}

        <section className={styles.stats} aria-label="観測サマリー">
          <div><span>最新の観測対象</span><strong>{report.rows.length}<small> OSS</small></strong></div>
          <div><span>直近の変化シグナル</span><strong>{report.changed}<small> 件</small></strong></div>
          <div><span>7日間を比較可能</span><strong>{report.with7dBaseline}<small> 件</small></strong></div>
          <div><span>3日超の古い観測</span><strong>{report.stale}<small> 件</small></strong></div>
        </section>

        {report.with7dBaseline < report.rows.length && report.rows.length > 0 && (
          <aside className={styles.note} aria-label="比較期間について">
            <strong>履歴を蓄積しています。</strong>
            <p>7日前の実測値がないOSSについては、増減を「0」ではなく「履歴蓄積中」と表示しています。
              初めての観測からすぐに成長率を算出することはできません。
              {report.historyNotAccumulating ? "現在、配信元の観測回数が増えていないため、履歴が積み上がっていません。" : ""}
              代わりに、OSSALT自身が毎日取得して記録したStar数の差を「OSSALT記録」として別に表示しています。</p>
          </aside>
        )}

        {report.rows.length === 0 && (
          <div className="notice notice--info">
            <strong>観測データを取得できていません。</strong><br />
            外部データを取得できなかった場合、推測のランキングや変化情報は表示しません。
            <Link href="/tools/"> 通常のOSS一覧はこちら。</Link>
          </div>
        )}

        {report.rows.length > 0 && (
          <>
            <section className={styles.section} aria-labelledby="notable-heading">
              <div className={styles.heading}>
                <div><span className={styles.eyebrow}>01 / CHANGES</span>
                  <h2 id="notable-heading">注目する変化</h2></div>
                <span className={styles.count}>{notable.length} 件</span>
              </div>
              {notable.length ? (
                <div className={styles.cards}>{notable.map(row => <ActivityCard key={row.tool.id} row={row}/>)}</div>
              ) : (
                <div className={styles.empty}>
                  <div className={styles.emptyIcon} aria-hidden="true">◇</div>
                  <h3>現在、注目シグナルはありません。</h3>
                  <p>これは「変化がなかった」という保証ではありません。直近の観測間で、
                    定義した条件に該当する変化が確認されていない状態です。</p>
                </div>
              )}
            </section>
            <section className={styles.section} aria-labelledby="observing-heading">
              <div className={styles.heading}>
                <div><span className={styles.eyebrow}>02 / UNDER OBSERVATION</span>
                  <h2 id="observing-heading">継続観測中のOSS</h2></div>
                <span className={styles.count}>{other.length} 件</span>
              </div>
              <div className={styles.cards}>{other.map(row => <ActivityCard key={row.tool.id} row={row}/>)}</div>
            </section>
          </>
        )}

        <section className={styles.method}>
          <span className={styles.eyebrow}>03 / METHODOLOGY</span>
          <h2>データの読み方</h2>
          <div className={styles.methodGrid}>
            <div><strong>実際のGitHub観測だけ</strong><p>Star・Fork・最新安定版タグは公開APIのスナップショットです。Starは利用者数や製品性能ではありません。</p></div>
            <div><strong>変化は観測差分</strong><p>リリース変化は前回と今回で確認できた安定版タグの違いです。実際の公開日や全リリースの履歴を示すものではありません。</p></div>
            <div><strong>未取得は未取得</strong><p>比較基準がない場合は「履歴蓄積中」。72時間より古い値は現在の変化として扱わず、古い観測として表示します。</p></div>
          </div>
          <p className={styles.bottomLinks}>
            <Link href="/guide/">OSS選びのガイド ↗</Link>
            <Link href="/compare/">代替候補を比較 ↗</Link>
            <Link href="/tools/">すべてのOSSを見る ↗</Link>
          </p>
        </section>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
