/**
 * ツールの型定義と、純粋な計算・整形ロジック
 *
 * クライアントコンポーネントからもimportするため、ここに副作用は置かない。
 * JSONの読み込みは lib/data.ts が担当する。
 */

export type LanguageShare = { name: string; pct: number; color: string };

export type Tool = {
  id: string;
  name: string;
  url: string;
  github_url: string;
  description_ja: string | null;
  description_en: string | null;
  /** カテゴリslug */
  category: string;
  primary_competitor: string;
  primary_competitor_ja: string | null;

  stars_num: number | null;
  forks_num: number | null;
  contributors_num: number | null;
  watchers_num: number | null;
  language: string | null;
  license: string | null;

  last_commit: string | null;
  created_at: string | null;
  /** ビルド時点での最終コミットからの経過日数 */
  freshness_days: number | null;

  scorecard_score: number | null;
  scorecard_date: string | null;
  scorecard_checks: Record<string, number> | null;

  /**
   * 脆弱性の報告窓口（SECURITY.md）の有無。GitHub contents API で確認。
   * null は「確認できなかった」であり「無い」ではない（取得失敗と無いことを混同しない）。
   */
  security_md: boolean | null;
  /** .github/dependabot.yml の有無。null は「確認できなかった」。 */
  dependabot_configured: boolean | null;
  /** 最新リリースの公開日（releases API）。リリースが無い場合も null。 */
  latest_release_at: string | null;
  /** 直近12か月のリリース数。取得できた場合のみ数値（0も含む）、取得できなければ null。 */
  releases_12mo: number | null;
  /** 公開されているセキュリティアドバイザリの件数。取得できなければ null。 */
  advisories_count: number | null;

  docker_available: boolean | null;
  github_archived: boolean;
  health_score: number | null;
  topics: string[];
  languages: LanguageShare[];

  /**
   * 日本語ドキュメントの有無。
   * "official"（公式に日本語ページがある）/ "community"（有志の日本語訳がある）/
   * "none"（英語のみ確認）/ null（未調査）。
   * 収録全件は調べきれないため、health_score が高い順にバッチで確認している
   * （scripts/check-ja-docs.mjs）。null は「無い」ではなく「まだ調べていない」。
   */
  ja_docs: "official" | "community" | "none" | null;

  /**
   * 検索用の別名（カタカナ表記・通称など）。例: excalidraw なら
   * ["エクスカリドロー", "えくすかりどろー"]。検索対象にのみ使い、画面には出さない。
   */
  aliases: string[];
};

export type DataMeta = {
  built_at: string;
  tool_count: number;
  scored_count: number;
  unrated_count: number;
  /** 収録カテゴリ数（build-data.mjs が付与） */
  categories?: number;
  /** 代替対象SaaSの数 */
  competitors?: number;
  /** コントリビュータ数を取得できた件数 */
  with_contributors?: number;
  /** ウォッチャー数を取得できた件数 */
  with_watchers?: number;
  /** 健全度スコアの分布（build-data.mjs が実データから算出） */
  health?: {
    count: number;
    min: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    max: number;
    within_90d_count: number;
  } | null;
};

/** 代替対象SaaS（重複をまとめたもの） */
export type CompetitorGroup = {
  slug: string;
  name: string;
  tools: Tool[];
};

/**
 * 競合名（primary_competitor）が日本語のみで構成される場合、
 * 通常のslugify（英数字以外を "-" に置換）では全体が空文字になってしまう
 * （例:「マネーフォワード」→ ""）。/alternatives/<slug>/ のURLが壊れるため、
 * ローマ字のslugを明示的に持たせる。
 *
 * ここに追加するのは「日本語の競合名で、slugifyすると空になるもの」だけでよい。
 * 英数字が含まれる名前（freee, kintone等）はそのままslugifyできるため対象外。
 */
const COMPETITOR_SLUG_OVERRIDES: Record<string, string> = {
  マネーフォワード: "moneyforward",
};

export function slugifyCompetitor(name: string): string {
  if (COMPETITOR_SLUG_OVERRIDES[name]) return COMPETITOR_SLUG_OVERRIDES[name];
  return name
    .toLowerCase()
    .replace(/\./g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/* ------------------------------------------------------------------ *
 * 健全度スコア
 * 本家 OpenAlternative と同じ式:
 *   stars×0.25 + forks×0.5 + contributors×0.5 + watchers×0.25
 *   − min(最終コミットからの日数, 90) × 0.5
 * 5項目それぞれの寄与を返す。値が無い項目は unknown として扱い、
 * 推測値で埋めない（未取得は未取得と表示する）。
 * ------------------------------------------------------------------ */

export type HealthTerm = {
  key: "stars" | "forks" | "contributors" | "watchers" | "freshness";
  label: string;
  weight: string;
  raw: number | null;
  contribution: number | null;
  /** メーターの目盛りの高さ 0-100 */
  fill: number;
  unknown: boolean;
  /** 新しさの項目で、90日以上更新が無い場合 */
  stale?: boolean;
};

export type HealthBreakdown = {
  total: number | null;
  terms: HealthTerm[];
  archived: boolean;
};

const WEIGHTS = {
  stars: 0.25,
  forks: 0.5,
  contributors: 0.5,
  watchers: 0.25,
} as const;

export function getHealth(tool: Tool): HealthBreakdown {
  const days = tool.freshness_days;
  const freshnessPenalty = days == null ? null : -Math.min(days, 90) * 0.5;

  const defs: Array<{
    key: HealthTerm["key"];
    label: string;
    weight: string;
    raw: number | null;
    contribution: number | null;
  }> = [
    {
      key: "stars",
      label: "スター",
      weight: "× 0.25",
      raw: tool.stars_num,
      contribution:
        tool.stars_num == null ? null : tool.stars_num * WEIGHTS.stars,
    },
    {
      key: "forks",
      label: "フォーク",
      weight: "× 0.5",
      raw: tool.forks_num,
      contribution:
        tool.forks_num == null ? null : tool.forks_num * WEIGHTS.forks,
    },
    {
      key: "contributors",
      label: "コントリビュータ",
      weight: "× 0.5",
      raw: tool.contributors_num,
      contribution:
        tool.contributors_num == null
          ? null
          : tool.contributors_num * WEIGHTS.contributors,
    },
    {
      key: "watchers",
      label: "ウォッチャー",
      weight: "× 0.25",
      raw: tool.watchers_num,
      contribution:
        tool.watchers_num == null ? null : tool.watchers_num * WEIGHTS.watchers,
    },
    {
      key: "freshness",
      label: "更新の新しさ",
      weight: "− 日数 × 0.5",
      raw: days,
      contribution: freshnessPenalty,
    },
  ];

  // 目盛りは「プラスの寄与」の中で最大のものを100%とする
  const positives = defs
    .map((d) => d.contribution)
    .filter((c): c is number => c != null && c > 0);
  const max = positives.length ? Math.max(...positives) : 0;

  const terms: HealthTerm[] = defs.map((d) => {
    const unknown = d.contribution == null;
    let fill = 0;
    if (!unknown && max > 0) {
      fill = Math.max(2, Math.round((Math.max(d.contribution as number, 0) / max) * 100));
    }
    return {
      ...d,
      fill,
      unknown,
      stale: d.key === "freshness" && days != null && days > 90,
    };
  });

  return {
    total: tool.health_score,
    terms,
    archived: tool.github_archived,
  };
}

/* ------------------------------------------------------------------ *
 * OpenSSF Scorecard
 * ------------------------------------------------------------------ */

export type ScorecardTier = "excellent" | "good" | "fair" | "poor" | "unrated";

export const SCORECARD_TIERS = {
  excellent: { min: 7.5, label: "良好", note: "セキュリティ対策が充実しています" },
  good: { min: 5.5, label: "標準", note: "一般的な水準の対策が施されています" },
  fair: {
    min: 4.0,
    label: "やや弱い",
    note: "導入前にセキュリティ項目を確認することをおすすめします",
  },
  poor: {
    min: 0,
    label: "要確認",
    note: "対策が不十分な可能性があります。重要な用途では注意してください",
  },
} as const;

export function getScorecardTier(score: number | null | undefined): ScorecardTier {
  if (score == null || Number.isNaN(score)) return "unrated";
  if (score >= SCORECARD_TIERS.excellent.min) return "excellent";
  if (score >= SCORECARD_TIERS.good.min) return "good";
  if (score >= SCORECARD_TIERS.fair.min) return "fair";
  return "poor";
}

/**
 * 「更新が止まっている＝脆弱性が直らないかもしれない」という、セキュリティ観点での
 * 保守状況の警告。第3節の「更新が続いているか」とは別に、セキュリティ節にも出す。
 * 1年（365日）を閾値とする。完成して安定しているソフトは更新が少なくなる、という
 * 第3節の但し書きと矛盾しないよう、断定はせず「可能性があります」の書き方に留める。
 */
export type MaintenanceWarning = { level: "archived" | "stale"; days: number | null } | null;

export function getMaintenanceWarning(tool: Tool): MaintenanceWarning {
  if (tool.github_archived) return { level: "archived", days: tool.freshness_days };
  if (tool.freshness_days != null && tool.freshness_days >= 365) {
    return { level: "stale", days: tool.freshness_days };
  }
  return null;
}

export const SCORECARD_CHECKS: Record<string, string> = {
  Maintained: "継続的なメンテナンス",
  "Code-Review": "コードレビュー必須",
  "Security-Policy": "セキュリティポリシー",
  Vulnerabilities: "既知の脆弱性なし",
  "Dangerous-Workflow": "安全なCI設定",
  "Dependency-Update-Tool": "依存関係の自動更新",
  "Binary-Artifacts": "バイナリ成果物なし",
  "Token-Permissions": "最小権限のトークン",
};

/* ------------------------------------------------------------------ *
 * 表示フォーマット
 * ------------------------------------------------------------------ */

/** 1,234,567 → 123.5万 */
export function formatCompactJa(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n < 10000) return n.toLocaleString("ja-JP");
  const man = n / 10000;
  return `${man >= 100 ? Math.round(man) : man.toFixed(1)}万`;
}

/** 1,234,567 → 1,234,567 */
export function formatFull(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("ja-JP");
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(d);
}

/** 最終コミットからの経過を日本語で */
export function formatRelativeDays(days: number | null | undefined): string {
  if (days == null) return "—";
  if (days <= 0) return "今日";
  if (days === 1) return "昨日";
  if (days < 30) return `${days}日前`;
  if (days < 365) return `${Math.round(days / 30)}か月前`;
  return `${(days / 365).toFixed(1)}年前`;
}

export function licenseLabel(license: string | null | undefined): string {
  return license && license.trim() ? license : "不明";
}

export function dockerLabel(v: boolean | null | undefined): string {
  if (v === true) return "対応";
  if (v === false) return "非対応";
  return "未確認";
}

export function securityMdLabel(v: boolean | null | undefined): string {
  if (v === true) return "あり";
  if (v === false) return "なし";
  return "未確認";
}

export function dependabotLabel(v: boolean | null | undefined): string {
  if (v === true) return "設定あり";
  if (v === false) return "未設定";
  return "未確認";
}

/** 「2026/08/12（直近12か月に5回）」のような表示。リリースが無い場合はその旨を返す。 */
export function releaseInfoLabel(latestReleaseAt: string | null, releases12mo: number | null): string {
  if (!latestReleaseAt) return "リリースはありません";
  const dateStr = formatDate(latestReleaseAt);
  if (releases12mo == null) return dateStr;
  return `${dateStr}（直近12か月に${releases12mo}回）`;
}

export function advisoriesLabel(v: number | null | undefined): string {
  if (v == null) return "未確認";
  if (v === 0) return "公開されているアドバイザリはありません";
  return `${v}件`;
}

/**
 * 一覧・比較表のセキュリティ列。Scorecardが未評価（6.5%の大半）だと
 * 空欄になってしまうため、確認できている他の信号で代替表示する。
 * 優先順: アーカイブ済み > アドバイザリあり > SECURITY.mdの有無 > 未確認。
 * 色だけに頼らず、必ず文字でも示す。
 */
export type SecurityFallback = { text: string; tier: "poor" | "fair" | "good" | "unrated" };

export function getSecurityFallback(tool: Tool): SecurityFallback {
  if (tool.github_archived) return { text: "開発終了", tier: "poor" };
  if (tool.advisories_count != null && tool.advisories_count > 0) {
    return { text: "要確認", tier: "fair" };
  }
  if (tool.security_md === true) return { text: "窓口あり", tier: "good" };
  if (tool.security_md === false) return { text: "窓口なし", tier: "unrated" };
  return { text: "未確認", tier: "unrated" };
}

export function jaDocsLabel(v: Tool["ja_docs"]): string {
  if (v === "official") return "あり（公式）";
  if (v === "community") return "有志訳あり";
  if (v === "none") return "英語のみ";
  return "未調査";
}

/* ------------------------------------------------------------------ *
 * 検索・並び替え（クライアントと共用）
 * ------------------------------------------------------------------ */

export type SortKey = "health" | "stars" | "recent" | "name";

/**
 * 検索文字列の正規化。日本語話者はひらがな・カタカナ・全角・半角・
 * 大文字小文字を自由に混ぜて検索するため、比較前にそろえる。
 *   - 大文字 → 小文字
 *   - カタカナ → ひらがな
 *   - 全角英数記号 → 半角
 */
export function normalizeSearchText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60)) // カタカナ→ひらがな
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0)) // 全角英数→半角
    .replace(/　/g, " "); // 全角スペース→半角
}

export function filterAndSort(
  tools: Tool[],
  opts: {
    query?: string;
    category?: string;
    license?: string;
    dockerOnly?: boolean;
    sort?: SortKey;
  }
): Tool[] {
  const q = normalizeSearchText((opts.query ?? "").trim());
  let out = tools;

  if (opts.category) out = out.filter((t) => t.category === opts.category);
  if (opts.license) out = out.filter((t) => licenseLabel(t.license) === opts.license);
  if (opts.dockerOnly) out = out.filter((t) => t.docker_available === true);

  if (q) {
    out = out.filter((t) =>
      normalizeSearchText(
        [
          t.name,
          t.id,
          t.primary_competitor,
          t.primary_competitor_ja ?? "",
          t.description_ja ?? "",
          t.description_en ?? "",
          t.language ?? "",
          t.license ?? "",
          ...(t.topics ?? []),
          ...(t.aliases ?? []),
        ].join(" ")
      ).includes(q)
    );
  }

  const sorted = [...out];
  switch (opts.sort) {
    case "stars":
      sorted.sort((a, b) => (b.stars_num ?? -1) - (a.stars_num ?? -1));
      break;
    case "recent":
      sorted.sort(
        (a, b) =>
          (a.freshness_days ?? 99999) - (b.freshness_days ?? 99999)
      );
      break;
    case "name":
      sorted.sort((a, b) => a.name.localeCompare(b.name, "ja"));
      break;
    default:
      // 健全度が未算出のものはスター数で並べる（同点の並びを安定させる）
      sorted.sort(
        (a, b) =>
          (b.health_score ?? -1) - (a.health_score ?? -1) ||
          (b.stars_num ?? -1) - (a.stars_num ?? -1)
      );
  }
  return sorted;
}

/** 絞り込み用のライセンス一覧（件数つき） */
export function licenseFacets(tools: Tool[]): Array<{ value: string; count: number }> {
  const m = new Map<string, number>();
  for (const t of tools) {
    const l = licenseLabel(t.license);
    m.set(l, (m.get(l) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}
