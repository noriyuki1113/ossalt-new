import Link from "next/link";
import { NAV, SITE, t } from "@/lib/site";

export function SiteHeader({ current }: { current?: string }) {
  return (
    <header className="site-head">
      <div className="wrap site-head__inner">
        <Link className="brand" href="/">
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
                <Link href="/feed.xml">RSS</Link>
              </li>
            </ul>
          </div>
          <div className="foot-col">
            <h3>運営</h3>
            <ul>
              <li>
                <Link href="/contact/">お問い合わせ・導入相談</Link>
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
          <p>© {new Date().getFullYear()} {SITE.name}</p>
        </div>
      </div>
    </footer>
  );
}

export function Newsletter() {
  return (
    <section className="news" aria-labelledby="news-title">
      <h2 className="news__title" id="news-title">
        {t("newsletter.title")}
      </h2>
      <p className="news__lede">{t("newsletter.lede")}</p>
      <form className="news__form" action="#" method="post">
        <label className="field" style={{ flex: "1 1 14rem" }}>
          <span className="field__label" style={{ color: "#8f9a91" }}>
            メールアドレス
          </span>
          <input
            className="input"
            type="email"
            name="email"
            placeholder={t("newsletter.placeholder")}
            autoComplete="email"
            required
          />
        </label>
        <button className="btn btn--primary" type="submit" style={{ alignSelf: "end" }}>
          {t("newsletter.button")}
        </button>
      </form>
      <p className="news__note">{t("newsletter.note")}</p>
    </section>
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
