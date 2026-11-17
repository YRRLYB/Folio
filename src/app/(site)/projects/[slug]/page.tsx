import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { getPublishedProject } from "@/lib/server/content";
import { formatDate, projectStatusLabel } from "@/components/site/ContentList";
import { extractHeadings, RichContent, TableOfContents } from "@/components/site/RichContent";
import { SiteTransferButton } from "@/components/site/SiteTransferButton";
import { SiteBackLink } from "@/components/site/SiteBackLink";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const project = await getPublishedProject(slug);
  if (!project) return { title: "项目未找到" };
  return { title: project.title, description: project.description, openGraph: { title: project.title, description: project.description, images: project.coverImage ? [project.coverImage] : undefined } };
}

export default async function ProjectPage({ params }: Props) {
  await connection();
  const { slug } = await params;
  const project = await getPublishedProject(slug);
  if (!project) notFound();
  if (project.slug !== slug) redirect("/projects/" + encodeURIComponent(project.slug));
  const firstNode = project.content.content?.[0];
  const repeatedLead = firstNode?.type === "paragraph"
    && firstNode.content?.length === 1
    && firstNode.content[0]?.text === project.description;
  const content = repeatedLead
    ? { ...project.content, content: project.content.content?.slice(1) }
    : project.content;
  const headings = extractHeadings(content);

  return (
    <article className="site-container">
      <header className="site-detail-header">
        <SiteBackLink />
        <div className="site-detail-meta site-project-detail-meta">
          <span>{projectStatusLabel(project.projectStatus)}</span>
          {project.projectDate ? <><span className="site-meta-separator" /><time dateTime={project.projectDate}>{formatDate(project.projectDate)}</time></> : null}
        </div>
        <h1 className="site-detail-title">{project.title}</h1>
        {project.description ? <p className="site-detail-lead">{project.description}</p> : null}
        {project.demoUrl || project.githubUrl ? <div className="site-hero-actions site-project-detail-actions">
          {project.demoUrl ? <SiteTransferButton href={project.demoUrl} variant="primary">{project.demoUrl.startsWith("/") ? "打开项目" : "访问网站"}</SiteTransferButton> : null}
          {project.githubUrl ? <SiteTransferButton href={project.githubUrl}>查看源码</SiteTransferButton> : null}
        </div> : null}
        {project.techStack.length ? <div className="site-stack site-project-detail-stack">{project.techStack.map((item) => <span key={item}>{item}</span>)}</div> : null}
      </header>
      {project.coverImage ? <img className="site-detail-cover" src={project.coverImage} alt={project.title + " 项目封面"} /> : null}
      {content.content?.length ? <div className={"site-reading-layout" + (headings.length ? "" : " no-toc")}>
        <RichContent document={content} />
        {headings.length ? <TableOfContents headings={headings} /> : null}
      </div> : null}
      {project.tags.length ? <div className="site-detail-tags site-project-detail-tags">{project.tags.map((tag) => <span className="site-chip" key={tag}>{tag}</span>)}</div> : null}
    </article>
  );
}
