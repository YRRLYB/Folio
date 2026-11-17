import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getPublishedPost, listPublishedPosts } from "@/lib/server/content";
import { formatDate, PostRow, SectionHeading } from "@/components/site/ContentList";
import { extractHeadings, RichContent, TableOfContents } from "@/components/site/RichContent";
import { RouteLink } from "@/components/site/RouteLink";
import { PostViews } from "@/components/site/PostViews";
import { PostComments } from "@/components/site/PostComments";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return { title: "文章未找到" };
  return { title: post.title, description: post.excerpt, openGraph: { title: post.title, description: post.excerpt, images: post.coverImage ? [post.coverImage] : undefined, type: "article", publishedTime: post.publishedAt || undefined, modifiedTime: post.updatedAt } };
}

export default async function PostPage({ params }: Props) {
  await connection();
  const { slug } = await params;
  const [post, posts] = await Promise.all([getPublishedPost(slug), listPublishedPosts()]);
  if (!post) notFound();
  const headings = extractHeadings(post.content);
  const index = posts.findIndex((item) => item.id === post.id);
  const newer = index > 0 ? posts[index - 1] : null;
  const older = index >= 0 ? posts[index + 1] : null;
  const matching = posts.filter((item) => item.id !== post.id && ((post.category && item.category === post.category) || item.tags.some((tag) => post.tags.includes(tag))));
  const related = (matching.length ? matching : posts.filter((item) => item.id !== post.id)).slice(0, 2);

  return (
    <article className="site-container">
      <header className="site-detail-header">
        <RouteLink href="/posts" className="site-back-link">← 返回文章</RouteLink>
        <div className="site-detail-meta" style={{ marginTop: 35 }}>
          {post.category ? <><span>{post.category}</span><span className="site-meta-separator" /></> : null}
          <time dateTime={post.publishedAt || post.createdAt}>{formatDate(post.publishedAt || post.createdAt)}</time>
          {post.readingMinutes > 0 ? <><span className="site-meta-separator" /><span>约 {post.readingMinutes} 分钟阅读</span></> : null}
          <span className="site-meta-separator" /><PostViews postId={post.id} initialCount={post.viewCount} />
        </div>
        <h1 className="site-detail-title">{post.title}</h1>
        <p className="site-detail-lead">{post.excerpt}</p>
        {post.updatedAt && post.publishedAt && formatDate(post.updatedAt) !== formatDate(post.publishedAt) ? <span className="site-post-meta">更新于 {formatDate(post.updatedAt)}</span> : null}
      </header>
      {post.coverImage ? <img className="site-detail-cover" src={post.coverImage} alt={post.title + " 封面"} /> : null}
      <div className={"site-reading-layout" + (headings.length ? "" : " no-toc")}>
        <div>
          <RichContent document={post.content} />
          {post.tags.length ? <div className="site-detail-tags">{post.tags.map((tag) => <span className="site-chip" key={tag}>{tag}</span>)}</div> : null}
        </div>
        <TableOfContents headings={headings} />
      </div>
      <PostComments key={post.id} postId={post.id} />
      {newer || older ? <nav className="site-detail-pagination" aria-label="相邻文章">
        <div>{newer ? <RouteLink href={"/posts/" + encodeURIComponent(newer.slug)}><span>上一篇 · 较新 ←</span><strong>{newer.title}</strong></RouteLink> : null}</div>
        <div>{older ? <RouteLink href={"/posts/" + encodeURIComponent(older.slug)}><span>下一篇 · 较早 →</span><strong>{older.title}</strong></RouteLink> : null}</div>
      </nav> : null}
      {related.length ? <section className="site-section" aria-label={matching.length ? "相关文章" : "继续阅读"}>
        <SectionHeading label="Continue Reading" title={matching.length ? "相关文章" : "继续阅读"} />
        <div className="site-post-list">{related.map((item) => <PostRow key={item.id} post={item} />)}</div>
      </section> : null}
    </article>
  );
}
