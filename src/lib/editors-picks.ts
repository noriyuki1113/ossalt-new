/**
 * EDITOR'S PICKS（発見した、すごいOSS。）の調査データの型と検証。
 *
 * - 運営者が選ぶ、主観的な推薦の特集。ランキングや順位ではない。
 * - 既存のランキング・For You・比較・OSS掲載データには一切つながない（独立した編集コンテンツ）。
 * - 調査の段階は3つ。「確認していない段階」は名乗れない。
 *     official  … 公式情報確認済み（README・LICENSE・公式サイト・公式ドキュメントを読んだ）
 *     code      … コード・実装確認済み（ソースコードの該当箇所を読んだ。読んだ場所をnoteに書く）
 *     hands-on  … 実機検証済み（実際に動かした。環境と手順をnoteに書く）
 * - 純粋関数のみ（node:test から直接読み込める）。
 */
export type ResearchStage = "official" | "code" | "hands-on";

export const STAGE_ORDER: ResearchStage[] = ["official", "code", "hands-on"];

export const STAGE_LABELS: Record<ResearchStage, string> = {
  official: "公式情報確認済み",
  code: "コード・実装確認済み",
  "hands-on": "実機検証済み",
};

export const STAGE_DESCRIPTIONS: Record<ResearchStage, string> = {
  official: "README・LICENSE・公式サイト・公式ドキュメントを読んで確認した。動かしてはいない",
  code: "ソースコードの該当箇所を読んで確認した（読んだ場所を記録）",
  "hands-on": "実際に動かして確認した（環境と手順を記録）",
};

/** 特集の種類。第1弾は roundup。ほかは、シリーズ化するときの置き場（今は自動生成・定期公開しない） */
export type IssueKind =
  | "roundup" // 〇選
  | "weekly-pick" // 今週の推しOSS
  | "monthly-five" // 今月の面白かったOSS 5選
  | "idea" // 発想がすごいOSS
  | "want-to-try" // 開発者が試してみたいOSS
  | "hands-on-report"; // 実際に動かして検証したOSS

export const ISSUE_KINDS: IssueKind[] = ["roundup", "weekly-pick", "monthly-five", "idea", "want-to-try", "hands-on-report"];

/** OSSとして使えるか。oss=OSIの定義に沿う / partial=一部だけOSS（残りは別の条件）/ not-oss=OSSではない */
export type OssStatus = "oss" | "partial" | "not-oss";

export type Verification = {
  stage: ResearchStage;
  checked_at: string;
  sources: string[];
  note: string;
};

export type Fact = { label: string; value: string; as_of: string; note?: string };

export type Pick = {
  id: string;
  name: string;
  maintainer: string;
  github_url: string;
  docs_url?: string;
  license: string;
  oss_status: OssStatus;
  /** 特集に載せるか。OSSでないもの・ライセンスを確認できないものは false にして exclusion_reason を書く */
  included: boolean;
  exclusion_reason?: string;
  category: string;
  summary: string;
  what_is_great: string;
  use_cases: string[];
  caveats: string[];
  difficulty: string;
  /** 運営者の編集上の評価コメント（「私が注目した理由」）。運営者が文面を決めたものだけを入れる。実機で検証したという意味ではない */
  editorial_comment?: string;
  /** 「特に注目した」順（1〜3）。人気やスター数の順位ではない */
  spotlight_rank?: 1 | 2 | 3;
  /** OSSALTに掲載済みか。掲載済みのときだけ、詳細ページへ内部リンクできる */
  ossalt: { listed: boolean; tool_id?: string; path?: string };
  /** 変わる情報（版・状態など）。必ず確認日（as_of）を付ける */
  facts: Fact[];
  verification: Verification;
};

export type Issue = {
  id: string;
  series: "editors-picks";
  kind: IssueKind;
  title_ja: string;
  researched_at: string;
  scope: string;
  /** pending_approval=編集案（運営者の承認前）/ approved=運営者が内容を確認し、承認した */
  editorial_status: "pending_approval" | "approved";
  editorial_status_note?: string;
  /** 広告・スポンサー案件か。通常の編集選定と区別する。true の特集は、記事の冒頭にその旨を出す */
  sponsored: boolean;
  /** 最短の公開候補日（YYYY-MM-DD）。公開確定日ではない。この日より前は公開不可 */
  earliest_publish?: string;
  /** 公開の直前に、掲載する全件の確認日が、公開日からこの時間以内であること（既定48） */
  reverify_within_hours?: number;
};

export type IssueFile = { issue: Issue; picks: Pick[] };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const HTTPS = /^https:\/\//;
const GITHUB = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/;

function isRealDate(s: unknown): boolean {
  if (typeof s !== "string" || !DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** 調査段階の検証。足りないものを説明する。空配列なら問題なし */
export function validateVerification(v: Partial<Verification> | null | undefined): string[] {
  const p: string[] = [];
  if (!v || typeof v !== "object") return ["verification が無い"];
  if (!STAGE_ORDER.includes(v.stage as ResearchStage)) p.push(`stage が不正（${String(v.stage)}）`);
  if (!isRealDate(v.checked_at)) p.push("checked_at が実在する YYYY-MM-DD でない");
  const urls = Array.isArray(v.sources) ? v.sources : [];
  if (urls.length === 0) p.push("sources（出典のURL）が無い");
  for (const u of urls) if (typeof u !== "string" || !HTTPS.test(u)) p.push(`sources に https でないURL（${String(u)}）`);
  const note = typeof v.note === "string" ? v.note.trim() : "";
  // 公式情報の確認でも、何を読んで何を読んでいないかが分かるように note を必須にする。
  if (!note) p.push("note（何を確認し、何を確認していないか）が無い");
  if ((v.stage === "code" || v.stage === "hands-on") && note.length < 20) p.push(`${v.stage} には、確認した場所・環境・手順を具体的に書く note が必要`);
  return p;
}

/** 1件の検証。internalToolIds が渡されたら、OSSALTへの内部リンク先が実在するかも確かめる */
export function validatePick(pick: Partial<Pick>, internalToolIds?: Set<string>): string[] {
  const p: string[] = [];
  const id = String(pick?.id ?? "(id無し)");
  const need = (cond: boolean, msg: string) => { if (!cond) p.push(`${id}: ${msg}`); };
  const text = (v: unknown) => typeof v === "string" && v.trim().length > 0;

  need(text(pick.id) && /^[a-z0-9][a-z0-9-]*$/.test(String(pick.id)), "id は小文字・数字・ハイフンのみ");
  for (const k of ["name", "maintainer", "license", "category", "summary", "what_is_great", "difficulty"] as const) need(text(pick[k]), `${k} が空`);
  need(typeof pick.github_url === "string" && GITHUB.test(pick.github_url), "github_url が https://github.com/<owner>/<repo> の形でない");
  if (pick.docs_url !== undefined) need(HTTPS.test(pick.docs_url), "docs_url が https でない");
  need(pick.oss_status === "oss" || pick.oss_status === "partial" || pick.oss_status === "not-oss", "oss_status が不正");
  need(typeof pick.included === "boolean", "included が真偽値でない");
  need(Array.isArray(pick.use_cases) && pick.use_cases.length > 0 && pick.use_cases.every(text), "use_cases が空");
  need(Array.isArray(pick.caveats) && pick.caveats.length > 0 && pick.caveats.every(text), "caveats（気になる点）が空。弱みを書かない紹介は載せない");

  // OSSでないもの・ライセンスが確認できないものは、正式掲載から除く
  if (pick.included === true) need(pick.oss_status !== "not-oss", "OSSでないものを included にできない");
  if (pick.included === false) need(text(pick.exclusion_reason), "除外するときは exclusion_reason が必要");
  // 一部だけOSSのもの（oss_status=partial）は、気になる点にその旨を書く
  if (pick.oss_status === "partial") need((pick.caveats ?? []).some((c) => /Enterprise|商用|別の条件|一部/.test(c)), "partial のときは、OSSでない部分を caveats に書く");

  if (pick.editorial_comment !== undefined) need(text(pick.editorial_comment), "editorial_comment が空");
  if (pick.spotlight_rank !== undefined) need(pick.spotlight_rank === 1 || pick.spotlight_rank === 2 || pick.spotlight_rank === 3, "spotlight_rank は 1〜3");

  const facts = Array.isArray(pick.facts) ? pick.facts : [];
  for (const f of facts) {
    need(text(f?.label) && text(f?.value), "facts の label/value が空");
    need(isRealDate(f?.as_of), `facts「${String(f?.label)}」に確認日（as_of）が無い`);
  }

  for (const m of validateVerification(pick.verification)) p.push(`${id}: ${m}`);

  const o = pick.ossalt;
  need(!!o && typeof o.listed === "boolean", "ossalt.listed が無い");
  if (o?.listed) {
    need(text(o.tool_id) && text(o.path), "掲載済みのときは tool_id と path が必要");
    if (internalToolIds && text(o.tool_id)) need(internalToolIds.has(String(o.tool_id)), `OSSALTに無い tool_id（${o.tool_id}）へ内部リンクしようとしている`);
    if (text(o.tool_id) && text(o.path)) need(o.path === `/tools/${o.tool_id}/`, "path が /tools/<tool_id>/ でない");
  } else {
    need(!o?.tool_id && !o?.path, "未掲載のものに内部リンク（tool_id/path）を付けない");
  }
  return p;
}

export function validateIssue(file: Partial<IssueFile> | null | undefined, internalToolIds?: Set<string>): string[] {
  const p: string[] = [];
  if (!file || !file.issue || !Array.isArray(file.picks)) return ["issue と picks が必要"];
  const i = file.issue;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(String(i.id))) p.push("issue.id が不正");
  if (i.series !== "editors-picks") p.push("issue.series は editors-picks");
  if (!ISSUE_KINDS.includes(i.kind as IssueKind)) p.push(`issue.kind が不正（${String(i.kind)}）`);
  if (!String(i.title_ja ?? "").trim()) p.push("issue.title_ja が空");
  if (!isRealDate(i.researched_at)) p.push("issue.researched_at（調査日）が実在する日付でない");
  if (!String(i.scope ?? "").trim()) p.push("issue.scope（調査の範囲）が空");
  if (i.editorial_status !== "pending_approval" && i.editorial_status !== "approved") p.push("issue.editorial_status が不正");
  if (typeof i.sponsored !== "boolean") p.push("issue.sponsored（広告・スポンサー案件か）が真偽値でない");

  if (i.earliest_publish !== undefined && !isRealDate(i.earliest_publish)) p.push("issue.earliest_publish が実在する YYYY-MM-DD でない");
  if (i.reverify_within_hours !== undefined && !(Number.isFinite(i.reverify_within_hours) && i.reverify_within_hours > 0)) p.push("issue.reverify_within_hours が正の数でない");

  // 注目順（1〜3）は、掲載する3件で、重複なし
  const ranks = file.picks.filter((x) => x?.spotlight_rank !== undefined).map((x) => x.spotlight_rank);
  if (ranks.length > 0 && (ranks.length !== 3 || new Set(ranks).size !== 3)) p.push("spotlight_rank は、1・2・3を1件ずつ");
  // 運営者が承認した特集は、掲載する全件に運営者のコメントがあること（コメントを創作して埋めない）
  if (i.editorial_status === "approved") {
    for (const x of file.picks) if (x.included && !String(x.editorial_comment ?? "").trim()) p.push(`${x.id}: 承認済みの特集なのに editorial_comment（運営者のコメント）が無い`);
  }

  const seen = new Set<string>();
  for (const pick of file.picks) {
    if (seen.has(String(pick?.id))) p.push(`id が重複（${String(pick?.id)}）`);
    seen.add(String(pick?.id));
    p.push(...validatePick(pick, internalToolIds));
  }
  return p;
}

/**
 * 公開してよい状態か。承認前（pending_approval）・調査日の欠け・除外すべきものの混入・最短公開日より前・
 * 公開直前の再確認の漏れは、公開不可。today（YYYY-MM-DD・日本時間）を渡すと、日付の条件も検査する。
 */
export function publishBlockers(file: IssueFile, today?: string): string[] {
  const b: string[] = [];
  if (file.issue.editorial_status !== "approved") b.push("運営者の最終承認がまだ（editorial_status が approved でない）");
  if (today && file.issue.earliest_publish && today < file.issue.earliest_publish) {
    b.push(`最短の公開候補日（${file.issue.earliest_publish}）より前（今日 ${today}）`);
  }
  if (today) {
    const hours = file.issue.reverify_within_hours ?? 48;
    for (const pick of file.picks) {
      if (!pick.included) continue;
      const ageH = (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${pick.verification.checked_at}T00:00:00Z`)) / 3600e3;
      // 確認日は日付単位。公開の日の0時から数えて、確認日が（時間÷24）日より前なら再確認が必要
      if (ageH > hours - 24) b.push(`${pick.id}: 公開直前の再確認が済んでいない（確認日 ${pick.verification.checked_at}。公開の${hours}時間以内に確認する）`);
    }
  }
  for (const pick of file.picks) {
    if (pick.included && pick.oss_status === "not-oss") b.push(`${pick.id}: OSSでないものが掲載対象になっている`);
  }
  b.push(...validateIssue(file));
  return b;
}

/** 掲載対象（included）の件数と、段階ごとの内訳。記事の冒頭で「実機検証は何件」を正直に出すための集計 */
export function stageSummary(picks: Pick[]): Record<ResearchStage, number> & { included: number } {
  const s = { official: 0, code: 0, "hands-on": 0, included: 0 };
  for (const p of picks) {
    if (!p.included) continue;
    s.included += 1;
    s[p.verification.stage] += 1;
  }
  return s;
}
