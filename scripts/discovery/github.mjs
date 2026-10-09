/**
 * GitHub REST API の小さなクライアント（Cloudflare OSS Discovery 用）
 *
 * - 条件付きリクエスト：前回の ETag を If-None-Match で送り、304 なら前回の本文を使う
 *   （304 は GitHub のレート制限に数えられない）。ETag の控えは呼び出し側がファイルに保存する。
 * - レート制限：x-ratelimit-remaining が下限を切ったら、それ以上は呼ばずに「予算切れ」として止める。
 *   403/429 で制限に当たった場合も止める（待ち続けない。次回の定期実行で続きから）。
 * - 再試行：ネットワークの失敗と 5xx は、間隔を倍にしながら最大 retries 回。
 * - ページ送り：Link ヘッダーの rel="next" をたどる（最大 maxPages ページ）。
 * - 上限：1回の実行で送るリクエストの数（maxRequests）。
 *
 * fetch とタイマーは差し替えられる（テストで使う）。トークンはサーバー側（GitHub Actions）でだけ使い、
 * 出力のファイルやログに書かない。
 */

export class BudgetExceeded extends Error {
  constructor(reason) {
    super(`GitHub API の予算切れ: ${reason}`);
    this.reason = reason;
  }
}

export function createGitHubClient({
  token = "",
  fetchImpl = globalThis.fetch,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  etagCache = {},
  maxRequests = 300,
  minRemaining = 50,
  retries = 3,
  baseDelayMs = 1000,
} = {}) {
  const stats = { requests: 0, notModified: 0, retried: 0, errors: 0, remaining: null };

  async function request(url) {
    if (stats.requests >= maxRequests) throw new BudgetExceeded(`maxRequests=${maxRequests}`);
    if (stats.remaining != null && stats.remaining < minRemaining) {
      throw new BudgetExceeded(`残り ${stats.remaining} 回（下限 ${minRemaining}）`);
    }
    const headers = {
      Accept: "application/vnd.github+json",
      "User-Agent": "ossalt-cloudflare-discovery",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const cached = etagCache[url];
    if (cached?.etag) headers["If-None-Match"] = cached.etag;

    for (let attempt = 0; ; attempt++) {
      stats.requests++;
      let res;
      try {
        res = await fetchImpl(url, { headers });
      } catch (e) {
        if (attempt < retries) {
          stats.retried++;
          await sleep(baseDelayMs * 2 ** attempt);
          continue;
        }
        stats.errors++;
        return { ok: false, status: 0, error: String(e?.message ?? e) };
      }
      const rem = res.headers.get("x-ratelimit-remaining");
      if (rem != null) stats.remaining = Number(rem);

      if (res.status === 304 && cached) {
        stats.notModified++;
        return { ok: true, status: 304, data: cached.data, link: cached.link ?? null };
      }
      if ((res.status === 403 || res.status === 429) && (rem === "0" || res.headers.get("retry-after"))) {
        throw new BudgetExceeded(`レート制限（${res.status}）`);
      }
      if (res.status >= 500 && attempt < retries) {
        stats.retried++;
        await sleep(baseDelayMs * 2 ** attempt);
        continue;
      }
      if (!res.ok) {
        stats.errors++;
        return { ok: false, status: res.status };
      }
      const data = await res.json();
      const etag = res.headers.get("etag");
      const link = res.headers.get("link");
      if (etag) etagCache[url] = { etag, data, link };
      return { ok: true, status: res.status, data, link };
    }
  }

  /** Link ヘッダーをたどって配列を集める */
  async function paginate(url, maxPages = 5) {
    const items = [];
    let next = url;
    for (let p = 0; next && p < maxPages; p++) {
      const r = await request(next);
      if (!r.ok) return { ok: false, status: r.status, items };
      if (Array.isArray(r.data)) items.push(...r.data);
      next = nextLink(r.link);
    }
    return { ok: true, items };
  }

  return { request, paginate, stats, etagCache };
}

export function nextLink(link) {
  if (!link) return null;
  for (const part of link.split(",")) {
    const m = part.match(/<([^>]+)>\s*;\s*rel="next"/);
    if (m) return m[1];
  }
  return null;
}

/**
 * 1つのリポジトリの情報を取る（GET /repos/{owner}/{repo} と、最新のリリース）。
 * 名前の変更・移転は、返ってきた full_name で分かる（GitHub は旧名でも新しいリポジトリを返す）。
 */
export async function fetchRepoFacts(client, repo) {
  const r = await client.request(`https://api.github.com/repos/${repo}`);
  if (!r.ok) return { ok: false, status: r.status };
  const d = r.data;
  const facts = {
    id: d.id ?? null,
    full_name: (d.full_name ?? "").toLowerCase() || null,
    description: d.description ?? null,
    homepage: d.homepage || null,
    license_spdx: d.license?.spdx_id && d.license.spdx_id !== "NOASSERTION" ? d.license.spdx_id : null,
    license_raw: d.license?.spdx_id ?? null,
    stars: d.stargazers_count ?? null,
    forks: d.forks_count ?? null,
    pushed_at: d.pushed_at ?? null,
    archived: typeof d.archived === "boolean" ? d.archived : null,
    default_branch: d.default_branch ?? null,
    language: d.language ?? null,
    topics: Array.isArray(d.topics) ? d.topics : [],
    latest_release_at: null,
    latest_release_tag: null,
  };
  const rel = await client.request(`https://api.github.com/repos/${repo}/releases/latest`);
  if (rel.ok) {
    facts.latest_release_at = rel.data.published_at ?? null;
    facts.latest_release_tag = rel.data.tag_name ?? null;
  }
  return { ok: true, facts };
}
