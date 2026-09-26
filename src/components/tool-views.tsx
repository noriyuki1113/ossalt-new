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
  getSecurityFallback,
  jaDocsLabel,
  jaUiLabel,
  hasJapanese,
  licenseLabel,
  releaseInfoLabel,
  securityMdLabel,
  type Tool,
} from "@/lib/tools";
import { t } from "@/lib/site";

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
        aria-label={`健全度 ${h.total ?? "不明"}。5項目の内訳は詳細ページに記載。`}
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
  const tier = getScorecardTier(tool.scorecard_score);
  if (tier === "unrated") {
    return (
      <span className={`sc sc--unrated`} title={t("security.unratedReason")}>
        <span className="sc__dot" aria-hidden="true" />
        <span>Security</span>
        <span className="sc__score">{t("security.unrated")}</span>
      </span>
    );
  }
  return (
    <span
      className={`sc sc--${tier}`}
      title={`OpenSSF Scorecard ${tool.scorecard_score} / 10（${SCORECARD_TIERS[tier].label}）`}
    >
      <span className="sc__dot" aria-hidden="true" />
      <span>Security</span>
      <span className="sc__score">{tool.scorecard_score?.toFixed(1)}</span>
    </span>
  );
}

/**
 * 一覧・比較表用。Scorecard未評価のときに空欄にしない代替表示。
 * 「未評価 ≠ 安全/危険」の考え方を壊さないよう、確認できた事実（アーカイブ・
 * アドバイザリ・SECURITY.mdの有無）だけを文字で示す。色だけに頼らない。
 */
export function SecurityListBadge({ tool }: { tool: Tool }) {
  const tier = getScorecardTier(tool.scorecard_score);
  if (tier !== "unrated") return <ScorecardBadge tool={tool} />;
  const fallback = getSecurityFallback(tool);
  return (
    <span className={`sc sc--${fallback.tier}`} title={t("security.unratedReason")}>
      <span className="sc__dot" aria-hidden="true" />
      <span>Security</span>
      <span className="sc__score">{fallback.text}</span>
    </span>
  );
}

export function ScorecardPanel({ tool }: { tool: Tool }) {
  const tier = getScorecardTier(tool.scorecard_score);
  const checks = tool.scorecard_checks ?? {};
  const rows = Object.entries(SCORECARD_CHECKS)
    .filter(([key]) => key in checks)
    .map(([key, label]) => ({ key, label, score: checks[key] }));
  const maintenance = getMaintenanceWarning(tool);

  return (
    <div className="panel">
      <div className="panel__head">
        <h2 className="panel__title">{t("metric.security")}</h2>
        <span className="panel__meta">
          {tool.scorecard_date ? `OpenSSF Scorecard / ${tool.scorecard_date}` : "OpenSSF Scorecard"}
        </span>
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
        {tier === "unrated" ? (
          <>
            <ScorecardBadge tool={tool} />
            <p className="mt1" style={{ marginBottom: "0.5rem" }}>
              {t("security.unratedReason")}
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
                {SCORECARD_TIERS[tier].label} — {SCORECARD_TIERS[tier].note}
              </span>
            </p>
            {rows.length > 0 && (
              <>
                <h3 className="field__label mt1">{t("security.checks")}</h3>
                <dl className="spec">
                  {rows.map((r) => (
                    <div className="spec__row" key={r.key}>
                      <dt className="spec__key">{r.label}</dt>
                      <dd className="spec__val">
                        {r.score >= 10 ? "✓ 合格" : r.score > 0 ? `${r.score} / 10` : "× 未対応"}
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </>
        )}
        <h3 className="field__label mt1">{t("security.signals")}</h3>
        <dl className="spec">
          <div className="spec__row">
            <dt className="spec__key">{t("security.securityMd")}</dt>
            <dd className="spec__val">
              {tool.security_md === false ? t("security.securityMdMissing") : securityMdLabel(tool.security_md)}
            </dd>
          </div>
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
        <p className="muted" style={{ fontSize: "0.75rem", marginBottom: 0 }}>
          {t("security.what")}
        </p>
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
              {tool.license ? ` ／ ${tool.license}` : ""}
            </p>
          </div>
          {hasJapanese(tool) && (
            <span className="tag" style={{ alignSelf: "flex-start", flexShrink: 0 }}>
              {tool.ja_ui === true ? "日本語の画面あり" : "日本語の資料あり"}
            </span>
          )}
        </div>
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
 * 詳細ページのスペック表
 * ------------------------------------------------------------------ */

export function SpecTable({ tool }: { tool: Tool }) {
  const rows: Array<[string, ReactNode]> = [
    [t("metric.stars"), formatFull(tool.stars_num)],
    [t("metric.forks"), formatFull(tool.forks_num)],
    [t("metric.contributors"), formatFull(tool.contributors_num)],
    [t("metric.watchers"), formatFull(tool.watchers_num)],
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
    [t("metric.health"), tool.health_score != null ? Math.round(tool.health_score).toLocaleString("ja-JP") : "—"],
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
  return (
    <div className="ctable-scroll">
      <table className="ctable">
        <caption className="skip">候補ツールの比較表</caption>
        <thead>
          <tr>
            <th scope="col">ツール</th>
            <th scope="col">代替対象</th>
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
              <td className="num">{formatCompactJa(tool.stars_num)}</td>
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
