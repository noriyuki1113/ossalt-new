/**
 * セルフホストの必要スペックの目安（純粋関数のみ）。データは data-source/requirements.json。
 *
 * 公式の資料に書かれている数値だけを、出典のURLと確認日つきで載せる。
 * 公式に数値がないツールは載せない（推測で埋めない。「未確認」は「要件なし」ではない）。
 * VPSの紹介枠で「どのプランを選ぶか」の判断材料に使う（Revenue Strategy 2.0 Phase 2：OSS別のVPS選定情報）。
 */

export type Spec = { ram_gb?: number; cpu_cores?: number; disk_gb?: number };

export type Requirement = {
  minimum?: Spec;
  recommended?: Spec;
  note?: string;
  source_title: string;
  source_url: string;
  checked_on: string;
};

export function validateRequirement(id: string, r: Requirement): string[] {
  const errs: string[] = [];
  const at = `要件 ${id}`;
  if (!r.minimum && !r.recommended) errs.push(`${at}: minimum か recommended が必要`);
  for (const [label, s] of [["minimum", r.minimum], ["recommended", r.recommended]] as const) {
    if (!s) continue;
    if (s.ram_gb === undefined && s.cpu_cores === undefined && s.disk_gb === undefined) errs.push(`${at}: ${label} が空`);
    for (const v of [s.ram_gb, s.cpu_cores, s.disk_gb]) {
      if (v !== undefined && !(typeof v === "number" && v > 0 && v < 1024)) errs.push(`${at}: ${label} の数値が不正`);
    }
  }
  if (!r.source_title) errs.push(`${at}: source_title が空`);
  try {
    if (new URL(r.source_url).protocol !== "https:") errs.push(`${at}: source_url は https`);
  } catch {
    errs.push(`${at}: source_url が不正`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.checked_on ?? "")) errs.push(`${at}: checked_on は YYYY-MM-DD`);
  return errs;
}

function ram(gb: number): string {
  return gb < 1 ? `${Math.round(gb * 1024)}MB` : `${gb}GB`;
}

/** 「メモリ4GB・CPU2コア・ディスク40GB」の形 */
export function formatSpec(s: Spec): string {
  const parts: string[] = [];
  if (s.ram_gb !== undefined) parts.push(`メモリ${ram(s.ram_gb)}`);
  if (s.cpu_cores !== undefined) parts.push(`CPU${s.cpu_cores}コア`);
  if (s.disk_gb !== undefined) parts.push(`ディスク${s.disk_gb}GB`);
  return parts.join("・");
}

/** 「2026-10-09」→「2026年10月9日」 */
export function formatCheckedOn(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return `${y}年${m}月${day}日`;
}
