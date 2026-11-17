import type { Post, Project } from "@/lib/types";
import { RouteLink } from "./RouteLink";
import { SiteTransferButton } from "./SiteTransferButton";

export function formatDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

export function projectStatusLabel(status: string) {
  const labels: Record<string, string> = { online: "公开服务", active: "公开项目", "open-source": "开源项目" };
  return labels[status] || status || "项目";
}

export function SectionHeading({ id, label, title, description, href, linkText }: { id?: string; label?: string; title: string; description?: string; href?: string; linkText?: string }) {
  return (
    <div className="site-section-head">
      <div>{label ? <span className="site-kicker">{label}</span> : null}<h2 id={id} className="site-section-title">{title}</h2>{description ? <p className="site-section-description">{description}</p> : null}</div>
      {href && linkText ? <SiteTransferButton variant="quiet" href={href}>{linkText}</SiteTransferButton> : null}
    </div>
  );
}

export function EmptyContent({ title, description }: { title: string; description: string }) {
  return <div className="site-empty"><strong>{title}</strong><span>{description}</span></div>;
}

export function ProjectCard({ project, featured = false, compact = false }: { project: Project; featured?: boolean; compact?: boolean }) {
  return (
    <RouteLink href={"/projects/" + encodeURIComponent(project.slug)} data-has-cover={Boolean(project.coverImage)} className={"site-project-card" + (featured ? " site-project-card-featured" : "") + (compact ? " site-project-card-compact" : "")}>
      <span className="site-project-card-meta"><span>{projectStatusLabel(project.projectStatus)}</span>{project.projectDate ? <><span className="site-meta-separator" />{formatDate(project.projectDate)}</> : null}</span>
      {project.coverImage ? <span className="site-project-card-visual"><img src={project.coverImage} alt={project.title + " 项目封面"} loading="lazy" /></span> : null}
      <span className="site-project-card-title">{project.title}<span className="site-card-arrow" aria-hidden="true">↗</span></span>
      <p className="site-project-card-description">{project.description}</p>
      {project.techStack.length ? <span className="site-stack">{project.techStack.slice(0, 5).map((stack) => <span key={stack}>{stack}</span>)}</span> : null}
    </RouteLink>
  );
}

export function PostRow({ post }: { post: Post }) {
  return (
    <RouteLink href={"/posts/" + encodeURIComponent(post.slug)} className="site-post-row">
      <time className="site-post-date" dateTime={post.publishedAt || post.createdAt}>{formatDate(post.publishedAt || post.createdAt)}</time>
      <div><h3>{post.title}</h3><p>{post.excerpt}</p><span className="site-post-meta">{post.category ? <span>{post.category}</span> : null}{post.category && post.readingMinutes ? <span className="site-meta-separator" /> : null}{post.readingMinutes ? <span>约 {post.readingMinutes} 分钟阅读</span> : null}{post.category || post.readingMinutes ? <span className="site-meta-separator" /> : null}<span>{(post.viewCount ?? 0).toLocaleString("zh-CN")} 次浏览</span></span></div>
      <span className="site-card-arrow" aria-hidden="true">↗</span>
    </RouteLink>
  );
}
