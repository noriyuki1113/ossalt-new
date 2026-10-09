/**
 * スポンサー枠（OSSALT Sponsors）の設定と検査（純粋関数のみ）
 *
 * 掲載は data-source/sponsors.json で管理する（DBは使わない。静的サイトで、毎日の再ビルドで反映）。
 * 表示回数・クリック数は Umami のイベント（sponsor_viewable / sponsor_click）で数え、ここには持たない。
 *
 * 守ること（docs/revenue/REVENUE_STRATEGY.md）:
 *   - スポンサーは掲載の順番・健全度スコア・比較の内容に影響しない（この設定はどの並べ替えにも使わない）
 *   - 実際に契約していない企業を載せない：status が "active" の掲載は、運営者が契約を確認した日
 *     （contract_confirmed_on）が必須。検査に通らない掲載は表示しない
 *   - 契約が0件のときは何も表示しない（「広告募集中」などの空き枠も出さない）
 */

export const SPONSOR_PLACEMENTS = ["alternative", "category", "blog"] as const;
export type SponsorPlacement = (typeof SPONSOR_PLACEMENTS)[number];

export type Sponsor = {
  /** 掲載の識別子（計測の campaign に使う。英小文字・数字・ハイフン） */
  id: string;
  /** 広告主の名前（表示する） */
  advertiser: string;
  /** 掲載の見出し（40字以内） */
  title: string;
  /** 説明（120字以内） */
  description: string;
  /** 遷移先（https のみ） */
  destination_url: string;
  /** 掲載する場所 */
  placement: SponsorPlacement;
  /** 掲載するページの slug（空なら、その種類のすべてのページ） */
  targets: string[];
  /** 掲載期間（日本時間の日付。両端を含む） */
  start_date: string;
  end_date: string;
  status: "active" | "paused" | "ended";
  /** 運営者が契約（申込み・合意）を確認した日。active には必須 */
  contract_confirmed_on: string | null;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** 検査。問題の一覧を返す（空なら合格） */
export function validateSponsor(s: Sponsor): string[] {
  const errs: string[] = [];
  const at = `スポンサー ${s.id || "(id なし)"}`;
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(s.id ?? "")) errs.push(`${at}: id は英小文字・数字・ハイフン`);
  if (!s.advertiser?.trim()) errs.push(`${at}: advertiser が空`);
  if (!s.title?.trim() || s.title.length > 40) errs.push(`${at}: title は1〜40字`);
  if (!s.description?.trim() || s.description.length > 120) errs.push(`${at}: description は1〜120字`);
  try {
    if (new URL(s.destination_url).protocol !== "https:") errs.push(`${at}: destination_url は https`);
  } catch {
    errs.push(`${at}: destination_url が不正`);
  }
  if (!(SPONSOR_PLACEMENTS as readonly string[]).includes(s.placement)) errs.push(`${at}: placement が不明`);
  if (!Array.isArray(s.targets)) errs.push(`${at}: targets は配列`);
  if (!DATE.test(s.start_date ?? "") || !DATE.test(s.end_date ?? "")) errs.push(`${at}: 期間は YYYY-MM-DD`);
  else if (s.start_date > s.end_date) errs.push(`${at}: start_date が end_date より後`);
  if (!["active", "paused", "ended"].includes(s.status)) errs.push(`${at}: status が不明`);
  if (s.status === "active" && !DATE.test(s.contract_confirmed_on ?? "")) {
    errs.push(`${at}: active には contract_confirmed_on（契約を確認した日）が必要`);
  }
  return errs;
}

/** 日本時間の今日（YYYY-MM-DD） */
export function todayJst(now: Date = new Date()): string {
  return new Date(now.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

/** その日に掲載中か（status が active・検査に合格・期間内） */
export function isRunning(s: Sponsor, today: string): boolean {
  return s.status === "active" && validateSponsor(s).length === 0 && s.start_date <= today && today <= s.end_date;
}

/**
 * そのページに出すスポンサー（1枠に1件。該当がなければ null）。
 * 複数が該当したら、ページを指定している掲載を優先し、次に開始日の早い順。
 */
export function sponsorFor(
  list: Sponsor[],
  placement: SponsorPlacement,
  slug: string,
  today: string,
): Sponsor | null {
  const hits = list.filter(
    (s) => s.placement === placement && isRunning(s, today) && (s.targets.length === 0 || s.targets.includes(slug)),
  );
  hits.sort(
    (a, b) =>
      Number(b.targets.length > 0) - Number(a.targets.length > 0) || a.start_date.localeCompare(b.start_date),
  );
  return hits[0] ?? null;
}
