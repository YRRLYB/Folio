import type { Metadata } from "next";
import { connection } from "next/server";
import { getSiteConfig, listPublishedProjects } from "@/lib/server/content";
import { safeSiteUrl } from "@/lib/site-url";
import { EmptyContent } from "@/components/site/ContentList";
import { SiteTransferButton } from "@/components/site/SiteTransferButton";
import { Reveal } from "@/components/site/Reveal";
import styles from "./portal.module.css";

export const metadata: Metadata = { title: "传送门", description: "社交链接与在线服务入口。" };

function destinationKey(value: string) {
  return value.replace(/\/$/, "");
}

function addressLabel(value: string) {
  return value.replace(/^https?:\/\//, "").replace(/^mailto:/, "").replace(/\/$/, "");
}

export default async function PortalPage() {
  await connection();
  const [config, projects] = await Promise.all([getSiteConfig(), listPublishedProjects()]);
  const destinations = new Set<string>();
  const services: { id: string; label: string; url: string }[] = [];
  const accounts: typeof services = [];

  for (const item of config.social.filter((item) => item.visible).sort((a, b) => a.order - b.order)) {
    const url = safeSiteUrl(item.url, true);
    if (!url) continue;
    destinations.add(destinationKey(url));
    (item.kind === "link" ? services : accounts).push({ id: item.id, label: item.label, url });
  }

  for (const project of projects) {
    const url = safeSiteUrl(project.demoUrl ?? undefined);
    if (!url || url.startsWith("/") || destinations.has(destinationKey(url))) continue;
    destinations.add(destinationKey(url));
    services.push({ id: project.id, label: project.title, url });
  }

  const sections = [
    { id: "accounts", title: "在这里找到我", links: accounts },
    { id: "services", title: "在线服务", links: services },
  ].filter((section) => section.links.length);

  return (
    <div className="site-container">
      <header className="site-page-intro site-page-intro-tight">
        <h1 className="site-page-title">传送门</h1>
        <p className="site-page-subtitle">网络上的其他落脚点。</p>
      </header>
      <div className={"site-page-content " + styles.columns}>
        {sections.map((section) => <section key={section.id} aria-labelledby={"portal-" + section.id}>
          <h2 id={"portal-" + section.id} className={styles.heading}>{section.title}</h2>
          <Reveal className={styles.links}>
            {section.links.map((item) => <SiteTransferButton key={item.id} href={item.url} label={item.label} description={addressLabel(item.url)} variant="row" />)}
          </Reveal>
        </section>)}
        {!sections.length ? <EmptyContent title="暂无公开入口" description="新的联系方式与服务会出现在这里。" /> : null}
      </div>
    </div>
  );
}
