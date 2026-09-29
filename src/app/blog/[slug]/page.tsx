import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ToolRow } from "@/components/tool-views";
import { HouseAd } from "@/components/house-ad";
import { PostActions } from "@/components/post-actions";
import { getBlogPost, getBlogPosts } from "@/lib/blog";
import { getMeta, getTool } from "@/lib/data";
import { formatDate } from "@/lib/tools";
import { SITE, t } from "@/lib/site";
import { pageMeta } from "@/lib/seo";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return getBlogPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: t("detail.notFound") };
  return pageMeta({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}/`,
    type: "article",
  });
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const meta = getMeta();
  const relatedTools = post.relatedTools
    .map((id) => getTool(id))
    .filter((tool): tool is NonNullable<typeof tool> => Boolean(tool));

  return (
    <>
      <SiteHeader current="/blog" />
      <main className="wrap page">
        <Breadcrumbs
          items={[
            { href: "/", label: "トップ" },
            { href: "/blog/", label: t("blog.title") },
            { label: post.title },
          ]}
        />
        <h1 className="h2">{post.title}</h1>
        <p className="lede">{post.description}</p>
        <p className="muted" style={{ fontSize: "0.8125rem" }}>
          {t("common.updated")}: {formatDate(post.date)}
          {post.updated && post.updated !== post.date
            ? ` ／ ${t("blog.updatedNote")}: ${formatDate(post.updated)}`
            : ""}
        </p>

        <div className="prose" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />

        <PostActions
          slug={post.slug}
          title={post.title}
          url={`${SITE.url.replace(/\/$/, "")}/blog/${post.slug}/`}
        />

        {relatedTools.length > 0 && (
          <section className="mt2">
            <h2 className="h3">{t("blog.relatedTools")}</h2>
            <div className="ledger">
              {relatedTools.map((tool) => (
                <ToolRow key={tool.id} tool={tool} />
              ))}
            </div>
          </section>
        )}

        <HouseAd placement={`blog_${post.slug}`} />

        <p className="muted mt2" style={{ fontSize: "0.8125rem" }}>
          {t("footer.disclaimer")}
        </p>
      </main>
      <SiteFooter meta={meta} />
    </>
  );
}
