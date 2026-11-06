import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ToolLogo } from "@/components/tool-logo";
import {
  SCORECARD_CHECKS,
  SCORECARD_TIERS,
  advisoriesLabel,
  dependabotLabel,
  dockerLabel,
  formatCompactJa,
  formatDate,
  formatFull,
  formatRelativeDays,
  getHealth,
  getMaintenanceWarning,
  getScorecardTier,
  jaDocsLabel,
  jaUiLabel,
  hasJapanese,
  licenseLabel,
  releaseInfoLabel,
  scorecardState,
  scorecardStatusText,
  securityMdLabel,
  type Tool,
} from "@/lib/tools";
import { t } from "@/lib/site";
import { archivedSecurityText } from "@/lib/archive-reason";
import { classifyLicense, LICENSE_CLASS_LABELS, licenseGroupOf } from "@/lib/compare";
import { freshnessState, type StarContext } from "@/lib/star-context";

/* ------------------------------------------------------------------ *
 * 健全度メーター — このサイトの署名要素
 * スコアの式に含まれる5項目を、そのまま5つの目盛りで表す。
 * 値が取得できていない項目は斜線の「未取得」として表示し、推測で埋めない。
 * ------------------------------------------------------------------ */

export function HealthMeter({
  tool,
  size = "md",
}: {
  tool: Tool;
  size?: "sm" | "md";
}) {
  const h = getHealth(tool);
  return (
    <div className="meter__wrap">
      <span
        className="meter"
        role="img"
        aria-label={`注目度・規模の目安 ${h.total ?? "不明"}。5項目の内訳は詳細ページに記載。`}
        style={size === "sm" ? { height: 20 } : undefined}
      >
        {h.terms.map((term) => (
          <span
            key={term.key}
            className={[
              "meter__seg",
              term.unknown ? "meter__seg--unknown" : "",
              term.stale ? "meter__seg--stale" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ "--fill": `${term.fill}%` } as CSSProperties}
          />
        ))}
      </span>
      <span className="meter__score">
        {h.total != null ? Math.round(h.total).toLocaleString("ja-JP") : "—"}
      </span>
    </div>
  );
}

export function HealthLegend({ tool }: { tool: Tool }) {
  const h = getHealth(tool);
  return (
    <>
      <ul className="meter__legend">
        {h.terms.map((term) => (
          <li key={term.key}>
            <span className="k">
              {term.label} <span className="muted">{term.weight}</span>
            </span>
            <span className={`v ${term.unknown ? "v--unknown" : ""}`}>
              {term.unknown
                ? "未取得"
                : term.key === "freshness"
                  ? formatRelativeDays(term.raw)
                  : formatFull(term.raw)}
            </span>
          </li>
        ))}
      </ul>
      {h.archived && (
        <p className="notice notice--warn mt1" style={{ marginBottom: 0 }}>
          <strong>{t("health.archived")}</strong>
        </p>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * セキュリティ評価（OpenSSF Scorecard）
 * 未評価は「未評価」と明示し、数値も色も出さない。
 * ------------------------------------------------------------------ */

export function ScorecardBadge({ tool }: { tool: Tool }) {
  const state = scorecardState(tool);
  if (state !== "scored") {
    return (
      <span
        className={`sc sc--unrated`}
        title={state === "mirror" ? t("security.mirrorReason") : t("security.unratedReason")}
      >
        <span className="sc__dot" aria-hidden="true" />
        <span>Scorecard</span>
        <span className="sc__score">{state === "mirror" ? "対象外" : t("security.unrated")}</span>
      </span>
    );
  }
  const tier = getScorecardTier(tool.scorecard_score);
  if (tier === "unrated") return null;
  return (
    <span
      className={`sc sc--${tier}`}
      title={`OpenSSF Scorecard ${tool.scorecard_score} / 10（${SCORECARD_TIERS[tier].label}）`}
    >
      <span className="sc__dot" aria-hidden="true" />
      <span>Scorecard</span>
      <span className="sc__score">{tool.scorecard_score?.toFixed(1)}</span>
    </span>
  );
}

/**
 * 一覧・比較表用。OpenSSF Scorecard の状態だけを示し、報告窓口（SECURITY.md）などの別の情報は混ぜない。
 * アーカイブ済みは保守の状況として、別の小さな表示で添える。未評価は安全・危険の判定に使わない。
 */
export function SecurityListBadge({ tool }: { tool: Tool }) {
  return (
    <>
      <ScorecardBadge tool={tool} />
      {tool.github_archived && <span className="sc-note">{archivedSecurityText(tool.archive_reason)}</span>}
    </>
  );
}

function scorecardCheckText(score: number): string {
  // Scorecard の -1 は「判定できなかった・対象外」で、0点ではない
  if (score < 0) return "判定できず";
  if (score >= 10) return "✓ 合格";
  return `${score} / 10`;
}

export function ScorecardPanel({ tool }: { tool: Tool }) {
  const state = scorecardState(tool);
  const tier = getScorecardTier(tool.scorecard_score);
  const checks = tool.scorecard_checks ?? {};
  const rows = Object.entries(SCORECARD_CHECKS)
    .filter(([key]) => key in checks)
    .map(([key, label]) => ({ key, label, score: checks[key] }));
  const maintenance = getMaintenanceWarning(tool);
  const githubChecked = tool.github_checked_at ? tool.github_checked_at.slice(0, 10) : null;

  return (
    <div className="panel">
      <div className="panel__head">
        <h2 className="panel__title">{t("metric.security")}</h2>
      </div>
      <div className="panel__body">
        {maintenance?.level === "archived" && (
          <p className="notice notice--warn" style={{ marginTop: 0, marginBottom: "1rem" }}>
            <strong>{t("security.archivedWarning")}</strong>
          </p>
        )}
        {maintenance?.level === "stale" && (
          <p className="notice" style={{ marginTop: 0, marginBottom: "1rem" }}>
            {t("security.staleWarning", { days: maintenance.days ?? "—" })}
          </p>
        )}

        <h3 className="field__label" style={{ marginTop: 0 }}>OpenSSF Scorecard</h3>
        {state !== "scored" ? (
          <>
            <ScorecardBadge tool={tool} />
            <p className="mt1" style={{ marginBottom: "0.5rem" }}>
              {state === "mirror" ? t("security.mirrorReason") : t("security.unratedReason")}
            </p>
            <p className="muted" style={{ fontSize: "0.875rem", marginTop: 0 }}>
              {t("security.unratedCaution")}
            </p>
          </>
        ) : (
          <>
            <p style={{ marginTop: 0 }}>
              <ScorecardBadge tool={tool} />
              <span className="muted" style={{ marginLeft: "0.75rem", fontSize: "0.875rem" }}>
                {tier !== "unrated" && `${SCORECARD_TIERS[tier].label} — ${SCORECARD_TIERS[tier].note}`}
              </span>
            </p>
            {tool.scorecard_date && (
              <p className="muted" style={{ fontSize: "0.75rem", margin: "0 0 0.5rem" }}>
                {`採点日：${tool.scorecard_date}（OpenSSF Scorecard の公開結果）`}
              </p>
            )}
            {rows.length > 0 && (
              <>
                <h4 className="field__label mt1">{t("security.checks")}</h4>
                <dl className="spec">
                  {rows.map((r) => (
                    <div className="spec__row" key={r.key}>
                      <dt className="spec__key">{r.label}</dt>
                      <dd className="spec__val">{scorecardCheckText(r.score)}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </>
        )}
        <p className="muted" style={{ fontSize: "0.75rem" }}>
          {t("security.what")}
        </p>

        <h3 className="field__label mt1">{t("security.reportTitle")}</h3>
        <dl className="spec">
          <div className="spec__row">
            <dt className="spec__key">{t("security.securityMd")}</dt>
            <dd className="spec__val">
              {tool.security_md === false ? t("security.securityMdMissing") : securityMdLabel(tool.security_md)}
            </dd>
          </div>
        </dl>
        <p className="muted" style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
          {t("security.securityMdScope")}
        </p>

        <h3 className="field__label mt1">{t("security.otherTitle")}</h3>
        <dl className="spec">
          <div className="spec__row">
            <dt className="spec__key">{t("security.dependabot")}</dt>
            <dd className="spec__val">{dependabotLabel(tool.dependabot_configured)}</dd>
          </div>
          <div className="spec__row">
            <dt className="spec__key">{t("security.releases")}</dt>
            <dd className="spec__val">{releaseInfoLabel(tool.latest_release_at, tool.releases_12mo)}</dd>
          </div>
          <div className="spec__row">
            <dt className="spec__key">{t("security.advisories")}</dt>
            <dd className="spec__val">{advisoriesLabel(tool.advisories_count)}</dd>
          </div>
        </dl>
        {githubChecked && (
          <p className="muted" style={{ fontSize: "0.75rem", marginBottom: 0 }}>
            {t("security.githubChecked", { date: githubChecked })}
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 一覧の行
 * ------------------------------------------------------------------ */

export function ToolRow({ tool }: { tool: Tool }) {
  return (
    <article className="row row--linked">
      <div className="row__main">
        <div className="row__head">
          <ToolLogo githubUrl={tool.github_url} name={tool.name} size={40} />
          <div className="row__headtext">
            <h3 className="row__name">
              <Link href={`/tools/${tool.id}/`} className="row__link">
                {tool.name}
              </Link>
            </h3>
            <p className="row__alt">
              {t("card.alternativeTo")}: <b>{tool.primary_competitor_ja || tool.primary_competitor}</b>
              {tool.language ? ` ／ ${tool.language}` : ""}
              {tool.license ? ` ／ ${licenseLabel(tool.license)}` : ""}
            </p>
          </div>
          {hasJapanese(tool) && (
            <span className="tag" style={{ alignSelf: "flex-start", flexShrink: 0 }}>
              {tool.ja_ui === true ? "日本語の画面あり" : "日本語の資料あり"}
            </span>
          )}
        </div>
        {tool.preview && (
          // eslint-disable-next-line @next/next/no-img-element -- 静的書き出しのため next/image の最適化は使わない
          <img
            className="row__thumb"
            src={tool.preview.src}
            width={tool.preview.width}
            height={tool.preview.height}
            alt=""
            loading="lazy"
            decoding="async"
          />
        )}
        {tool.description_ja && <p className="row__desc">{tool.description_ja}</p>}
      </div>
      <div className="row__data">
        <div className="cell">
          <span className="cell__label">{t("metric.stars")}</span>
          <span className="cell__value">{formatCompactJa(tool.stars_num)}</span>
        </div>
        <div className="cell">
          <span className="cell__label">{t("metric.health")}</span>
          <HealthMeter tool={tool} size="sm" />
        </div>
        <div className="cell" style={{ minWidth: "auto" }}>
          <span className="cell__label">{t("metric.security")}</span>
          <SecurityListBadge tool={tool} />
        </div>
      </div>
    </article>
  );
}


/* ------------------------------------------------------------------ *
 * OSS一覧のカード表示（一覧表示の代替ビュー）
 * 公式で確認できた情報だけを表示し、未評価を0点扱いしない。
 * ------------------------------------------------------------------ */

export function ToolCard({ tool }: { tool: Tool }) {
  return (
    <article className="browse-card row--linked">
      <div className="browse-card__heading">
        <ToolLogo githubUrl={tool.github_url} name={tool.name} size={44} />
        <div className="browse-card__heading-copy">
          <h3 className="browse-card__name">
            <Link className="row__link" href={`/tools/${tool.id}/`}>{tool.name}</Link>
          </h3>
          <p className="browse-card__alternative">
            {tool.primary_competitor_ja || tool.primary_competitor} の代替
          </p>
        </div>
      </div>
      {tool.description_ja && (
        <p className="browse-card__description">{tool.description_ja}</p>
      )}
      <div className="browse-card__tags" aria-label="特徴">
        <span className="browse-card__tag">{tool.license ? licenseLabel(tool.license) : "ライセンス未確認"}</span>
        {tool.docker_available === true && <span className="browse-card__tag">Docker対応</span>}
        {hasJapanese(tool) && (
          <span className="browse-card__tag">
            {tool.ja_ui === true ? "日本語の画面あり" : "日本語資料あり"}
          </span>
        )}
      </div>
      <div className="browse-card__metrics">
        <div>
          <span className="browse-card__metric-label">GitHub Stars</span>
          <strong className="browse-card__metric-value">★ {formatCompactJa(tool.stars_num)}</strong>
        </div>
        <div>
          <span className="browse-card__metric-label">Scorecard</span>
          <SecurityListBadge tool={tool} />
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ *
 * 詳細ページのスペック表
 * ------------------------------------------------------------------ */

/** 0〜10点のセキュリティ評価を、目安（7.5）の線つきの細いバーで見せる */
export function ScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(10, score)) * 10;
  return (
    <span className="scorebar" role="img" aria-label={`10点満点中${score}点。7.5点以上が良好の目安`}>
      <span className="scorebar__fill" style={{ width: `${pct}%` }} />
      <span className="scorebar__tick" style={{ left: "75%" }} />
    </span>
  );
}

/**
 * ツールページの冒頭に置く「ひと目で分かる要点」。
 * 検索から来た人が、最初の画面で自分に合うかを判断できるようにする。
 * 数字には「多いのか少ないのか」が分かる文脈を添える。
 * データが無い項目は「未確認」とし、「非対応」とは書かない。
 */
export function KeyFacts({
  tool,
  stars,
  categoryName,
}: {
  tool: Tool;
  stars?: StarContext;
  categoryName?: string;
}) {
  const cls = classifyLicense(tool.license);
  const clsLabel = LICENSE_CLASS_LABELS[cls].replace(/（.*）/, "");
  const licenseWarn = licenseGroupOf(tool.license) !== "osi";
  const ja =
    tool.ja_ui === true
      ? "画面あり"
      : tool.ja_docs === "official" || tool.ja_docs === "community"
        ? "ドキュメントあり"
        : "未確認";
  const fresh = freshnessState(tool.freshness_days);
  const starSub: ReactNode =
    stars?.catRank != null ? (
      <>
        <span title={categoryName ? `カテゴリ：${categoryName}` : undefined}>
          {`同じカテゴリで${stars.catRank}位`}
          <span className="nowrap">{`／${stars.catTotal}件`}</span>
        </span>
        {stars.topPercent != null && (
          <>
            <br />
            {`掲載ツール全体の上位${stars.topPercent}%`}
          </>
        )}
        {tool.star_gain && tool.star_gain.gain > 0 && (
          <>
            <br />
            {`直近${tool.star_gain.days}日間で+${tool.star_gain.gain.toLocaleString("ja-JP")}`}
          </>
        )}
      </>
    ) : undefined;

  const facts: Array<{ key: string; value: ReactNode; sub?: ReactNode; warn?: boolean; good?: boolean }> = [
    { key: "ライセンス", value: licenseLabel(tool.license), sub: clsLabel, warn: licenseWarn },
    { key: "日本語", value: ja, good: ja !== "未確認" },
    { key: "Docker", value: dockerLabel(tool.docker_available), good: tool.docker_available === true },
    {
      key: "最終更新",
      value: formatRelativeDays(tool.freshness_days),
      sub: fresh ? (
        <span className={`dotlabel dotlabel--${fresh.tone}`}>
          <span aria-hidden="true">●</span> {fresh.label}
        </span>
      ) : undefined,
      warn: fresh?.tone === "warn",
    },
    { key: "GitHubのスター", value: formatCompactJa(tool.stars_num), sub: starSub },
    {
      key: "OpenSSF Scorecard",
      value: scorecardStatusText(tool),
      sub:
        tool.scorecard_score != null ? (
          <>
            <ScoreBar score={tool.scorecard_score} />
            {tool.scorecard_score >= 7.5 ? "良好の目安（7.5）以上" : "良好の目安は7.5以上"}
          </>
        ) : (
          "OpenSSF Scorecard の評価なし"
        ),
    },
  ];
  return (
    <dl className="keyfacts" aria-label="要点">
      {facts.map((f) => (
        <div
          key={f.key}
          className={`keyfacts__item${f.warn ? " keyfacts__item--warn" : ""}${f.good ? " keyfacts__item--good" : ""}`}
        >
          <dt>{f.key}</dt>
          <dd>
            {f.value}
            {f.sub && <small>{f.sub}</small>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function SpecTable({ tool, compact = false }: { tool: Tool; compact?: boolean }) {
  const rows: Array<[string, ReactNode]> = [
    // compact：健全度スコアの欄に同じ数字があるページでは、スター等の4項目と健全度を省く
    ...(compact
      ? []
      : ([
          [t("metric.stars"), formatFull(tool.stars_num)],
          [t("metric.forks"), formatFull(tool.forks_num)],
          [t("metric.contributors"), formatFull(tool.contributors_num)],
          [t("metric.watchers"), formatFull(tool.watchers_num)],
        ] as Array<[string, ReactNode]>)),
    [t("metric.license"), licenseLabel(tool.license)],
    [t("metric.language"), tool.language ?? "—"],
    [
      t("metric.lastCommit"),
      <>
        {formatDate(tool.last_commit)}
        <small>{formatRelativeDays(tool.freshness_days)}</small>
      </>,
    ],
    [t("metric.created"), formatDate(tool.created_at)],
    [t("metric.docker"), dockerLabel(tool.docker_available)],
    [t("metric.jaUi"), jaUiLabel(tool.ja_ui)],
    [t("metric.jaDocs"), jaDocsLabel(tool.ja_docs)],
    ...(compact
      ? []
      : ([[t("metric.health"), tool.health_score != null ? Math.round(tool.health_score).toLocaleString("ja-JP") : "—"]] as Array<
          [string, ReactNode]
        >)),
  ];

  return (
    <dl className="spec">
      {rows.map(([key, value]) => (
        <div className="spec__row" key={key}>
          <dt className="spec__key">{key}</dt>
          <dd className="spec__val">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------------------------------------------ *
 * 比較テーブル
 * ------------------------------------------------------------------ */

export function ComparisonTable({ tools }: { tools: Tool[] }) {
  // スター数の横棒は、この表の中で最も多いものを100%とする（表の中での比較のため）
  const maxStars = Math.max(0, ...tools.map((tl) => tl.stars_num ?? 0));
  return (
    <div className="ctable-scroll">
      <table className="ctable">
        <caption className="skip">候補ツールの比較表</caption>
        <thead>
          <tr>
            <th scope="col">ツール</th>
            <th scope="col">主な代替対象</th>
            <th scope="col" style={{ textAlign: "right" }}>
              {t("metric.stars")}
            </th>
            <th scope="col">{t("metric.license")}</th>
            <th scope="col">{t("metric.docker")}</th>
            <th scope="col">{t("metric.health")}</th>
            <th scope="col">{t("metric.security")}</th>
          </tr>
        </thead>
        <tbody>
          {tools.map((tool) => (
            <tr key={tool.id} className="ctable__row">
              <td className="name">
                <span className="ctable__name">
                  <ToolLogo githubUrl={tool.github_url} name={tool.name} size={24} />
                  <Link href={`/tools/${tool.id}/`} className="ctable__link">
                    {tool.name}
                  </Link>
                </span>
              </td>
              <td>{tool.primary_competitor_ja || tool.primary_competitor}</td>
              <td className="num">
                {formatCompactJa(tool.stars_num)}
                {maxStars > 0 && tool.stars_num != null && (
                  <span className="numbar" aria-hidden="true">
                    <span style={{ width: `${Math.max(2, (tool.stars_num / maxStars) * 100)}%` }} />
                  </span>
                )}
              </td>
              <td>{licenseLabel(tool.license)}</td>
              <td>{dockerLabel(tool.docker_available)}</td>
              <td className="num">
                {tool.health_score != null ? Math.round(tool.health_score).toLocaleString("ja-JP") : "—"}
              </td>
              <td>
                <SecurityListBadge tool={tool} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
