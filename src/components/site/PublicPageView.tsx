import { PHOTO_API_PAGE_ID } from "@/lib/builtin-pages";
import { getPageProjectHref, type PublicPageContent } from "@/lib/server/content";
import { extractHeadings, RichContent, TableOfContents } from "@/components/site/RichContent";
import { SiteBackLink } from "@/components/site/SiteBackLink";

export async function PublicPageView({ page }: { page: PublicPageContent }) {
  const headings = extractHeadings(page.content);
  const projectHref = await getPageProjectHref(page);
  const isPhotoApi = page.id === PHOTO_API_PAGE_ID;
  return <article className="site-container">
    <header className="site-detail-header">
      <SiteBackLink fallbackHref={projectHref ?? (isPhotoApi ? "/projects" : "/portal")}>
        {projectHref || isPhotoApi ? "返回项目" : "返回传送门"}
      </SiteBackLink>
      <span className="site-kicker" style={{ display: "flex", marginTop: 35 }}>{isPhotoApi ? "Image Service" : "Page"}</span>
      <h1 className="site-detail-title">{page.title}</h1>
      {page.description ? <p className="site-detail-lead">{page.description}</p> : null}
    </header>
    <div className={"site-reading-layout" + (headings.length ? "" : " no-toc")}>
      <RichContent document={page.content} />
      <TableOfContents headings={headings} />
    </div>
  </article>;
}
