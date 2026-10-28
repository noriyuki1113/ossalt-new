/**
 * OSS詳細ページの「選ぶ前の要約」を、掲載データだけから作る（純粋関数）。
 *
 * 方針
 * - 根拠のある項目だけを出す。値が無い（未取得・未確認）ものは、強みにも弱みにもせず、
 *   「未確認」として別に示すか、何も出さない。
 * - 一つ一つの文に「根拠（どのデータか）」を付ける。
 * - しきい値はこのファイルの定数にまとめ、画面でも説明できるようにする。
 * - 文章はテンプレートで、生成AIは使わない。
 *
 * node:test から直接読み込めるよう、型以外の依存は純粋な関数だけにしている。
 */
import { classifyLicense, licenseGroupOf } from "./compare.ts";
import { DIFFICULTY_LABELS, getDifficulty, type Difficulty } from "./diagnosis.ts";
import { TEAM_SIZE_LABELS, TECHNICAL_LEVEL_LABELS, type Strength, type ToolDiagnosisMeta } from "./diagnosis-types.ts";
import type { Tool } from "./tools.ts";

export const BRIEF_THRESHOLDS = {
  /** 最終コミットからの日数：この日数以内なら「活発」 */
  activeDays: 30,
  /** この日数以上なら「更新が少ない」 */
  slowDays: 180,
  /** この日数以上なら「更新が止まっている可能性」 */
  staleDays: 365,
  /** 直近12か月のリリース回数：この回数以上なら「定期的」 */
  frequentReleases: 6,
  /** OpenSSF Scorecard：この値以上なら「良好の目安」、未満なら「低め」 */
  scorecardGood: 7.5,
  scorecardLow: 5,
  /** 人気・成長ランキングで「上位」とみなす割合（%） */
  topPercent: 10,
} as const;

export type BriefItem = { text: string; basis: string };

/** ランキング上の位置（rankings.ts の結果から作って渡す） */
export type Standing = {
  popular: { rank: number; total: number } | null;
  growth: { rank: number; total: number } | null;
  /** 成長を比べられないときの理由 */
  growthReason: string | null;
};

export type ToolBrief = {
  strengths: BriefItem[];
  cautions: BriefItem[];
  setup: { level: Difficulty | null; label: string; basis: string };
  maintenance: { label: string; basis: string };
  standing: { popular: string; growth: string; link: string };
  links: Array<{ label: string; href: string; note: string }>;
};

/** 診断データの「強み」を、ツールの説明として読める言い方にする（診断の質問文のままでは使えない） */
const STRENGTH_DESCRIPTIONS: Record<Strength, string> = {
  privacy: "データを自分で管理しやすい",
  usability: "使いやすさに強みがある",
  cost: "費用を抑えやすい",
  features: "機能が豊富",
  customization: "カスタマイズしやすい",
  active: "開発が活発",
  security: "セキュリティに配慮されている",
};

const topPct = (rank: number, total: number) => Math.max(1, Math.ceil((rank / total) * 100));

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "不明";
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}` : "不明";
}

export function buildToolBrief(tool: Tool, diag: ToolDiagnosisMeta | undefined, standing: Standing): ToolBrief {
  const T = BRIEF_THRESHOLDS;
  const strengths: BriefItem[] = [];
  const cautions: BriefItem[] = [];
  const lastCommit = `最終コミット ${fmtDate(tool.last_commit)}`;

  /* --- 保守・更新 --- */
  if (tool.github_archived) {
    cautions.push({ text: "開発が終了している（アーカイブ済み）", basis: "GitHubのアーカイブ状態" });
  } else if (tool.freshness_days != null) {
    if (tool.freshness_days <= T.activeDays) strengths.push({ text: "直近30日以内に更新がある（開発が活発）", basis: lastCommit });
    else if (tool.freshness_days >= T.staleDays) cautions.push({ text: `最終コミットが${tool.freshness_days}日前で、更新が止まっている可能性がある`, basis: lastCommit });
    else if (tool.freshness_days >= T.slowDays) cautions.push({ text: `最終コミットが${tool.freshness_days}日前で、更新は少なめ`, basis: lastCommit });
  }
  if (!tool.github_archived && tool.releases_12mo != null && tool.releases_12mo >= T.frequentReleases) {
    strengths.push({ text: `直近12か月に${tool.releases_12mo}回リリースしている`, basis: "GitHubのリリース" });
  }
  if (tool.maintenance_notice) {
    cautions.push({ text: `公式の保守に関する警告がある：${tool.maintenance_notice.text}`, basis: `公式の表示（${tool.maintenance_notice.checked_at}確認）` });
  }

  /* --- ライセンス --- */
  const license = tool.license;
  const group = licenseGroupOf(license);
  const cls = classifyLicense(license);
  if (group === "osi") {
    if (cls === "permissive" || cls === "dual" || cls === "weak-copyleft") {
      strengths.push({ text: `OSI承認のライセンス（${license}）で、商用でも条件が少ない`, basis: "ライセンス表記" });
    } else {
      strengths.push({ text: `OSI承認のオープンソース（${license}）`, basis: "ライセンス表記" });
      cautions.push({
        text: cls === "network-copyleft"
          ? `${license}：改変したものをネットワーク越しに他の人へ提供する場合は、ソースの公開が必要`
          : `${license}：改変したものを配布する場合は、ソースの公開が必要`,
        basis: "ライセンスの種類",
      });
    }
  } else if (group === "source-available") {
    cautions.push({ text: `${license}はOSI承認のオープンソースではなく（ソース公開型）、商用での使い方に条件がある`, basis: "ライセンス表記" });
  } else if (group === "mixed") {
    cautions.push({ text: `ライセンスが複数・混在（${license}）。使う部分の条件の確認が必要`, basis: "ライセンス表記" });
  } else {
    cautions.push({ text: "ライセンスが未確認。リポジトリのLICENSEファイルで確認が必要（「無い」という意味ではない）", basis: "ライセンス表記なし" });
  }

  /* --- セキュリティ --- */
  if (tool.scorecard_score != null) {
    if (tool.scorecard_score >= T.scorecardGood) strengths.push({ text: `OpenSSF Scorecardが${tool.scorecard_score}で、良好の目安（${T.scorecardGood}以上）`, basis: "OpenSSF Scorecard（第三者の機械的な採点）" });
    else if (tool.scorecard_score < T.scorecardLow) cautions.push({ text: `OpenSSF Scorecardが${tool.scorecard_score}と低め`, basis: "OpenSSF Scorecard（第三者の機械的な採点）" });
  } else {
    cautions.push({ text: "セキュリティ評価（OpenSSF Scorecard）は未評価。安全の証拠にも、危険の証拠にもならない", basis: "Scorecardの結果なし" });
  }
  if (tool.advisories_count != null && tool.advisories_count > 0) {
    cautions.push({ text: `公開された脆弱性アドバイザリが${tool.advisories_count}件ある（修正済みを含む。対応状況は公式で確認）`, basis: "GitHubの公開アドバイザリ" });
  }

  /* --- 導入・日本語 --- */
  if (tool.docker_available === true) strengths.push({ text: "Dockerでの導入に対応している", basis: "リポジトリのDocker関連ファイル" });
  else if (tool.docker_available === false) cautions.push({ text: "Dockerでの導入手順は確認できていない", basis: "リポジトリの確認結果" });
  if (tool.ja_ui === true) strengths.push({ text: "日本語の画面がある", basis: "日本語化の確認" });
  else if (tool.ja_docs === "official") strengths.push({ text: "公式の日本語ドキュメントがある", basis: "日本語ドキュメントの確認" });
  else if (tool.ja_docs === "community") strengths.push({ text: "有志による日本語ドキュメントがある", basis: "日本語ドキュメントの確認" });
  else cautions.push({ text: "日本語の画面・ドキュメントは未確認（「無い」という意味ではない）", basis: "日本語対応の確認結果なし" });

  /* --- 人気・成長 --- */
  if (standing.popular && topPct(standing.popular.rank, standing.popular.total) <= T.topPercent) {
    strengths.push({ text: `人気ランキングで上位${topPct(standing.popular.rank, standing.popular.total)}%`, basis: "Stars・Forks・Contributors" });
  }
  if (standing.growth && topPct(standing.growth.rank, standing.growth.total) <= T.topPercent) {
    strengths.push({ text: `直近の成長が速い（急成長ランキングで上位${topPct(standing.growth.rank, standing.growth.total)}%）`, basis: "Star数の実測（7日・30日）" });
  }

  /* --- 診断データ（5つのSaaSの代替のみ） --- */
  let setup: ToolBrief["setup"];
  if (diag) {
    const level = getDifficulty(diag);
    setup = {
      level,
      label: `導入・運用の難易度：${DIFFICULTY_LABELS[level]}`,
      basis: `診断データ（必要な技術レベル：${TECHNICAL_LEVEL_LABELS[diag.technicalLevel]}／運用の手間：${["とても軽い", "軽い", "ふつう", "重い"][diag.maintenanceLevel]}）`,
    };
    for (const s of diag.strengths.slice(0, 2)) strengths.push({ text: STRENGTH_DESCRIPTIONS[s], basis: "診断データ（編集部の整理）" });
    if (diag.teamSize.length >= 4) {
      strengths.push({ text: "個人から大きなチームまで、規模を問わず使える", basis: "診断データ（編集部の整理）" });
    } else if (diag.teamSize.length > 0) {
      strengths.push({ text: `${diag.teamSize.map((t) => TEAM_SIZE_LABELS[t]).join("・")}での利用に向く`, basis: "診断データ（編集部の整理）" });
    }
    if (level === "hard") cautions.push({ text: "運用に専門的な知識と手間が必要", basis: "診断データ" });
  } else {
    setup = {
      level: null,
      label: tool.docker_available === true ? "導入の目安：Dockerで始められる（難易度は未評価）" : "導入・運用の難易度：未評価",
      basis: "難易度の評価は、診断データのある5つのSaaSの代替のみ。公式の導入手順を確認してください",
    };
  }

  /* --- 保守・人気・成長の位置づけ --- */
  const maintenance = {
    label:
      tool.freshness_days == null
        ? "更新状況：未取得"
        : `最終コミット：${tool.freshness_days}日前${tool.releases_12mo != null ? `／直近12か月のリリース：${tool.releases_12mo}回` : ""}`,
    basis: `${lastCommit}`,
  };
  const popular = standing.popular
    ? `人気：掲載${standing.popular.total}件中${standing.popular.rank}位（Stars・Forks・Contributors）`
    : "人気：未観測";
  const growth = standing.growth
    ? `成長：${standing.growth.total}件中${standing.growth.rank}位（直近7日・30日の実測）`
    : `成長：未観測（${standing.growthReason ?? "実測の記録が足りない"}）`;

  const gh = tool.github_url.replace(/\/+$/, "");
  // 公式サイトのURLが未登録のツールもあるため、あるときだけ出す
  const links = [
    ...(/^https?:\/\//.test(tool.url ?? "") ? [{ label: "公式サイト", href: tool.url, note: "機能・料金・最新の情報" }] : []),
    { label: "GitHubのREADME", href: `${gh}#readme`, note: "導入手順・ドキュメントへの入口" },
    { label: "リリース一覧", href: `${gh}/releases`, note: "最新の版と変更点" },
  ];

  return { strengths, cautions, setup, maintenance, standing: { popular, growth, link: "/rankings/" }, links };
}

