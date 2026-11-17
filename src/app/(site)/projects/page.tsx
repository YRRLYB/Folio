import type { Metadata } from "next";
import { connection } from "next/server";
import { listPublishedProjects } from "@/lib/server/content";
import { EmptyContent, ProjectCard } from "@/components/site/ContentList";

export const metadata: Metadata = { title: "项目", description: "公开服务与开源项目。" };

export default async function ProjectsPage() {
  await connection();
  const projects = await listPublishedProjects();
  const spotlight = projects.find((project) => project.featured) ?? projects[0];
  const remaining = projects.filter((project) => project.id !== spotlight?.id);

  return (
    <div className="site-container">
      <header className="site-page-intro site-page-intro-tight">
        <h1 className="site-page-title">项目</h1>
        {projects.length ? <p className="site-page-subtitle">{projects.length} 个公开项目</p> : null}
      </header>
      <div className="site-page-content site-projects-index">
        {spotlight ? <>
          <section className="site-project-spotlight" aria-label="重点项目">
            <ProjectCard project={spotlight} featured />
          </section>
          {remaining.length ? <section className="site-project-more" aria-labelledby="more-projects-title">
            <h2 id="more-projects-title" className="site-list-heading">其他项目</h2>
            <div className="site-project-list">
              {remaining.map((project) => <ProjectCard key={project.id} project={project} compact />)}
            </div>
          </section> : null}
        </> : <EmptyContent title="暂无公开项目" description="项目发布后会出现在这里。" />}
      </div>
    </div>
  );
}
