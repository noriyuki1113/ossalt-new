/**
 * OpenAlternative 候補の確認キューを更新する本体（ネットワークと保存先は引数で差し替えられる。テストで使う）。
 * 設計：docs/discovery/OPENALT_QUEUE.md
 *
 * 守ること：
 *  - tools.json には書かない（掲載は人が「ツール追加」で行う）
 *  - 外部の一覧の記載（ライセンス・スター・説明・代替先）は claimed のまま。公式リポジトリ（GitHub API）で確かめた値だけ api
 *  - 既存の掲載との重複は、名前（id・表示名）だけでなく、公式リポジトリ（owner/repo・旧名・GitHub のリポジトリID）で確かめる
 *  - 1回の実行で処理する新規の候補数（maxNew）と GitHub API のリクエスト数に上限がある。残りは次回の続きで処理する
 */
import { BudgetExceeded, fetchRepoFacts } from "./github.mjs";
import {
  carryOverFetchedAt, indexTools, matchExisting, normalizeRepo, stableStringify,
} from "./lib.mjs";
import {
  OPENALT_BLOCKING, OPENALT_SOURCE_NAME, buildOpenAltCandidate, cleanCompetitor, draftProblems, extractPageFacts,
  openAltIssues, parseOpenAltReadme, REVIEW_STATES,
} from "./openalt.mjs";

export const decisionKey = (c) => c.repo ?? `openalt:${c.slug}`;

export function reviewOf(c, decision, { categories, takenIds }) {
  const blocking = c.quality.issues.filter((i) => OPENALT_BLOCKING.has(i));
  const state = REVIEW_STATES.includes(decision?.state) ? decision.state : blocking.length ? "blocked" : "needs_review";
  const problems = state === "approved" ? draftProblems({ ...decision, id: decision?.id }, { categories, takenIds }) : [];
  // 承認済みでも、ライセンス・アーカイブ・リポジトリの確認に問題が残っていれば「ツール追加」には出さない
  const ready = state === "approved" && blocking.length === 0 && problems.length === 0;
  return { state, ready, blocking, draft_problems: problems, note: decision?.note ?? null };
}

/**
 * @param deps { now, readme, getPage(url)→{ok,text}, client, useGithub, tools, excludedIds, decisions, categories,
 *               prevQueue, maxNew, refreshDays, sleep }
 */
export async function runOpenAltDiscovery(deps) {
  const {
    now, readme, getPage, client, useGithub = true, tools, excludedIds = new Set(), decisions = {},
    categories = new Set(), prevQueue = { candidates: [], skipped: {} }, maxNew = 100, refreshDays = 7,
    sleep = async () => {},
  } = deps;
  const entries = parseOpenAltReadme(readme);
  const toolIdx = indexTools(tools);
  const toolById = new Map(tools.map((t) => [t.id, t]));
  const existingIds = new Set(tools.map((t) => t.id));
  const existingNames = new Set(tools.map((t) => String(t.name ?? "").toLowerCase()));
  const repoIdIndex = new Map(); // 掲載データにリポジトリIDが入っていれば、ここで使う
  for (const t of tools) if (t.github_repo_id != null) repoIdIndex.set(t.github_repo_id, t.id);

  // 前回までに保存された代替先に、テンプレートの取り残し（{name} など）があれば取り除く（取得日時はそのまま）
  const sanitize = (c) => {
    const f = c.fields?.replaces_claimed;
    if (f && f.value != null && cleanCompetitor(f.value) == null) return { ...c, fields: { ...c.fields, replaces_claimed: { ...f, value: null, status: "unknown", source: null } } };
    return c;
  };
  const prevQ = { ...prevQueue, candidates: prevQueue.candidates.map(sanitize) };
  const prevBySlug = new Map(prevQ.candidates.map((c) => [c.slug, c]));
  const skipped = {};
  for (const [slug, s] of Object.entries(prevQ.skipped ?? {})) skipped[slug] = s;
  // 同じ理由で外したものは、最初に外した日時を保つ（再実行しても出力が変わらないようにする）
  const setSkipped = (slug, v) => {
    const old = prevQ.skipped?.[slug];
    skipped[slug] = old && old.reason === v.reason && old.repo === v.repo && old.tool_id === v.tool_id ? old : v;
  };
  const errors = [];
  let budgetNote = null;
  let newlyResolved = 0;

  // 1) 名前だけで分かる重複・除外（ネットワーク不要。毎回計算し直す）
  const todo = [];
  for (const e of entries) {
    if (prevBySlug.has(e.slug)) continue;
    if (excludedIds.has(e.slug)) { setSkipped(e.slug, { reason: "excluded_in_overrides", at: now }); continue; }
    if (existingIds.has(e.slug) || existingNames.has(e.name.toLowerCase())) { setSkipped(e.slug, { reason: "listed_by_name", at: now }); continue; }
    if (skipped[e.slug] && !["excluded_in_overrides", "listed_by_name"].includes(skipped[e.slug].reason)) continue; // 公式リポジトリで判定済み
    delete skipped[e.slug]; // 名前の一致が解消された（掲載が外れた）ものは、もう一度調べる
    todo.push(e);
  }
  // 掲載が外れて名前の一致が無くなったものを拾い直したうえで、READMEから消えた項目は skipped からも落とす
  const slugsNow = new Set(entries.map((e) => e.slug));
  for (const slug of Object.keys(skipped)) if (!slugsNow.has(slug)) delete skipped[slug];

  async function verifyRepo(repo) {
    if (!useGithub || !repo) return null;
    const r = await fetchRepoFacts(client, repo);
    return r.ok ? r.facts : { not_found: r.status === 404 };
  }

  // 2) 新規の候補：ページ → 公式リポジトリ → GitHub API → 既存との照合
  const fresh = [];
  for (const e of todo.slice(0, maxNew)) {
    const pageRes = await getPage(e.sourceUrl);
    const page = pageRes.ok ? extractPageFacts(pageRes.text) : null;
    if (!pageRes.ok) errors.push(`${e.slug}: ページ取得失敗`);
    const dec = decisions[page?.repo ?? ""] ?? decisions[`openalt:${e.slug}`] ?? null;
    const repoGuess = normalizeRepo(dec?.repo) ?? page?.repo ?? null; // 運営者が公式リポジトリを指定したときはそれを優先
    let gh = null;
    try {
      gh = await verifyRepo(repoGuess);
    } catch (err) {
      if (err instanceof BudgetExceeded) { budgetNote = err.message; break; }
      throw err;
    }
    if (gh?.not_found) { setSkipped(e.slug, { reason: "repo_not_found", repo: repoGuess, at: now }); newlyResolved++; continue; }
    const canonical = gh?.full_name ?? repoGuess;
    const match = canonical
      ? matchExisting({ repo: canonical, aliases: repoGuess && repoGuess !== canonical ? [repoGuess] : [] }, toolIdx, repoIdIndex, gh?.id ?? null)
      : null;
    if (match) { setSkipped(e.slug, { reason: "listed_by_repo", repo: canonical, tool_id: match.tool_id, by: match.by, at: now }); newlyResolved++; continue; }
    const pageForBuild = dec?.repo && page ? { ...page, repo: repoGuess, confidence: "single" } : page;
    fresh.push(buildOpenAltCandidate({ entry: e, page: pageForBuild, gh: gh && !gh.not_found ? gh : null, now }));
    newlyResolved++;
    await sleep(400); // 第三者のサイトへは間隔をあける
  }

  // 3) 既存の候補の更新（公式リポジトリの最新の状態。ETag の 304 は上限に数えられにくい）
  const refreshed = [];
  const staleBefore = Date.parse(now) - refreshDays * 86400e3;
  const prevSorted = [...prevQ.candidates].sort((a, b) => (a.fields.stars?.fetched_at ?? "").localeCompare(b.fields.stars?.fetched_at ?? ""));
  for (const prev of prevSorted) {
    const entry = entries.find((x) => x.slug === prev.slug);
    if (!entry) { refreshed.push({ ...prev, removed_from_list: true }); continue; } // 元の一覧から消えた。履歴として残す
    const last = Date.parse(prev.fields.stars?.fetched_at ?? prev.fields.canonical_repo?.fetched_at ?? 0) || 0;
    const dec = decisions[prev.repo ?? ""] ?? decisions[`openalt:${prev.slug}`] ?? null;
    const repoNow = normalizeRepo(dec?.repo) ?? prev.repo;
    const needs = useGithub && repoNow && (last < staleBefore || repoNow !== prev.repo);
    if (!needs) { refreshed.push(prev); continue; }
    try {
      const gh = await verifyRepo(repoNow);
      if (gh && !gh.not_found) {
        const pg = { repo: repoNow, confidence: dec?.repo ? "single" : prev.fields.repo_resolution?.value?.confidence ?? "none", candidates: prev.fields.repo_resolution?.value?.candidates ?? [], competitor: cleanCompetitor(prev.fields.replaces_claimed?.value) };
        refreshed.push(carryOverFetchedAt(buildOpenAltCandidate({ entry, page: pg, gh, now, firstSeen: prev.first_seen }), prev));
        continue;
      }
    } catch (err) {
      if (err instanceof BudgetExceeded) { budgetNote = budgetNote ?? err.message; } else throw err;
    }
    refreshed.push(prev);
  }

  // 4) 出力用に整える（重複排除：同じ公式リポジトリの候補は1件にする）
  const takenIds = existingIds;
  const byRepo = new Map();
  const all = [...refreshed, ...fresh];
  const final = [];
  for (const c0 of all) {
    const prev = prevBySlug.get(c0.slug);
    const c1 = carryOverFetchedAt(c0, prev);
    const issues = openAltIssues(c1, now);
    const base = { ...c1, quality: { issues, blocking: issues.filter((i) => OPENALT_BLOCKING.has(i)) } };
    if (base.repo) {
      const dup = byRepo.get(base.repo);
      if (dup) {
        // 同じリポジトリが別の名前で載っている。1件にまとめ、処理済みとして記録する（記録しないと、毎回ページと API を取り直し、also_listed_as が増え続ける）
        dup.also_listed_as = [...new Set([...(dup.also_listed_as ?? []), base.slug, ...(base.also_listed_as ?? [])])].filter((s) => s !== dup.slug).sort();
        setSkipped(base.slug, { reason: "same_repo_as_queue_entry", repo: base.repo, merged_into: dup.slug, at: now });
        continue;
      }
      byRepo.set(base.repo, base);
    }
    final.push(base);
  }
  const candidates = final.map((c) => {
    const decision = decisions[decisionKey(c)] ?? decisions[`openalt:${c.slug}`] ?? null;
    const match = c.repo ? matchExisting({ repo: c.repo, aliases: [] }, toolIdx, repoIdIndex, c.fields.github_repo_id?.value ?? null) : null;
    const tool = match ? toolById.get(match.tool_id) : null;
    const review = tool ? { state: "listed", ready: false, blocking: [], draft_problems: [], note: `掲載済み（${tool.id}）` } : reviewOf(c, decision, { categories, takenIds });
    return { ...c, matched_tool_id: tool?.id ?? null, review };
  }).sort((a, b) => a.slug.localeCompare(b.slug));

  const count = (p) => candidates.filter(p).length;
  const summary = {
    readme_entries: entries.length,
    queue: candidates.length,
    needs_review: count((c) => c.review.state === "needs_review"),
    blocked: count((c) => c.review.state === "blocked"),
    approved: count((c) => c.review.state === "approved"),
    ready: count((c) => c.review.ready),
    rejected: count((c) => c.review.state === "rejected"),
    hold: count((c) => c.review.state === "hold"),
    skipped: Object.keys(skipped).length,
    skipped_by_reason: Object.entries(skipped).reduce((a, [, s]) => ((a[s.reason] = (a[s.reason] ?? 0) + 1), a), {}),
    unprocessed: Math.max(0, todo.length - newlyResolved),
    processed_this_run: newlyResolved,
  };
  return {
    queue: { source: { name: OPENALT_SOURCE_NAME, note: "一覧の記載は claimed（第三者の記載）。公開前に公式リポジトリで確認する" }, candidates, skipped },
    summary, errors, budgetNote,
  };
}

export { stableStringify };
