"use client";
import { useEffect, useState } from "react";

/**
 * 静的なページは、データ更新が止まると「ビルドした時点では新しかった」表示のまま残る。
 * 閲覧した時点でデータの取得日時が古ければ、その場で古さを知らせる（サーバーでは何も出さない）。
 */
export function DataAgeNotice({ dataAsOf, maxHours, className }: { dataAsOf: string | null; maxHours: number; className?: string }) {
  const [ageHours, setAgeHours] = useState<number | null>(null);
  useEffect(() => {
    const t = dataAsOf ? Date.parse(dataAsOf) : NaN;
    if (Number.isFinite(t)) setAgeHours((Date.now() - t) / 3600e3);
  }, [dataAsOf]);
  if (ageHours === null || ageHours <= maxHours) return null;
  return (
    <aside className={className} role="status" data-testid="data-age-notice">
      <strong>このデータは{Math.floor(ageHours / 24)}日前の取得です。</strong>
      <p>閲覧している時点では、毎日のデータの更新が止まっている可能性があります。最新の状況は、各OSSのGitHubで確認してください。</p>
    </aside>
  );
}
