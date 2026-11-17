import type { CSSProperties, ReactNode } from "react";
import type { GithubData, HomeSection, Post, Project, SiteConfig } from "@/lib/types";
import { safeSiteUrl } from "@/lib/site-url";
import { PostRow, ProjectCard, SectionHeading } from "@/components/site/ContentList";
import { Reveal } from "@/components/site/Reveal";
import { SiteAvatar } from "@/components/site/SiteAvatar";
import { SiteTransferButton } from "@/components/site/SiteTransferButton";
import { SiteMediaImage } from "@/components/site/SiteMediaImage";
import { ContributionGraph } from "@/components/site/ContributionGraph";
import { HomeScroll } from "@/components/site/HomeScroll";
import styles from "./home-sections.module.css";
import githubStyles from "./home-github.module.css";

export function homeSectionStyle(section: HomeSection | undefined): CSSProperties | undefined {
  const color = section?.backgroundColor;
  if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) return undefined;
  const channels = [1, 3, 5].map((offset) => parseInt(color.slice(offset, offset + 2), 16) / 255);
  const luminance = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  const dark = luminance[0] * 0.2126 + luminance[1] * 0.7152 + luminance[2] * 0.0722 < 0.179;
  return dark ? {
    backgroundColor: color,
    "--site-bg": color, "--site-ink": "#ffffff", "--site-muted": "#ffffff", "--site-accent": "#ffffff", "--site-line": "#aab5af", "--site-surface": "#33413a",
  } as CSSProperties : {
    backgroundColor: color,
    "--site-bg": color, "--site-ink": "#000000", "--site-muted": "#000000", "--site-accent": "#000000", "--site-line": "#66736d", "--site-surface": "#e9edeb",
  } as CSSProperties;
}

export function HomeBackdrop({ section }: { section: HomeSection | undefined }) {
  const url = safeSiteUrl(section?.backgroundImage);
  return url ? <SiteMediaImage className={styles.backdrop} src={url} alt="" aria-hidden="true" loading="lazy" /> : null;
}

function SectionImage({ section, compact = false }: { section: HomeSection | undefined; compact?: boolean }) {
  const url = safeSiteUrl(section?.image);
  return url ? <SiteMediaImage className={compact ? styles.compactImage : styles.wideImage} src={url} alt={(section?.title || "区块") + "配图"} loading="lazy" /> : null;
}

export function HomeSections({ config, posts, projects, github }: { config: SiteConfig; posts: Post[]; projects: Project[]; github: GithubData | null }) {
  const featured = projects.filter((project) => project.featured);
  const showcased = (featured.length ? featured : projects).slice(0, 3);
  const sections = Object.entries(config.homepage)
    .filter(([key, section]) => section.enabled && !["footer", "portal"].includes(key) && (key !== "posts" || posts.length > 0) && (key !== "github" || config.github.username))
    .sort((a, b) => {
      if (a[0] === "hero") return -1;
      if (b[0] === "hero") return 1;
      return a[1].order - b[1].order;
    });

  const content: Record<string, ReactNode> = {
    hero: <Hero config={config} />,
    about: (
      <section className="site-section site-home-about" aria-labelledby="home-about-title">
        <div className="site-container">
          <SectionHeading id="home-about-title" title={config.homepage.about?.title || "关于我"} description={config.homepage.about?.description} href={config.homepage.about?.linkHref || "/about"} linkText={config.homepage.about?.linkLabel || "更多关于我"} />
          <SectionImage section={config.homepage.about} />
        </div>
      </section>
    ),
    projects: (
      <section className="site-section site-home-projects" aria-labelledby="home-projects-title">
        <div className="site-container">
          <SectionHeading id="home-projects-title" title={config.homepage.projects?.title || "项目"} description={config.homepage.projects?.description} href={config.homepage.projects?.linkHref || "/projects"} linkText={config.homepage.projects?.linkLabel || "全部项目"} />
          <SectionImage section={config.homepage.projects} />
          {showcased.length ? <div className="site-project-list site-home-project-list">{showcased.map((project, index) => <ProjectCard key={project.id} project={project} featured={index === 0} compact={index > 0} />)}</div> : null}
        </div>
      </section>
    ),
    github: config.github.username ? (
      <section className="site-section site-home-github" aria-labelledby="home-github-title">
        <div className="site-container">
          <SectionHeading id="home-github-title" title={config.homepage.github?.title || "GitHub"} description={config.homepage.github?.description} href={config.homepage.github?.linkHref || "/github"} linkText={config.homepage.github?.linkLabel || "查看动态"} />
          <SectionImage section={config.homepage.github} />
          <div className={githubStyles.graph}><ContributionGraph contributions={github?.contributions ?? []} total={github?.contributionTotal ?? null} /></div>
        </div>
      </section>
    ) : null,
    posts: (
      <section className="site-section site-home-posts" aria-labelledby="home-posts-title">
        <div className="site-container">
          <SectionHeading id="home-posts-title" title={config.homepage.posts?.title || "文章"} description={config.homepage.posts?.description} href={config.homepage.posts?.linkHref || "/posts"} linkText={config.homepage.posts?.linkLabel || "全部文章"} />
          <SectionImage section={config.homepage.posts} />
          <div className="site-post-list">{posts.slice(0, 3).map((post) => <PostRow key={post.id} post={post} />)}</div>
        </div>
      </section>
    ),
    portal: (
      <section className="site-home-portal" aria-labelledby="home-portal-title" style={homeSectionStyle(config.homepage.portal)}>
        <HomeBackdrop section={config.homepage.portal} />
        <div className="site-container site-home-portal-inner">
          <div><SectionImage section={config.homepage.portal} compact /><h2 id="home-portal-title">{config.homepage.portal?.title || "其他入口"}</h2>{config.homepage.portal?.description ? <p>{config.homepage.portal.description}</p> : null}</div>
          <SiteTransferButton href={config.homepage.portal?.linkHref || "/portal"} label={config.homepage.portal?.linkLabel || "传送门"} />
        </div>
      </section>
    ),
  };

  const panels = sections.filter(([key]) => content[key]);
  // The portal still needs a home when every other section is switched off.
  if (!panels.length && config.homepage.portal?.enabled) panels.push(["portal", config.homepage.portal]);

  return <HomeScroll>{panels.map(([key, section], index) => (
    <div className="site-home-panel" id={"home-" + key} key={key} tabIndex={-1} data-home-section={key}>
      <div className={styles.surface} style={key === "portal" ? undefined : homeSectionStyle(section)}>
        {key !== "portal" ? <HomeBackdrop section={section} /> : null}
        {key === "hero" && safeSiteUrl(section.image) ? <SiteMediaImage className={styles.heroImage} src={safeSiteUrl(section.image)!} alt="" aria-hidden="true" /> : null}
        <Reveal className={styles.panelBody} motion={section.motion ?? (["projects", "github", "posts"].includes(key) ? "rise" : "none")}>
          {content[key]}
        </Reveal>
        {index === panels.length - 1 && key !== "portal" && config.homepage.portal?.enabled ? content.portal : null}
        <PanelNavigation previous={panels[index - 1]?.[0]} next={panels[index + 1]?.[0]} />
      </div>
    </div>
  ))}</HomeScroll>;
}

function PanelNavigation({ previous, next }: { previous?: string; next?: string }) {
  if (!previous && !next) return null;
  return (
    <nav className="site-home-navigation site-container" aria-label="首页分屏导航">
      {previous ? <a className="site-scroll-cue" href={"#home-" + previous} data-home-target={"home-" + previous} data-direction="up" aria-label="向上滑动，返回上一屏"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20V4m-6 6 6-6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg><span>向上滑动</span></a> : null}
      {next ? <a className="site-scroll-cue" href={"#home-" + next} data-home-target={"home-" + next} data-direction="down" aria-label="向下滑动，进入下一屏"><span>向下滑动</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v16m-6-6 6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></a> : null}
    </nav>
  );
}

function Hero({ config }: { config: SiteConfig }) {
  const title = config.homepage.hero?.title || config.site.name;
  const description = config.homepage.hero?.description || config.site.bio || config.site.tagline;
  return (
    <section className="site-hero site-container" aria-label="个人介绍">
      <div className="site-hero-topline">
        <SiteAvatar src={config.site.avatar} name={config.site.name} size={Math.max(68, Math.min(104, config.site.avatarSize))} shape={config.site.avatarShape} className="site-hero-avatar" />
        <span className="site-hero-status"><span className="site-status-dot" aria-hidden="true" />{config.site.status || config.site.name}</span>
      </div>
      <div className="site-hero-main">
        <h1>{title}<span className="site-hero-period" aria-hidden="true">.</span></h1>
        <div className="site-hero-intro"><p className="site-hero-lead">{description}</p><p className="site-hero-caption">{config.site.tagline}</p></div>
      </div>
      <div className="site-hero-bottom">
        <span>{config.site.focus.slice(0, 3).join(" · ")}{config.site.interests[1] ? " · " + config.site.interests[1] : ""}</span>
        <div className="site-hero-actions"><SiteTransferButton href={config.homepage.hero?.linkHref || "/projects"} label={config.homepage.hero?.linkLabel || "看项目"} variant="primary" /><SiteTransferButton href={config.homepage.portal?.linkHref || "/portal"} label={config.homepage.portal?.linkLabel || "找我"} variant="quiet" /></div>
      </div>
    </section>
  );
}
