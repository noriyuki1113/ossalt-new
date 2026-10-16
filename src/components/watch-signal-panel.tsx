import { getSignalForTool, type WatchSignal } from "@/lib/watch-signals";
import Link from "next/link";

/**
 * Independent observations support (never replace) OSSALT's tool catalog.
 */
function label(signal: WatchSignal): string {
  switch (signal.signal) {
    case "archived": return "GitHubでアーカイブ状態を確認";
    case "stable_release_change_observed": return "安定版のタグ変更を観測";
    case "star_growth_7d": return "7日間のStar増加を観測";
    default: return "観測中・重要な変化は未検出";
  }
}
function dateJst(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit",
        day: "2-digit", hour: "2-digit", minute: "2-digit",
      }).format(date)
    : "未確認";
}

export function WatchSignalPanel({githubUrl}: {githubUrl: string}) {
  const signal = getSignalForTool(githubUrl);
  if (!signal) return null;
  const observed = new Date(signal.observed_at).getTime();
  const stale = Date.now() - observed > 72 * 60 * 60 * 1000;
  const significant = signal.signal !== "monitoring";
  return (
    <section aria-labelledby="watch-signal-heading" className="panel"
      style={{marginBottom:"2rem", borderColor: significant ? "var(--accent,#66bba8)" : undefined}}>
      <div className="panel__head" style={{display:"flex",alignItems:"center",gap:".75rem",flexWrap:"wrap"}}>
        <h2 id="watch-signal-heading" className="panel__title">GitHubの最近の観測</h2>
        <span className="panel__meta" style={{marginLeft:"auto"}}>OSS Intelligence Watch</span>
      </div>
      <div className="panel__body">
        <p style={{margin:"0 0 1rem",fontWeight:700,color:significant ? "var(--foreground)" : undefined}}>
          {label(signal)}
        </p>
        {stale && (
          <p className="notice notice--warn" style={{marginBottom:"1rem",fontSize:".8125rem"}}>
            観測から3日以上経過しています。最新状況はGitHubで確認してください。
          </p>
        )}
        <dl style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,160px),1fr))",gap:".85rem",margin:0}}>
          <div style={{padding:".8rem",border:"1px solid var(--border)",borderRadius:"10px"}}>
            <dt className="muted" style={{fontSize:".75rem"}}>観測時のStar</dt>
            <dd style={{margin:".35rem 0 0",fontWeight:800,fontVariantNumeric:"tabular-nums"}}>
              {signal.stars.toLocaleString("ja-JP")}
            </dd>
          </div>
          <div style={{padding:".8rem",border:"1px solid var(--border)",borderRadius:"10px"}}>
            <dt className="muted" style={{fontSize:".75rem"}}>Star増減（7日間）</dt>
            <dd style={{margin:".35rem 0 0",fontWeight:800,fontVariantNumeric:"tabular-nums"}}>
              {signal.stars_delta_7d === null ? "比較用履歴を蓄積中" :
                (signal.stars_delta_7d > 0 ? "+" : "") + signal.stars_delta_7d.toLocaleString("ja-JP")}
            </dd>
          </div>
          <div style={{padding:".8rem",border:"1px solid var(--border)",borderRadius:"10px"}}>
            <dt className="muted" style={{fontSize:".75rem"}}>GitHubの最新安定版タグ</dt>
            <dd style={{margin:".35rem 0 0",fontWeight:700,overflowWrap:"anywhere"}}>
              {signal.release_status === "ok" && signal.latest_stable_release_tag
                ? signal.latest_stable_release_tag : "取得なし／確認中"}
            </dd>
          </div>
        </dl>
        <p className="muted" style={{fontSize:".75rem",lineHeight:1.7,marginTop:"1rem",marginBottom:0}}>
          観測日時：{dateJst(signal.observed_at)}（日本時間）。
          {signal.baseline_date_7d ? " 比較基準日：" + signal.baseline_date_7d + "（UTC）。" : " 7日間の比較基準はまだありません。"}
          {" "}観測日とリリース公開日は同じとは限りません。
          Star数は利用者数・安全性・品質を保証するものではありません。
          {" "}
          <a href={signal.source_url} target="_blank" rel="noopener noreferrer">
            GitHubの一次データを確認 ↗
          </a>
          {" · "}<Link href="/changes/">15件のOSS変化レポート ↗</Link>
        </p>
      </div>
    </section>
  );
}
