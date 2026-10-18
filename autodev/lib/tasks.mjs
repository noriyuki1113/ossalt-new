/**
 * タスク管理（claude-quickstarts/autonomous-coding の feature_list.json に相当）。
 * 新規アプリ用の「200個の機能」ではなく、既存の ossalt-new への改善タスクを持つ。
 * すべて純粋関数（ファイルの読み書きは run.mjs 側）。
 */

export const STATUSES = ["todo", "in_progress", "passed", "failed", "blocked"];

/** @returns {string[]} 問題の一覧（空なら正常） */
export function validateTasks(doc) {
  const errs = [];
  if (!doc || typeof doc !== "object" || !Array.isArray(doc.tasks)) return ["tasks 配列がありません"];
  const ids = new Set();
  for (const [i, t] of doc.tasks.entries()) {
    const where = `tasks[${i}]${t?.id ? `(${t.id})` : ""}`;
    if (!t || typeof t !== "object") { errs.push(`${where}: オブジェクトではありません`); continue; }
    if (!/^AD-\d{3,}$/.test(t.id ?? "")) errs.push(`${where}: id は AD-001 の形式`);
    if (ids.has(t.id)) errs.push(`${where}: id が重複`);
    ids.add(t.id);
    if (!Number.isInteger(t.priority) || t.priority < 1 || t.priority > 5) errs.push(`${where}: priority は 1〜5 の整数（1が最優先）`);
    if (typeof t.feature !== "string" || !t.feature.trim()) errs.push(`${where}: feature（対象機能）が空`);
    if (typeof t.title !== "string" || !t.title.trim()) errs.push(`${where}: title が空`);
    if (!Array.isArray(t.acceptance) || t.acceptance.length === 0 || t.acceptance.some((a) => typeof a !== "string" || !a.trim())) errs.push(`${where}: acceptance（受け入れ条件）は1つ以上の文字列`);
    if (!Array.isArray(t.verification) || t.verification.length === 0) errs.push(`${where}: verification（検証方法）が空`);
    else for (const v of t.verification) {
      if (!["unit", "build", "e2e", "sweep"].includes(v?.kind)) errs.push(`${where}: verification.kind は unit/build/e2e/sweep`);
      if (v?.kind === "e2e" && v.grep != null && typeof v.grep !== "string") errs.push(`${where}: e2e の grep は文字列`);
    }
    if (!STATUSES.includes(t.status)) errs.push(`${where}: status は ${STATUSES.join("/")}`);
    if (!Number.isInteger(t.attempts) || t.attempts < 0) errs.push(`${where}: attempts は 0 以上の整数`);
    if (t.status === "passed" && !t.lastResult?.evidence) errs.push(`${where}: passed には lastResult.evidence（証拠）が必要`);
  }
  return errs;
}

/** 次に着手するタスク。in_progress（中断からの再開）を最優先し、次に priority の小さい順・id順の todo/failed。 */
export function selectNextTask(doc, { maxAttempts }) {
  const open = doc.tasks.filter((t) => ["in_progress", "todo", "failed"].includes(t.status) && t.attempts < maxAttempts);
  const rank = (t) => (t.status === "in_progress" ? 0 : 1);
  open.sort((a, b) => rank(a) - rank(b) || a.priority - b.priority || a.id.localeCompare(b.id));
  return open[0] ?? null;
}

export function updateTask(doc, id, patch) {
  return { ...doc, tasks: doc.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) };
}

export function summarize(doc) {
  const by = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const t of doc.tasks) by[t.status]++;
  return by;
}
