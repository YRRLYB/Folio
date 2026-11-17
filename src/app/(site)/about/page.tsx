import type { Metadata } from "next";
import { connection } from "next/server";
import { getPublicPage, getSiteConfig } from "@/lib/server/content";
import { RichContent } from "@/components/site/RichContent";
import { SiteTransferButton } from "@/components/site/SiteTransferButton";
import { Reveal } from "@/components/site/Reveal";
import { SiteAvatar } from "@/components/site/SiteAvatar";
import styles from "./about.module.css";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const [config, page] = await Promise.all([getSiteConfig(), getPublicPage("about")]);
  return { title: page?.title || "关于", description: page?.description || `关于 ${config.site.name}。` };
}

export default async function AboutPage() {
  await connection();
  const [config, page] = await Promise.all([getSiteConfig(), getPublicPage("about")]);
  return (
    <div className={"site-container " + styles.page}>
      <header className={styles.intro}>
        <div className={styles.identity}>
          <SiteAvatar src={config.site.avatar} name={config.site.name} size={Math.min(112, config.site.avatarSize)} shape={config.site.avatarShape} className={styles.avatar} />
          <div className={styles.heading}>
            <h1 className="site-page-title">{page?.title || "关于"}</h1>
            <p className={styles.name}>{config.site.name}</p>
            {config.site.status ? <p className={styles.status}><span className="site-status-dot" aria-hidden="true" />{config.site.status}</p> : null}
          </div>
        </div>
        {page?.description ? <p className="site-page-subtitle">{page.description}</p> : null}
      </header>
      <Reveal className={styles.content}>
        {config.site.bio ? <p className={styles.lead}>{config.site.bio}</p> : null}
        {page?.content.content?.length ? <RichContent document={page.content} className={styles.body} /> : null}
        {config.site.focus.length || config.site.interests.length ? <div className={styles.details}>
          {config.site.focus.length ? <section><h2>关注方向</h2><ul>{config.site.focus.map((item) => <li key={item}>{item}</li>)}</ul></section> : null}
          {config.site.interests.length ? <section><h2>日常兴趣</h2><ul>{config.site.interests.map((item) => <li key={item}>{item}</li>)}</ul></section> : null}
        </div> : null}
        <SiteTransferButton href="/portal">来打个招呼</SiteTransferButton>
      </Reveal>
    </div>
  );
}
