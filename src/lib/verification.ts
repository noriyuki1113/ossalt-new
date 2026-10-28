/**
 * 解説の「検証状態」。記録が無いものは「未検証」と扱い、確認したように見せない。
 *   official … 公式資料（ドキュメント・README・公式サイト）と照合した。照合日と出典URLが必要
 *   hands-on … 実際に動かして確認した。照合日・出典・何をどう確認したか（note）が必要
 *   recheck  … 以前に確認したが、再確認が必要
 *   unverified … 記録なし（既定）
 * 純粋関数のみ（node:test から直接読み込める）。
 */
export type VerificationStatus = "official" | "hands-on" | "recheck" | "unverified";

export type Verification = {
  status: VerificationStatus;
  checked_at?: string;
  sources: string[];
  note?: string;
};

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  official: "公式資料確認済み",
  "hands-on": "実機検証済み",
  recheck: "要再確認",
  unverified: "未検証",
};

export const VERIFICATION_DESCRIPTIONS: Record<VerificationStatus, string> = {
  official: "公式のドキュメント・README・公式サイトと照らして確認した（照合日と出典を記録）",
  "hands-on": "実際に動かして確認した（確認した内容と日付を記録）",
  recheck: "以前に確認したが、時間がたっている・内容が変わった可能性があり、再確認が必要",
  unverified: "照合の記録がない。導入前に公式の情報で確認する",
};

const STATUSES: VerificationStatus[] = ["official", "hands-on", "recheck", "unverified"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

type Raw = { status?: unknown; checked_at?: unknown; sources?: unknown; note?: unknown } | null | undefined;

/** frontmatter の verification を読む。無い・不正なときは「未検証」にする（確認済みとは扱わない） */
export function parseVerification(raw: Raw): Verification {
  if (!raw || typeof raw !== "object") return { status: "unverified", sources: [] };
  const status = STATUSES.includes(raw.status as VerificationStatus) ? (raw.status as VerificationStatus) : "unverified";
  const sources = Array.isArray(raw.sources) ? raw.sources.filter((s): s is string => typeof s === "string" && /^https:\/\//.test(s)) : [];
  const checked = typeof raw.checked_at === "string" ? raw.checked_at : raw.checked_at instanceof Date ? raw.checked_at.toISOString().slice(0, 10) : undefined;
  const ok = status === "unverified" || (checked && DATE.test(checked) && sources.length > 0 && (status !== "hands-on" || typeof raw.note === "string"));
  if (!ok) return { status: "unverified", sources: [] };
  return { status, checked_at: checked, sources, note: typeof raw.note === "string" ? raw.note : undefined };
}

/** 書き方の検証（問題の説明を返す。空なら問題なし） */
export function validateVerification(raw: Raw): string[] {
  if (raw == null) return [];
  const p: string[] = [];
  if (typeof raw !== "object") return ["verification がオブジェクトでない"];
  if (!STATUSES.includes(raw.status as VerificationStatus)) p.push(`status が不正（${String(raw.status)}）`);
  if (raw.status === "unverified") return p;
  const checked = typeof raw.checked_at === "string" ? raw.checked_at : raw.checked_at instanceof Date ? raw.checked_at.toISOString().slice(0, 10) : "";
  if (!DATE.test(checked)) p.push("checked_at が YYYY-MM-DD でない");
  const urls = Array.isArray(raw.sources) ? raw.sources : [];
  if (urls.length === 0) p.push("sources（出典のURL）が無い");
  for (const u of urls) if (typeof u !== "string" || !/^https:\/\//.test(u)) p.push(`sources に https でないURL（${String(u)}）`);
  if (raw.status === "hands-on" && !(typeof raw.note === "string" && raw.note.trim())) p.push("hands-on には、確認した内容と環境を書く note が必要");
  return p;
}
