"use client";

import { useState, type ReactNode } from "react";
import { buildOwnReport, type OwnReport } from "@/lib/own-changes";
import { BROWSER_DATA_PATH, parseBrowserData } from "@/lib/tool-browser-data";
import { QuietItem, ReleaseItem, StarItem } from "./items";
import styles from "./changes.module.css";

/**
 * 折りたたみの中の長いリストを、開いたときにブラウザで作る（初期HTMLを軽くするため）。
 * ページと同じ /data/tools.json と、ページを作った時刻（asOfMs）で buildOwnReport を計算し直すので、
 * 中身はビルド時にサーバーで作った場合と同じになる。
 */
export type LazyKind = "star-up-rest" | "star-down" | "recent-releases" | "long-quiet";

type Load = { state: "idle" } | { state: "loading" } | { state: "error" } | { state: "ok"; report: OwnReport };

// 同じページの複数の折りたたみで、読み込みを1回にまとめる
let shared: Promise<OwnReport> | null = null;
function loadReport(asOfMs: number, starsAsOf: string | null): Promise<OwnReport> {
  if (!shared) {
    shared = fetch(BROWSER_DATA_PATH)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: unknown) => {
        const tools = parseBrowserData(json);
        if (!tools) throw new Error("invalid");
        return buildOwnReport(tools, { asOf: new Date(asOfMs), starsAsOf });
      })
      .catch((e) => { shared = null; throw e; });
  }
  return shared;
}

function render(kind: LazyKind, report: OwnReport, skip: number): ReactNode {
  switch (kind) {
    case "star-up-rest":
      return <ol className={styles.starList} start={skip + 1}>{report.star.up.slice(skip).map((r, i) => <StarItem key={r.tool.id} row={r} rank={i + skip + 1} />)}</ol>;
    case "star-down":
      return <ul className={styles.starList}>{report.star.down.map((r) => <StarItem key={r.tool.id} row={r} />)}</ul>;
    case "recent-releases":
      return <ul className={styles.plainList}>{report.maintenance.recentReleases.map((r) => <ReleaseItem key={r.tool.id} {...r} />)}</ul>;
    case "long-quiet":
      return <ul className={styles.plainList}>{report.maintenance.longQuiet.map((r) => <QuietItem key={r.tool.id} {...r} />)}</ul>;
  }
}

export function LazyList({ kind, summary, asOfMs, starsAsOf, skip = 0 }: {
  kind: LazyKind;
  summary: string;
  asOfMs: number;
  starsAsOf: string | null;
  /** star-up-rest のとき、ページに出している上位の件数 */
  skip?: number;
}) {
  const [load, setLoad] = useState<Load>({ state: "idle" });
  const start = () => {
    if (load.state === "loading" || load.state === "ok") return;
    setLoad({ state: "loading" });
    loadReport(asOfMs, starsAsOf)
      .then((report) => setLoad({ state: "ok", report }))
      .catch(() => setLoad({ state: "error" }));
  };
  return (
    <details className={styles.more} onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) start(); }}>
      <summary>{summary}</summary>
      {load.state === "ok" ? render(kind, load.report, skip)
        : load.state === "error" ? (
          <p className={styles.fine} role="status">
            一覧のデータを読み込めませんでした。{" "}
            <button type="button" className="btn" onClick={start}>もう一度読み込む</button>
          </p>
        ) : <p className={styles.fine} role="status">読み込んでいます…</p>}
    </details>
  );
}
