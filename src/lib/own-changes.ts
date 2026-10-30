/**
 * OSSの変化レポート（/changes/）の主データ：OSSALT 自身が毎日 GitHub から取得している実測値。
 *
 * 外部の OSS Intelligence Watch が止まっても、このレポートは止まらない。
 * 純粋関数のみ（node:test から直接読み込めるよう、import は型だけ）。
 *
 * 守ること：
 * - 比較の基準が無いものは「比較不可」。0 の変化として数えない
 * - 実際の比較の日付（開始日・終了日・日数）を、そのまま出す
 * - 取得が古い値は、現在の変化として出さない
 * - 1時点の値から「新しくリリースされた」「アーカイブされた」などの出来事を作らない
 *   （出来事の検知には、前回と今回の検証済みのスナップショットが必要。現時点では持っていない）
 * - 将来の日時・不正な値は捨てる
 */
import type { Tool } from "./tools.ts";

export type OwnTool = Pick<
  Tool,
  | "id" | "name" | "github_url" | "stars_num" | "last_commit" | "github_archived"
  | "latest_release_at" | "releases_12mo" | "star_gain" | "star_gain_7d"
  | "primary_competitor" | "primary_competitor_ja"
> & {
  /** GitHub からこのツールの値を最後に取得した日時（ISO）。古い公開データには無い */
  github_checked_at?: string | null;
};

/** データ全体（最新の取得）がこれより古ければ「古い」とみなす。取得は毎日なので、1日分の遅れは許容 */
export const FRESH_HOURS = 48;
/** ツールごとの取得がこれより古ければ、そのツールの値は「現在の値」として扱わない */
export const TOOL_CURRENT_DAYS = 7;
/** 7日間の比較として認める日数（記録の間隔が空いたものは除く。build-data の maxDays と同じ） */
export const WINDOW7_MIN = 7;
export const WINDOW7_MAX = 10;
/** 伸び率を出すときの、比較の起点のStar数の下限（小さなリポジトリの率が極端になるのを防ぐ） */
export const RATE_MIN_BASE = 1000;
/** 「最新リリースの公開日が直近」とみなす日数 */
export const RECENT_RELEASE_DAYS = 7;
/** 時計のずれとして許す未来の時刻 */
const SKEW_MS = 5 * 60 * 1000;

const DAY_MS = 86400e3;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 日本時間の日付（YYYY-MM-DD）。不正なら null */
export function jstDay(ms: number): string {
  return new Date(ms + 9 * 3600e3).toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}

/** ISO の日時を検証する。未来（時計のずれを超える）・不正・1970年以前は null */
export function validInstant(iso: string | null | undefined, nowMs: number): number | null {
  if (typeof iso !== "string" || iso === "") return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t) || t <= 0 || t > nowMs + SKEW_MS) return null;
  return t;
}

export function normalizeRepo(url: string | null | undefined): string | null {
  const m = /^https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/.exec(url ?? "");
  return m ? `${m[1]}/${m[2]}`.toLowerCase() : null;
}

export type StarWindow = { gain: number; days: number; from: string; to: string };

/**
 * 実測の期間の値を検証する。日付の形・順序・日数の一致・整数・今日以前・
 * 「終了日（＝取得日）が古すぎない」を確かめ、満たさなければ null（比較不可）。
 */
export function validWindow(
  w: { gain: number; days: number; from: string; to?: string } | null | undefined,
  todayJst: string,
  { minDays, maxDays }: { minDays: number; maxDays: number },
): StarWindow | null {
  if (!w || typeof w.to !== "string" || !DATE_RE.test(w.from) || !DATE_RE.test(w.to)) return null;
  if (!Number.isSafeInteger(w.gain) || !Number.isSafeInteger(w.days)) return null;
  if (w.from >= w.to || w.to > todayJst) return null;
  if (daysBetween(w.from, w.to) !== w.days) return null;
  if (w.days < minDays || w.days > maxDays) return null;
  if (daysBetween(w.to, todayJst) > TOOL_CURRENT_DAYS) return null;
  return { gain: w.gain, days: w.days, from: w.from, to: w.to };
}

export type StarRow = {
  tool: OwnTool;
  stars: number;
  w7: StarWindow;
  /** 30日程度の実測（無ければ null。比較不可） */
  w30: StarWindow | null;
  /** 7日間の伸び率（%）。起点のStar数が RATE_MIN_BASE 未満なら null */
  ratePct: number | null;
};

export type MaintenanceRow = {
  tool: OwnTool;
  /** 最終push（GitHubの pushed_at）からの日数。取得日を基準に数える */
  daysSincePush: number | null;
};

export type OwnReport = {
  asOf: string;
  /** 掲載OSSのうち、最も新しい GitHub からの取得日時（ISO）。無ければ null */
  dataAsOf: string | null;
  /** fresh＝新しい／stale＝古い（48時間超）／none＝取得の記録が無い */
  status: "fresh" | "stale" | "none";
  ageHours: number | null;
  /** 掲載中（アーカイブ以外）の重複を除いた件数 */
  total: number;
  /** 直近 TOOL_CURRENT_DAYS 日以内に GitHub から取得できた件数 */
  verified: number;
  /** 同じリポジトリを指していたため除いた件数 */
  duplicatesRemoved: number;
  star: {
    up: StarRow[];
    down: StarRow[];
    flat: number;
    comparable: number;
    /** 7日間の比較ができない（記録が足りない・取得が古い・不正な値） */
    notComparable: number;
  };
  /** 注目の変化。データが古いときは空（古い値を現在の変化として出さない） */
  notable: { byGain: StarRow[]; byRate: StarRow[]; biggestDrop: StarRow | null };
  maintenance: {
    buckets: { within30: number; within90: number; within365: number; over365: number; unknown: number };
    /** 最終pushから1年を超えたもの（状態であって、「止まった」という出来事ではない） */
    longQuiet: MaintenanceRow[];
    /** アーカイブ状態のもの（掲載から外したものを含む。取得時点の状態） */
    archived: OwnTool[];
    /** 最新のリリースの公開日が直近のもの（GitHub の Releases の公開日。プレリリースを含みうる） */
    recentReleases: Array<{ tool: OwnTool; publishedAt: string }>;
    /** リリースの記録が無い・取得できなかったもの */
    noReleaseInfo: number;
  };
};

/** ツールの取得日時。github_checked_at が無い古いデータでは、実測の期間の終了日（日付のみ）で代える */
export function checkedDay(t: OwnTool, nowMs: number): string | null {
  const at = validInstant(t.github_checked_at ?? null, nowMs);
  if (at !== null) return jstDay(at);
  const to = t.star_gain_7d?.to ?? t.star_gain?.to ?? null;
  return to && DATE_RE.test(to) && to <= jstDay(nowMs) ? to : null;
}

export function buildOwnReport(
  allTools: OwnTool[],
  opts: { asOf?: Date; starsAsOf?: string | null } = {},
): OwnReport {
  const nowMs = (opts.asOf ?? new Date()).getTime();
  if (!Number.isFinite(nowMs)) throw new Error("Invalid report date");
  const today = jstDay(nowMs);

  // 重複の除去：同じ id、または同じ GitHub のリポジトリは1件にする（先に出たものを残す）
  const seenId = new Set<string>();
  const seenRepo = new Set<string>();
  let duplicatesRemoved = 0;
  const unique: OwnTool[] = [];
  for (const t of allTools) {
    const repo = normalizeRepo(t.github_url);
    if (seenId.has(t.id) || (repo && seenRepo.has(repo))) { duplicatesRemoved++; continue; }
    seenId.add(t.id);
    if (repo) seenRepo.add(repo);
    unique.push(t);
  }
  const active = unique.filter((t) => !t.github_archived);

  // データ全体の新しさ：meta の stars_as_of（取得日時の最大）。無ければツールの取得日時から計算
  const perTool = unique.map((t) => validInstant(t.github_checked_at ?? null, nowMs)).filter((x): x is number => x !== null);
  const metaAt = validInstant(opts.starsAsOf ?? null, nowMs);
  const dataMs = metaAt ?? (perTool.length ? Math.max(...perTool) : null);
  const ageHours = dataMs === null ? null : Math.max(0, (nowMs - dataMs) / 3600e3);
  const status: OwnReport["status"] = dataMs === null ? "none" : ageHours! > FRESH_HOURS ? "stale" : "fresh";

  const verified = active.filter((t) => {
    const d = checkedDay(t, nowMs);
    return d !== null && daysBetween(d, today) <= TOOL_CURRENT_DAYS;
  }).length;

  // Star の7日間の実測
  const rows: StarRow[] = [];
  let notComparable = 0;
  for (const t of active) {
    const w7 = Number.isSafeInteger(t.stars_num) && (t.stars_num as number) >= 0
      ? validWindow(t.star_gain_7d, today, { minDays: WINDOW7_MIN, maxDays: WINDOW7_MAX })
      : null;
    if (!w7) { notComparable++; continue; }
    const stars = t.stars_num as number;
    const base = stars - w7.gain;
    const w30 = validWindow(t.star_gain, today, { minDays: 14, maxDays: 45 });
    rows.push({
      tool: t, stars, w7, w30,
      ratePct: base >= RATE_MIN_BASE ? Math.round((w7.gain / base) * 1000) / 10 : null,
    });
  }
  const byName = (a: StarRow, b: StarRow) => a.tool.name.localeCompare(b.tool.name, "ja");
  const up = rows.filter((r) => r.w7.gain > 0).sort((a, b) => b.w7.gain - a.w7.gain || byName(a, b));
  const down = rows.filter((r) => r.w7.gain < 0).sort((a, b) => a.w7.gain - b.w7.gain || byName(a, b));
  const flat = rows.length - up.length - down.length;

  const current = status === "fresh";
  const byRate = up
    .filter((r) => r.ratePct !== null)
    .sort((a, b) => (b.ratePct as number) - (a.ratePct as number) || b.w7.gain - a.w7.gain || byName(a, b));
  const notable = current
    ? { byGain: up.slice(0, 3), byRate: byRate.slice(0, 3), biggestDrop: down[0] ?? null }
    : { byGain: [], byRate: [], biggestDrop: null };

  // 更新・保守の状況（取得時点の状態。出来事ではない）
  const buckets = { within30: 0, within90: 0, within365: 0, over365: 0, unknown: 0 };
  const longQuiet: MaintenanceRow[] = [];
  const recentReleases: Array<{ tool: OwnTool; publishedAt: string }> = [];
  let noReleaseInfo = 0;
  for (const t of active) {
    const pushed = validInstant(t.last_commit, nowMs);
    const ref = checkedDay(t, nowMs) ?? today;
    const days = pushed === null ? null : Math.max(0, daysBetween(jstDay(pushed), ref));
    if (days === null) buckets.unknown++;
    else if (days <= 30) buckets.within30++;
    else if (days <= 90) buckets.within90++;
    else if (days <= 365) buckets.within365++;
    else { buckets.over365++; longQuiet.push({ tool: t, daysSincePush: days }); }

    const rel = validInstant(t.latest_release_at, nowMs);
    if (rel === null) noReleaseInfo++;
    else if (current && daysBetween(jstDay(rel), today) <= RECENT_RELEASE_DAYS) {
      recentReleases.push({ tool: t, publishedAt: new Date(rel).toISOString() });
    }
  }
  longQuiet.sort((a, b) => (b.daysSincePush ?? 0) - (a.daysSincePush ?? 0) || a.tool.name.localeCompare(b.tool.name, "ja"));
  recentReleases.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.tool.name.localeCompare(b.tool.name, "ja"));
  const archived = unique.filter((t) => t.github_archived).sort((a, b) => a.name.localeCompare(b.name, "ja"));

  return {
    asOf: new Date(nowMs).toISOString(),
    dataAsOf: dataMs === null ? null : new Date(dataMs).toISOString(),
    status,
    ageHours: ageHours === null ? null : Math.round(ageHours * 10) / 10,
    total: active.length,
    verified,
    duplicatesRemoved,
    star: { up, down, flat, comparable: rows.length, notComparable },
    notable,
    maintenance: { buckets, longQuiet, archived, recentReleases, noReleaseInfo },
  };
}

/** GitHub のリリースの一覧のページ（タグや日付を確かめる一次情報） */
export function releasesUrl(githubUrl: string): string | null {
  const repo = normalizeRepo(githubUrl);
  return repo ? `https://github.com/${repo}/releases` : null;
}

export function signed(n: number): string {
  return (n > 0 ? "+" : n < 0 ? "−" : "±") + Math.abs(n).toLocaleString("ja-JP");
}
