import Link from "next/link";
import { activityDateJst } from "@/lib/date-jst";
import { releasesUrl, signed, type MaintenanceRow, type OwnTool, type StarRow } from "@/lib/own-changes";
import styles from "./changes.module.css";

// 変化レポートの行。サーバー（ページ）と、折りたたみを開いたときのブラウザの両方で使う。

export const fmt = (n: number) => n.toLocaleString("ja-JP");
/** YYYY-MM-DD を「10/22」の形に */
const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
export const period = (w: { from: string; to: string; days: number }) => `${md(w.from)}→${md(w.to)}（${w.days}日間）`;

export function StarItem({ row, rank }: { row: StarRow; rank?: number }) {
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

export function ReleaseItem({ tool, publishedAt }: { tool: OwnTool; publishedAt: string }) {
  return (
    <li>
      <Link href={"/tools/" + tool.id + "/"}>{tool.name}</Link>
      <small>公開 {activityDateJst(publishedAt)}（JST）{releasesUrl(tool.github_url) && <> · <a href={releasesUrl(tool.github_url)!} target="_blank" rel="noopener noreferrer">GitHubのリリース ↗</a></>}</small>
    </li>
  );
}

export function QuietItem({ tool, daysSincePush }: MaintenanceRow) {
  return <li><Link href={"/tools/" + tool.id + "/"}>{tool.name}</Link><small>{fmt(daysSincePush ?? 0)}日前</small></li>;
}
