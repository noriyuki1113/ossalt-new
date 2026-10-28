/**
 * 詳細ページの先頭に出す「30秒で分かる要約」（編集部が解説の本文をもとにまとめる）。
 * 本文に無いことは書かない。向いている人だけでなく、向いていない人・先に確認することも必ず示す。
 */
export type Glance = { what: string; good_for: string[]; not_for: string[]; check: string[] };

type Raw = { what?: unknown; good_for?: unknown; not_for?: unknown; check?: unknown } | null | undefined;

const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : []);

/** 要素がそろっているときだけ要約として扱う（向いていない人が無いものは出さない） */
export function parseGlance(raw: Raw): Glance | null {
  if (!raw || typeof raw !== "object") return null;
  const g = { what: typeof raw.what === "string" ? raw.what.trim() : "", good_for: strs(raw.good_for), not_for: strs(raw.not_for), check: strs(raw.check) };
  return g.what && g.good_for.length > 0 && g.not_for.length > 0 ? g : null;
}

export function validateGlance(raw: Raw): string[] {
  if (raw == null) return [];
  if (typeof raw !== "object") return ["at_a_glance がオブジェクトでない"];
  const p: string[] = [];
  if (!(typeof raw.what === "string" && raw.what.trim())) p.push("what が無い");
  else if (raw.what.length > 120) p.push("what は120字以内にする");
  if (strs(raw.good_for).length === 0) p.push("good_for（向いている人）が無い");
  if (strs(raw.not_for).length === 0) p.push("not_for（向いていない人）が無い。長所だけにしない");
  for (const k of ["good_for", "not_for", "check"] as const) if (strs(raw[k]).length > 4) p.push(`${k} は4件までにする`);
  return p;
}
