/**
 * GitHub のアーカイブの「理由」の区分（純粋関数のみ）。
 *
 * GitHub のアーカイブは、開発終了・移転・保守終了のどれでも同じ表示になる。
 * そのため、OSSALT が公式の記載（README・開発チームの発表）を確認できたものだけ、区分を持つ。
 * 確認できないものは "unknown"（理由・後継の記載を確認できていない）。推測で区分しない。
 * 区分は data-source/overrides.json の patch の archive_reason に、出典URL・確認日つきで手動設定する。
 */
export type ArchiveReasonKind = "ended" | "maintenance-ended" | "successor" | "unknown";

export type ArchiveReason = {
  kind: ArchiveReasonKind;
  /** 公式の記載の要約（OSSALT が原文を確認して書いたもの） */
  text: string;
  source_url: string;
  checked_at: string;
  /** 後継が OSSALT に掲載されているときの id */
  successor_id?: string;
};

export const ARCHIVE_REASON_KINDS: readonly ArchiveReasonKind[] = ["ended", "maintenance-ended", "successor", "unknown"];

export const ARCHIVE_REASON_LABELS: Record<ArchiveReasonKind, string> = {
  ended: "開発が終了しました",
  "maintenance-ended": "保守が終了しました",
  successor: "後継のプロジェクトへ移りました",
  unknown: "GitHubでアーカイブされています（理由・後継は公式に記載が確認できません）",
};

/** 見出しの強調に使う短い名前 */
export const ARCHIVE_REASON_SHORT: Record<ArchiveReasonKind, string> = {
  ended: "開発終了",
  "maintenance-ended": "保守終了",
  successor: "後継へ移行",
  unknown: "アーカイブ済み",
};

/** 警告（黄）で出すか、案内（青）で出すか。後継への移行は案内、それ以外は導入の判断に関わる警告 */
export function archiveNoticeTone(kind: ArchiveReasonKind | null | undefined): "warn" | "info" {
  return kind === "successor" ? "info" : "warn";
}

/** 一覧・比較表のセキュリティ列の文字。区分が無い（確認できていない）ときは、「開発終了」と断定しない */
export function archivedSecurityText(reason: Pick<ArchiveReason, "kind"> | null | undefined): string {
  if (!reason) return "アーカイブ済み";
  return reason.kind === "ended" || reason.kind === "maintenance-ended" ? "開発終了" : ARCHIVE_REASON_SHORT[reason.kind];
}
