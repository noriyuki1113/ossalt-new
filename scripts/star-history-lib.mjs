/**
 * スター数の履歴（純粋関数のみ）
 *
 * 履歴は { [toolId]: [[YYYY-MM-DD, stars], ...] } の形。値が変わったときだけ記録する。
 * テストは scripts/star-history-lib.test.mjs。
 */

/** 現在のスター数を履歴に足す（前回と同じ値なら足さない。同じ日付なら上書き） */
export function appendHistory(history, tools, date) {
  for (const t of tools) {
    if (t.stars_num == null) continue;
    const rows = history[t.id] ?? (history[t.id] = []);
    const last = rows[rows.length - 1];
    if (last && last[0] === date) {
      last[1] = t.stars_num;
    } else if (!last || last[1] !== t.stars_num) {
      rows.push([date, t.stars_num]);
    }
  }
  return history;
}

/** 古い記録を落とす（keepDays 日より前の記録は、境目の直前の1件だけ残す） */
export function pruneHistory(history, today, keepDays = 400) {
  const cutoff = shiftDate(today, -keepDays);
  for (const [id, rows] of Object.entries(history)) {
    const idx = rows.findIndex((r) => r[0] >= cutoff);
    if (idx > 1) history[id] = rows.slice(idx - 1);
  }
  return history;
}

export function shiftDate(date, days) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400e3);
}

/**
 * 直近 windowDays 日のスターの増加。
 * 起点は「期間の開始日以前で最後の記録」。無ければ最初の記録（その場合、期間は短くなる）。
 * @returns {{ gain: number, days: number, from: string } | null}
 */
export function starGain(rows, currentStars, today, windowDays = 30) {
  if (!rows || rows.length === 0 || currentStars == null) return null;
  const start = shiftDate(today, -windowDays);
  let base = rows[0];
  for (const r of rows) {
    if (r[0] <= start) base = r;
    else break;
  }
  const days = daysBetween(base[0], today);
  if (days <= 0) return null;
  return { gain: currentStars - base[1], days, from: base[0] };
}
