import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { DataAgeNotice } from "@/components/data-age-notice";
import { getMeta, getTools } from "@/lib/data";
import { pageMeta } from "@/lib/seo";
import { getWatchSignalFeed, getWatchSyncStatus } from "@/lib/watch-signals";
import { activityDateJst, buildActivityReport, type ActivityRow } from "@/lib/watch-changes";
import { buildOwnReport, FRESH_HOURS, RATE_MIN_BASE, RECENT_RELEASE_DAYS, releasesUrl, signed, TOOL_CURRENT_DAYS, type StarRow } from "@/lib/own-changes";
import styles from "./changes.module.css";

export const metadata: Metadata = pageMeta({
    title: "OSSの変化レポート｜Star増減・更新状況・リリースの実測",
    description: "OSSALT掲載のOSSについて、GitHubから毎日取得しているStar数の7日間の実測差分、最終push、リリースの公開日を、比較した日付つきでまとめています。推計の値は使いません。",
  path: "/changes/",
});

const fmt = (n: number) => n.toLocaleString("ja-JP");
/** YYYY-MM-DD を「10/22」の形に */
const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
const period = (w: { from: string; to: string; days: number }) => `${md(w.from)}→${md(w.to)}（${w.days}日間）`;

function StarItem({ row, rank }: { row: StarRow; rank?: number }) {
  return (
    <li className={styles.starRow}>
      {rank !== undefined && <span className={styles.rank}>{rank}</span>}
      <div className={styles.starName}>
        <Link href={"/tools/" + row.tool.id + "/"}>{row.tool.name}</Link>
        <small>{row.tool.primary_competitor_ja || row.tool.primary_competitor} の代替 · {period(row.w7)}</small>
      </div>
      <div className={styles.starNums}>
        <strong className={row.w7.gain < 0 ? styles.minus : undefined}>{signed(row.w7.gain)}</strong>
        <small>現在 {fmt(row.stars)}{row.ratePct !== null ? ` · ${row.ratePct > 0 ? "+" : ""}${row.ratePct}%` : ""}</small>
      </div>
    </li>
  );
}

function NotableCard({ label, row, value }: { label: string; row: StarRow; value: string }) {
  return (
    <article className={[styles.card, row.w7.gain < 0 ? styles.attention : styles.changed].join(" ")}>
      <span className={styles.eyebrow}>{label}</span>
      <h3 className={styles.cardTitle}><Link href={"/tools/" + row.tool.id + "/"}>{row.tool.name}</Link></h3>
      <p className={styles.bigNum}>{value}</p>
      <p className={styles.cardMeta}>{period(row.w7)}の実測 · 現在のStar {fmt(row.stars)}</p>
    </article>
  );
}

/** 外部の OSS Intelligence Watch の観測（過去の記録として残す。現在の値ではない） */
function PastCard({ row }: { row: ActivityRow }) {
  const obs = row.observation;
  return (
    <li className={styles.pastRow}>
      <div className={styles.starName}>
        <Link href={"/tools/" + row.tool.id + "/"}>{row.tool.name}</Link>
        <small>{obs.repo} · 観測 {activityDateJst(obs.observed_at)}（JST）</small>
      </div>
      <div className={styles.starNums}>
        <small>観測時のStar {fmt(obs.stars)}</small>
        <small>
          観測時点のタグ：{obs.release_status === "ok" && obs.latest_stable_release_tag ? obs.latest_stable_release_tag : "未取得"}
          （現在の最新とは限りません）
        </small>
      </div>
    </li>
  );
}

export default function ChangesPage() {
  const meta = getMeta();
  const tools = getTools();
  const report = buildOwnReport(tools, { starsAsOf: meta.stars_as_of ?? null });
  const watch = buildActivityReport(tools.filter((t) => !t.github_archived), getWatchSignalFeed());
  const sync = getWatchSyncStatus();
  const fresh = report.status === "fresh";
  const m = report.maintenance;
  const b = m.buckets;
  const bucketRows: Array<[string, number]> = [
    ["30日以内", b.within30], ["31〜90日", b.within90], ["91〜365日", b.within365], ["1年超", b.over365], ["不明", b.unknown],
  ];
  const maxBucket = Math.max(1, ...bucketRows.map(([, n]) => n));
  const { byGain, byRate, biggestDrop } = report.notable;

  return (
    <>
      <SiteHeader current="/changes/" />
      <main className="wrap page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: "OSSの変化レポート" }]} />

        {/* 1. タイトル・説明 */}
        <header className={styles.hero}>
          <div className={styles.heroMarker}>OSSALT RESEARCH DESK <span> / OWN GITHUB MEASUREMENTS</span></div>
          <h1>OSSの変化レポート</h1>
          <p>
            {["OSSALTが毎日", "GitHubから取得している", "実測値から、", "掲載OSSのStarの増減と、", "更新・保守の状況を", "まとめています。",
              "比較した日付をすべて示し、", "比較の基準が無いものは", "「比較不可」として、", "推計の値は使いません。"]
              .map((ph) => <span key={ph} className={styles.nb}>{ph}</span>)}
          </p>
        </header>

        {report.status !== "fresh" && (
          <aside className={styles.note} role="status" aria-label="データの新しさについて">
            <strong>{report.status === "none"
              ? "GitHubからの取得の記録がありません。"
              : `このレポートは${activityDateJst(report.dataAsOf as string)}（JST）に取得したデータです。データの更新が止まっています。`}</strong>
            <p>古いデータは、現在の変化として扱いません（注目の変化・直近のリリースは表示していません）。最新の状況は、各OSSのGitHubで確認してください。</p>
          </aside>
        )}
        <DataAgeNotice dataAsOf={report.dataAsOf} maxHours={FRESH_HOURS} className={styles.note} />

        {/* 2. 観測データの最新日時 */}
        <dl className={styles.sync} aria-label="データの日時">
          <div><dt>GitHubからの最新の取得</dt><dd>{report.dataAsOf ? `${activityDateJst(report.dataAsOf)}（JST）` : "記録なし"}</dd></div>
          <div><dt>このページの生成</dt><dd>{activityDateJst(meta.built_at)}（JST）</dd></div>
          <div><dt>データの状態</dt><dd>{fresh ? "最新（毎日更新）" : report.status === "stale" ? <span className={styles.syncError}>古い（{Math.floor((report.ageHours ?? 0) / 24)}日前）</span> : "記録なし"}</dd></div>
        </dl>

        {/* 3. 検証できたOSSの件数 */}
        <section className={styles.stats} aria-label="検証できたOSSの件数">
          <div><span>掲載中のOSS</span><strong>{fmt(report.total)}<small> 件</small></strong></div>
          <div><span>{TOOL_CURRENT_DAYS}日以内に取得</span><strong>{fmt(report.verified)}<small> 件</small></strong></div>
          <div><span>7日間を比較できた</span><strong>{fmt(report.star.comparable)}<small> 件</small></strong></div>
          <div><span>比較不可</span><strong>{fmt(report.star.notComparable)}<small> 件</small></strong></div>
        </section>
        <p className={styles.fine}>GitHubからの取得は、掲載OSSを数日に分けて持ち回りで行っています。そのため、OSSごとに比較の期間（開始日・終了日）が少しずつ異なります。</p>

        {/* 4. 注目の変化 */}
        <section className={styles.section} aria-labelledby="notable-heading">
          <div className={styles.heading}>
            <div><span className={styles.eyebrow}>01 / NOTABLE</span><h2 id="notable-heading">注目の変化</h2></div>
          </div>
          {fresh && byGain.length > 0 ? (
            <div className={styles.cards}>
              {byGain[0] && <NotableCard label="7日間のStar増加が最大" row={byGain[0]} value={signed(byGain[0].w7.gain)} />}
              {byRate[0] && <NotableCard label={`7日間の伸び率が最大（Star ${fmt(RATE_MIN_BASE)}以上）`} row={byRate[0]} value={`${byRate[0].ratePct! > 0 ? "+" : ""}${byRate[0].ratePct}%`} />}
              {biggestDrop && <NotableCard label="7日間のStar減少が最大" row={biggestDrop} value={signed(biggestDrop.w7.gain)} />}
            </div>
          ) : (
            <div className={styles.empty}>
              <h3>{fresh ? "比較できる変化がまだありません。" : "データが古いため、注目の変化は表示していません。"}</h3>
              <p>これは「変化が無かった」という意味ではありません。</p>
            </div>
          )}
          {fresh && byRate.length > 1 && (
            <p className={styles.fine}>
              伸び率の上位：{byRate.slice(0, 3).map((r, i) => (
                <span key={r.tool.id}>{i > 0 && "、"}<Link href={"/tools/" + r.tool.id + "/"}>{r.tool.name}</Link>（{r.ratePct! > 0 ? "+" : ""}{r.ratePct}%）</span>
              ))}
            </p>
          )}
        </section>

        {/* 5. Star増加の一覧 */}
        <section className={styles.section} aria-labelledby="stars-heading">
          <div className={styles.heading}>
            <div><span className={styles.eyebrow}>02 / STARS · 7 DAYS</span><h2 id="stars-heading">Starの増減（7日間の実測）</h2></div>
            <span className={styles.count}>増加 {fmt(report.star.up.length)} · 変化なし {fmt(report.star.flat)} · 減少 {fmt(report.star.down.length)}</span>
          </div>
          {report.star.up.length > 0 ? (
            <>
              <ol className={styles.starList}>{report.star.up.slice(0, 20).map((r, i) => <StarItem key={r.tool.id} row={r} rank={i + 1} />)}</ol>
              {report.star.up.length > 20 && (
                <details className={styles.more}>
                  <summary>残りの増加 {fmt(report.star.up.length - 20)} 件を見る</summary>
                  <ol className={styles.starList} start={21}>{report.star.up.slice(20).map((r, i) => <StarItem key={r.tool.id} row={r} rank={i + 21} />)}</ol>
                </details>
              )}
            </>
          ) : <p className={styles.fine}>7日間の比較ができたOSSのうち、Starが増えたものはありません。</p>}
          {report.star.down.length > 0 && (
            <details className={styles.more}>
              <summary>Starが減ったOSS {fmt(report.star.down.length)} 件を見る</summary>
              <ul className={styles.starList}>{report.star.down.map((r) => <StarItem key={r.tool.id} row={r} />)}</ul>
            </details>
          )}
          <p className={styles.fine}>
            30日の推移とスコアでの順位は<Link href="/trending/">急上昇のOSS</Link>で見られます。
            比較不可の{fmt(report.star.notComparable)}件は、7日以上前の記録が無い、取得が{TOOL_CURRENT_DAYS}日より古い、または記録の間隔が空きすぎたものです（0件の変化としては数えていません）。
          </p>
        </section>

        {/* 6. 更新・保守状況 */}
        <section className={styles.section} aria-labelledby="maint-heading">
          <div className={styles.heading}>
            <div><span className={styles.eyebrow}>03 / MAINTENANCE</span><h2 id="maint-heading">更新・保守の状況</h2></div>
          </div>
          <h3 className={styles.sub}>最終pushからの日数（取得した時点）</h3>
          <ul className={styles.bars} aria-label="最終pushからの日数の分布">
            {bucketRows.map(([label, n]) => (
              <li key={label}><span>{label}</span><i style={{ width: `${(n / maxBucket) * 100}%` }} aria-hidden="true" /><strong>{fmt(n)}件</strong></li>
            ))}
          </ul>

          <h3 className={styles.sub}>最新リリースの公開日が直近{RECENT_RELEASE_DAYS}日以内</h3>
          {fresh && m.recentReleases.length > 0 ? (
            <details className={styles.more}>
              <summary>{fmt(m.recentReleases.length)} 件を見る</summary>
              <ul className={styles.plainList}>
                {m.recentReleases.map(({ tool, publishedAt }) => (
                  <li key={tool.id}>
                    <Link href={"/tools/" + tool.id + "/"}>{tool.name}</Link>
                    <small>公開 {activityDateJst(publishedAt)}（JST）{releasesUrl(tool.github_url) && <> · <a href={releasesUrl(tool.github_url)!} target="_blank" rel="noopener noreferrer">GitHubのリリース ↗</a></>}</small>
                  </li>
                ))}
              </ul>
            </details>
          ) : <p className={styles.fine}>{fresh ? "該当するOSSはありません。" : "データが古いため、表示していません。"}</p>}
          <p className={styles.fine}>GitHubのReleasesの公開日です。プレリリースを含む場合があり、タグの名前（バージョン）はOSSALTでは確認していません。リリースの記録が無い・取得できなかったものが{fmt(m.noReleaseInfo)}件あります。</p>

          {m.longQuiet.length > 0 && (
            <>
              <h3 className={styles.sub}>最終pushから1年を超えたOSS</h3>
              <details className={styles.more}>
                <summary>{fmt(m.longQuiet.length)} 件を見る</summary>
                <ul className={styles.plainList}>
                  {m.longQuiet.map(({ tool, daysSincePush }) => (
                    <li key={tool.id}><Link href={"/tools/" + tool.id + "/"}>{tool.name}</Link><small>{fmt(daysSincePush ?? 0)}日前</small></li>
                  ))}
                </ul>
              </details>
              <p className={styles.fine}>取得した時点の状態で、「開発が止まった」という判定ではありません。完成して更新の少ないソフトもあります。</p>
            </>
          )}

          {m.archived.length > 0 && (
            <>
              <h3 className={styles.sub}>GitHubでアーカイブ状態のOSS（掲載から外したもの）</h3>
              <ul className={styles.plainList}>
                {m.archived.map((t) => <li key={t.id}><Link href={"/tools/" + t.id + "/"}>{t.name}</Link></li>)}
              </ul>
              <p className={styles.fine}>取得した時点の状態です。いつアーカイブされたか（出来事の日付）は記録していません。</p>
            </>
          )}
        </section>

        {/* 7. 過去の観測記録（外部の OSS Intelligence Watch） */}
        {watch.rows.length > 0 && (
          <section className={styles.section} aria-labelledby="past-heading">
            <div className={styles.heading}>
              <div><span className={styles.eyebrow}>04 / ARCHIVE</span><h2 id="past-heading">過去の観測記録</h2></div>
              <span className={styles.count}>{watch.rows.length} 件</span>
            </div>
            <p className={styles.fine}>
              外部の観測サービス（OSS Intelligence Watch）による、{activityDateJst(watch.latestObservedAt ?? watch.generatedAt ?? "")}（JST）までの記録です。
              {watch.feedStalled ? "配信元の更新が止まっているため、それ以降の変化は含みません。" : ""}
              上のレポートは、この観測とは別に、OSSALTが毎日取得しているデータで作っています。
            </p>
            <details className={styles.more}>
              <summary>{watch.rows.length} 件の記録を見る</summary>
              <ul className={styles.starList}>{watch.rows.map((row) => <PastCard key={row.tool.id} row={row} />)}</ul>
              {sync && (
                <p className={styles.fine}>
                  取り込みの最終試行：{activityDateJst(sync.last_attempt_at)}（JST、{sync.last_result === "ok" ? "成功" : `失敗：${sync.error?.label ?? "原因不明"}`}）。
                  取り込みに成功しても、配信元の観測日時（{sync.feed_generated_at ? activityDateJst(sync.feed_generated_at) : "不明"}）が古ければ、新しい観測ではありません。
                </p>
              )}
            </details>
          </section>
        )}

        {/* 8. データの読み方・方法論 */}
        <section className={styles.method}>
          <span className={styles.eyebrow}>05 / METHODOLOGY</span>
          <h2>データの読み方</h2>
          <div className={styles.methodGrid}>
            <div><strong>出典はGitHubの公開API</strong><p>Star数・最終push（pushed_at）・アーカイブ状態・リリースの公開日を、OSSALTが毎日、掲載OSSを持ち回りで取得しています。Starは利用者数や品質の保証ではありません。</p></div>
            <div><strong>差分は実測の記録どうし</strong><p>7日間の増減は「7日以上前の最後の記録」と「最新の取得」の差です。期間が7〜10日のものだけを使い、短い期間からの換算はしません。取得が{TOOL_CURRENT_DAYS}日より古いものは使いません。</p></div>
            <div><strong>出来事は作らない</strong><p>1回の取得の値だけから「リリースされた」「アーカイブされた」とは判定しません。データ全体の取得が{FRESH_HOURS}時間より古いときは、注目の変化を出さず、そのことを表示します。</p></div>
          </div>
          <p className={styles.bottomLinks}>
            <Link href="/trending/">急上昇のOSS ↗</Link>
            <Link href="/tools/">すべてのOSSを見る ↗</Link>
            <a href="/data/tools.json">元データ（tools.json）↗</a>
          </p>
        </section>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
