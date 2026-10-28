#!/usr/bin/env node
/** Build-time pull of public GitHub evidence from OSS Intelligence Watch.
 * Only whitelisted observations for exact OSSALT GitHub repositories are copied.
 * The existing file is left untouched if Render is unreachable; dated UI warns
 * users about stale observations. No secrets, cookies or paid external APIs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { githubRepo } from "./osswatch-bridge.mjs";

export const FEED_URL = "https://oss-intelligence-watch.onrender.com/data/ossalt-signals.json";
const ALLOWED_SIGNALS = new Set(["archived","stable_release_change_observed","star_growth_7d","monitoring"]);
const ALLOWED_RELEASES = new Set(["ok","no_stable_release","not_checked","incomplete"]);
const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

function validDate(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
    && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value);
}
function safeInteger(value) { return Number.isSafeInteger(value) && value >= 0; }
function validDay(value) { return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value); }

export function validateAndReduceFeed(raw, catalog) {
  if (!raw || raw.schema_version !== 1 || !validDate(raw.generated_at)
      || !Array.isArray(raw.observations) || raw.observations.length > 100
      || !Array.isArray(catalog)) throw new Error("Unsupported OSS Watch feed");
  const allowed = new Set(catalog.map(x => githubRepo(x?.github_url)).filter(Boolean));
  const observed = new Set();
  const data = [];
  for (const row of raw.observations) {
    if (!row || typeof row.repo !== "string" || !REPO_RE.test(row.repo))
      throw new Error("Invalid Watch repo identifier");
    const repo = row.repo.toLowerCase();
    if (observed.has(repo)) throw new Error("Duplicate Watch repo observation");
    observed.add(repo);
    if (!allowed.has(repo)) continue;
    if (row.source_url !== "https://api.github.com/repos/" + row.repo
        || !validDate(row.observed_at)
        || !safeInteger(row.stars) || !safeInteger(row.forks)
        || typeof row.archived !== "boolean"
        || !ALLOWED_SIGNALS.has(row.signal)
        || !ALLOWED_RELEASES.has(row.release_status)
        || !safeInteger(row.observation_count)
        || row.observation_count < 1
        || (row.stars_delta_7d !== null && (!Number.isSafeInteger(row.stars_delta_7d)))
        || (row.baseline_date_7d !== null && !validDay(row.baseline_date_7d))
        || typeof row.stable_release_changed_since_previous_snapshot !== "boolean"
        || (row.release_status === "ok" &&
          (typeof row.latest_stable_release_tag !== "string" || row.latest_stable_release_tag.length > 255))
        || (row.release_status !== "ok" && row.latest_stable_release_tag !== null)) {
      throw new Error("Untrusted Watch observation for " + repo);
    }
    if (Date.parse(row.observed_at) > Date.parse(raw.generated_at) + 300_000
      || (row.stars_delta_7d === null) !== (row.baseline_date_7d === null)
      || (row.signal === "stable_release_change_observed" && !row.stable_release_changed_since_previous_snapshot)
      || (row.signal === "star_growth_7d" && (row.stars_delta_7d ?? -Infinity) < 10)
      || (row.signal === "archived" && !row.archived)) {
      throw new Error("Inconsistent Watch observation for " + repo);
    }
    data.push({
      repo, observed_at: row.observed_at, source_url: row.source_url,
      stars: row.stars, forks: row.forks, archived: row.archived,
      stars_delta_7d: row.stars_delta_7d,
      baseline_date_7d: row.baseline_date_7d,
      release_status: row.release_status,
      latest_stable_release_tag: row.latest_stable_release_tag,
      stable_release_changed_since_previous_snapshot: row.stable_release_changed_since_previous_snapshot,
      signal: row.signal, observation_count: row.observation_count,
    });
  }
  data.sort((a,b)=>a.repo.localeCompare(b.repo,"en"));
  return {
    schema_version: 1,
    source: "OSS Intelligence Watch — GitHub public observations",
    generated_at: raw.generated_at,
    observations: data,
    note: "Not a security, popularity, adoption or performance rating. Missing baselines remain unknown.",
  };
}

/**
 * 取り込みは成功しても、配信元の観測が進んでいないことがある（生成日時が前回と同じ、または古いまま）。
 * 黙って古いデータを出し続けないよう、止まっていれば警告を返す。
 */
export function feedStall({previousGeneratedAt, generatedAt, now = Date.now(), hours = 36}) {
  if (!validDate(generatedAt)) return null;
  const ageH = (now - Date.parse(generatedAt)) / 3600000;
  if (ageH <= hours) return null;
  const same = validDate(previousGeneratedAt) && Date.parse(previousGeneratedAt) === Date.parse(generatedAt);
  return `配信元（OSS Intelligence Watch）の観測が ${Math.floor(ageH)} 時間更新されていません（生成: ${generatedAt}${same ? "・前回の取り込みと同じ" : ""}）。配信元の定期実行を確認してください。`;
}

/** 取り込み状態の記録先。/changes/ が「最終試行」「最終成功」「失敗理由」を表示するために読む */
export const STATUS_PATH = "public/data/osswatch-status.json";

/** 失敗の種類。表示とリトライの判断に使う。raw の例外メッセージは公開ファイルに出さない */
export const ERROR_KINDS = {
  network: "配信元に接続できませんでした",
  timeout: "配信元の応答が時間内にありませんでした",
  server: "配信元がサーバーエラーを返しました",
  rate_limit: "配信元の利用制限に達しました",
  auth: "配信元にアクセスを拒否されました（認証・権限）",
  http: "配信元が想定外の応答を返しました",
  invalid_feed: "配信データの形式・内容の検証に失敗しました",
  no_match: "OSSALT掲載ツールに一致する観測がありませんでした",
  older_feed: "配信データが取り込み済みのものより古いため採用しませんでした",
  unknown: "原因を特定できない失敗です",
};
const RETRYABLE = new Set(["network", "timeout", "server", "rate_limit"]);

class FeedError extends Error {
  constructor(kind, message, httpStatus = null) {
    super(message);
    this.kind = kind;
    this.httpStatus = httpStatus;
  }
}

export function classifyFeedError(err) {
  if (err instanceof FeedError) return err.kind;
  if (err?.name === "TimeoutError" || err?.name === "AbortError") return "timeout";
  if (err instanceof TypeError) return "network"; // fetch() のネットワーク失敗は TypeError
  if (err instanceof SyntaxError) return "invalid_feed"; // JSON として読めない
  if (/Unsupported|Invalid|Untrusted|Inconsistent|Duplicate/.test(err?.message ?? "")) return "invalid_feed";
  return "unknown";
}

function httpKind(status) {
  if (status === 429) return "rate_limit";
  if (status === 401 || status === 403) return "auth";
  if (status >= 500) return "server";
  return "http";
}

/**
 * 一時的な失敗（接続・タイムアウト・5xx・429）だけ待って再試行する。
 * Render の無料枠は休止からの起動に時間がかかるため、試行ごとにタイムアウトを延ばす。
 */
export async function fetchFeedWithRetry(url, {fetcher = fetch, timeouts = [15000, 30000, 45000],
                                                sleep = ms => new Promise(r => setTimeout(r, ms)),
                                                backoffMs = 5000} = {}) {
  let lastErr;
  for (let i = 0; i < timeouts.length; i++) {
    try {
      const response = await fetcher(url, {signal: AbortSignal.timeout(timeouts[i])});
      if (!response.ok) {
        throw new FeedError(httpKind(response.status), "Public Watch endpoint returned HTTP " + response.status, response.status);
      }
      return {raw: await response.json(), attempts: i + 1};
    } catch (err) {
      lastErr = err;
      lastErr.attempts = i + 1;
      if (!RETRYABLE.has(classifyFeedError(err)) || i === timeouts.length - 1) break;
      await sleep(backoffMs * (i + 1));
    }
  }
  throw lastErr;
}

/**
 * 前回の状態と今回の結果から、新しい状態を作る（純粋関数）。
 * last_success_at は実際に取り込めたときだけ更新し、推測で埋めない。
 */
export function nextStatus(prev, {now, ok, feedGeneratedAt = null, error = null, attempts = 1}) {
  const p = prev && prev.schema_version === 1 ? prev : null;
  const nowIso = new Date(now).toISOString();
  if (ok) {
    return {
      schema_version: 1,
      last_attempt_at: nowIso,
      last_success_at: nowIso,
      last_result: "ok",
      attempts,
      consecutive_failures: 0,
      feed_generated_at: feedGeneratedAt,
      error: null,
    };
  }
  const kind = classifyFeedError(error);
  return {
    schema_version: 1,
    last_attempt_at: nowIso,
    last_success_at: p?.last_success_at ?? null,
    last_result: "error",
    attempts,
    consecutive_failures: (p?.consecutive_failures ?? 0) + 1,
    // 表示中のデータの生成日時（前回取り込んだもの）。今回の失敗とは別の事実として残す
    feed_generated_at: feedGeneratedAt ?? p?.feed_generated_at ?? null,
    error: {kind, label: ERROR_KINDS[kind], http_status: error?.httpStatus ?? null},
  };
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}

function writeJsonAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), {recursive:true});
  const temp = file + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(data, null, 2) + "\n", "utf8");
  fs.renameSync(temp, file);
}

export async function syncSignals({url=FEED_URL, catalogPath="data-source/tools.json",
                                  outPath="public/data/osswatch-signals.json", fetcher=fetch,
                                  retry={}}={}) {
  // This is for the dedicated public source only. It must not turn into an
  // arbitrary URL fetch tool (SSRF / forged provenance).
  if (url !== FEED_URL) throw new Error("Unexpected data source");
  const catalog = JSON.parse(fs.readFileSync(catalogPath,"utf8"));
  const {raw, attempts} = await fetchFeedWithRetry(url, {fetcher, ...retry});
  const reduced = validateAndReduceFeed(raw, catalog);
  if (!reduced.observations.length) throw new FeedError("no_match", "No matching OSSALT observations");
  const old = readJson(outPath);
  if (old && validDate(old.generated_at) && Date.parse(old.generated_at) > Date.parse(reduced.generated_at)) {
    throw new FeedError("older_feed", "Feed is older than the existing observation artifact");
  }
  // generated_at は配信元が出力した時刻で、収集が止まっていても新しくなる。観測日時の最新値も見て、古いほうで判定する
  const latestObserved = reduced.observations.map(o => o.observed_at).filter(validDate).sort().pop() ?? null;
  const freshest = latestObserved && Date.parse(latestObserved) < Date.parse(reduced.generated_at)
    ? latestObserved : reduced.generated_at;
  const stall = feedStall({previousGeneratedAt: old?.generated_at ?? null, generatedAt: freshest});
  if (stall) {
    console.warn("::warning title=OSS Watch の更新停止::" + stall);
    summary("## ⚠ OSS Watch の更新停止\n" + stall + "\n");
  }
  writeJsonAtomic(outPath, reduced);
  return Object.assign(reduced, {attempts});
}

function summary(text) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text); } catch {}
}

/**
 * 取り込みを1回実行し、成否にかかわらず状態ファイルを書く。
 * 取り込みは best effort のまま（失敗してもサイト更新は止めない）。
 */
export async function runSync({statusPath = STATUS_PATH, outPath = "public/data/osswatch-signals.json",
                               now = Date.now(), ...opts} = {}) {
  const prev = readJson(statusPath);
  let status;
  try {
    const data = await syncSignals({outPath, ...opts});
    status = nextStatus(prev, {now, ok: true, feedGeneratedAt: data.generated_at, attempts: data.attempts});
    console.log("OSSALT Watch: imported " + data.observations.length + " verified observations");
  } catch (err) {
    const shown = readJson(outPath);
    status = nextStatus(prev, {now, ok: false, error: err, attempts: err?.attempts ?? 1,
                               feedGeneratedAt: validDate(shown?.generated_at) ? shown.generated_at : null});
    // Best-effort: preserve the previous version; do not break site refresh.
    console.warn("::warning title=OSS Watch の取り込み失敗::" + status.error.label
      + "（" + (err?.message ?? "") + "）。連続" + status.consecutive_failures + "回目");
    summary("## ⚠ OSS Watch の取り込み失敗\n" + status.error.label + "（連続" + status.consecutive_failures + "回目）\n");
  }
  writeJsonAtomic(statusPath, status);
  return status;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runSync().catch(err => console.warn("OSSALT Watch: status not recorded — " + err.message));
}
