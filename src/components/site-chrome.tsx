import Link from "next/link";
import { NAV, SITE, t } from "@/lib/site";

/**
 * サイトのロゴマーク。SaaSの選択肢の中からオープンソースの代替を1つ選ぶ、という
 * 意味を4つの点で表している（右下の朱色が「選んだ答え」）。favicon等と共通の意匠。
 */
function LogoMark() {
  return (
    <svg className="brand__logo" viewBox="0 0 512 512" aria-hidden="true">
      <rect width="512" height="512" rx="112.64" fill="#1d3b72" />
      <circle cx="190.72" cy="190.72" r="39.68" fill="#edefe9" />
      <circle cx="321.28" cy="190.72" r="39.68" fill="#edefe9" />
      <circle cx="190.72" cy="321.28" r="39.68" fill="#edefe9" />
      <circle cx="321.28" cy="321.28" r="39.68" fill="#d2452c" />
    </svg>
  );
}

export function SiteHeader({ current }: { current?: string }) {
  return (
    <header className="site-head">
      <div className="wrap site-head__inner">
        <Link className="brand" href="/">
          <LogoMark />
          <span className="brand__mark">ossalt</span>
          <span className="brand__sub">.jp</span>
        </Link>
        <nav className="nav" aria-label="メインナビゲーション">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={
                // "/" を現在地として渡すと全項目が前方一致してしまうため除外する
                current && current !== "/" && item.href.startsWith(current)
                  ? "page"
                  : undefined
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ meta }: { meta?: { built_at: string; tool_count: number } }) {
  const updated = meta?.built_at
    ? new Intl.DateTimeFormat("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "Asia/Tokyo",
      }).format(new Date(meta.built_at))
    : null;

  return (
    <footer className="site-foot">
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-col">
            <h3>探す</h3>
            <ul>
              <li>
                <Link href="/tools/">ツール一覧</Link>
              </li>
              <li>
                <Link href="/categories/">カテゴリ</Link>
              </li>
              <li>
                <Link href="/alternatives/">SaaSから探す</Link>
              </li>
            </ul>
          </div>
          <div className="foot-col">
            <h3>読む</h3>
            <ul>
              <li>
                <Link href="/guide/">選び方</Link>
              </li>
              <li>
                <Link href="/about/">このサイトについて</Link>
              </li>
              <li>
                <Link href="/feed/">RSS</Link>
              </li>
            </ul>
          </div>
          <div className="foot-col">
            <h3>運営</h3>
            <ul>
              <li>
                <Link href="/submit/">掲載リクエスト</Link>
              </li>
              <li>
                <Link href="/contact/">お問い合わせ</Link>
              </li>
              <li>
                <Link href="/sponsor/">スポンサー・広告掲載</Link>
              </li>
              <li>
                <Link href="/terms/">{t("footer.terms")}</Link>
              </li>
              <li>
                <Link href="/disclaimer/">{t("footer.disclaimerPage")}</Link>
              </li>
              <li>
                <Link href="/privacy/">プライバシーポリシー</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="foot-note">
          <p>
            {SITE.name} — {SITE.tagline}
          </p>
          <p>
            {t("footer.dataNote")}
            {updated ? `（データ更新: ${updated}${meta ? ` / ${meta.tool_count}件` : ""}）` : ""}
          </p>
          <p>{t("footer.disclaimer")}</p>
          <p>{t("footer.logoNotice")}</p>
          {SITE.operatorName && (
            <p className="site-foot__operator">
              {t("footer.operator")}：{SITE.operatorName}
            </p>
          )}
          <p>© {new Date().getFullYear()} {SITE.name}</p>
        </div>
      </div>
    </footer>
  );
}

/** 構造化データ。未評価のスコアは出力しない（推測値を出さない方針） */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function Breadcrumbs({
  items,
}: {
  items: Array<{ href?: string; label: string }>;
}) {
  return (
    <nav className="crumbs" aria-label="パンくず">
      {items.map((it, i) => (
        <span key={`${it.label}-${i}`} style={{ display: "contents" }}>
          {i > 0 && <span aria-hidden="true">/</span>}
          {it.href ? <Link href={it.href}>{it.label}</Link> : <span>{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}
