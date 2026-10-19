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

export async function syncSignals({url=FEED_URL, catalogPath="data-source/tools.json",
                                  outPath="public/data/osswatch-signals.json", fetcher=fetch}={}) {
  // This is for the dedicated public source only. It must not turn into an
  // arbitrary URL fetch tool (SSRF / forged provenance).
  if (url !== FEED_URL) throw new Error("Unexpected data source");
  const catalog = JSON.parse(fs.readFileSync(catalogPath,"utf8"));
  const response = await fetcher(url, {signal: AbortSignal.timeout(12000)});
  if (!response.ok) throw new Error("Public Watch endpoint returned HTTP " + response.status);
  const reduced = validateAndReduceFeed(await response.json(), catalog);
  if (!reduced.observations.length) throw new Error("No matching OSSALT observations");
  if (fs.existsSync(outPath)) {
    try {
      const old = JSON.parse(fs.readFileSync(outPath,"utf8"));
      if (validDate(old.generated_at) && Date.parse(old.generated_at) > Date.parse(reduced.generated_at)) {
        throw new Error("Feed is older than the existing observation artifact");
      }
    } catch (err) {
      if (err.message?.includes("older")) throw err;
    }
  }
  let previousGeneratedAt = null;
  try { previousGeneratedAt = JSON.parse(fs.readFileSync(outPath,"utf8")).generated_at; } catch {}
  const stall = feedStall({previousGeneratedAt, generatedAt: reduced.generated_at});
  if (stall) {
    console.warn("::warning title=OSS Watch の更新停止::" + stall);
    if (process.env.GITHUB_STEP_SUMMARY) {
      try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, "## ⚠ OSS Watch の更新停止\n" + stall + "\n"); } catch {}
    }
  }
  fs.mkdirSync(path.dirname(outPath), {recursive:true});
  const temp = outPath + ".tmp";
  fs.writeFileSync(temp,JSON.stringify(reduced,null,2)+"\n","utf8");
  fs.renameSync(temp,outPath);
  return reduced;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  syncSignals()
    .then(data=>console.log("OSSALT Watch: imported "+data.observations.length+" verified observations"))
    .catch(err=>{
      // Best-effort: preserve the previous version; do not break site refresh.
      console.warn("OSSALT Watch: skipped refresh — "+err.message);
    });
}
