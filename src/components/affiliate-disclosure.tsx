/**
 * 広告・アフィリエイトの表示（景品表示法のステルスマーケティングの規制に配慮し、言い切る形で書く）。
 * 文言は /editorial/ の「広告とアフィリエイト」と合わせること。
 */

/** 見出しの横に付ける「PR」の表示。本文と同じくらいの大きさで、見落とされない形にする */
export function AdLabel({ kind = "pr" }: { kind?: "pr" | "sponsor" }) {
  return (
    <span className={`ad-label ad-label--${kind}`}>{kind === "sponsor" ? "スポンサー" : "PR"}</span>
  );
}

export function AffiliateDisclosure({ className = "" }: { className?: string }) {
  return (
    <p className={`muted ${className}`} style={{ fontSize: "0.8125rem" }}>
      この枠のリンクはアフィリエイト（広告）です。リンク先で申し込むと、ossalt.jpに紹介料が入ります。並び順は公開されている最低月額の安い順で、紹介料の額では並べていません。
    </p>
  );
}
