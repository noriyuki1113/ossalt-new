import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getBlogPosts } from "@/lib/blog";
import { getMeta } from "@/lib/data";
import { formatDate } from "@/lib/tools";
import { t } from "@/lib/site";

export const metadata: Metadata = {
  title: t("blog.title"),
  description: t("blog.lede"),
  alternates: { canonical: "/blog/" },
};

export default function BlogIndexPage() {
  const meta = getMeta();
  const posts = getBlogPosts();

  return (
    <>
      <SiteHeader current="/blog" />
      <main className="wrap page">
        <Breadcrumbs items={[{ href: "/", label: "トップ" }, { label: t("blog.title") }]} />
        <h1 className="h2">{t("blog.title")}</h1>
        <p className="lede">{t("blog.lede")}</p>

        {posts.length === 0 ? (
          <div className="empty">{t("blog.empty")}</div>
        ) : (
          <div className="stack">
            {posts.map((post) => (
              <article key={post.slug} className="panel">
                <div className="panel__body">
                  <p className="muted" style={{ fontSize: "0.8125rem", marginTop: 0, marginBottom: "0.4rem" }}>
                    {formatDate(post.date)}
                  </p>
                  <h2 className="h3" style={{ marginTop: 0 }}>
                    <Link href={`/blog/${post.slug}/`}>{post.title}</Link>
                  </h2>
                  <p style={{ marginBottom: 0 }}>{post.description}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
