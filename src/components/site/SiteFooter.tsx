import type { SiteConfig } from "@/lib/types";
import { isSiteMediaUrl, safeSiteUrl } from "@/lib/site-url";
import { HomeBackdrop, homeSectionStyle } from "./HomeSections";
import { Reveal } from "./Reveal";
import { SiteActionLink } from "./SiteActionLink";
import styles from "./home-sections.module.css";

export function SiteFooter({ config }: { config: SiteConfig }) {
  const socials = config.social.filter((item) => item.visible).sort((a, b) => a.order - b.order);
  const section = config.homepage.footer;
  const title = section ? section.title.trim() : "保持联系";
  const description = section?.description.trim();
  const image = safeSiteUrl(section?.image);
  return (
    <footer className={"site-footer " + styles.surface} style={homeSectionStyle(section)}>
      <HomeBackdrop section={section} />
      <Reveal motion={section?.motion ?? "none"}>
      <div className="site-container site-footer-inner">
        <div>
          {image && <img className={styles.footerImage} src={image} alt={(title || config.site.name) + "配图"} loading="lazy" />}
          {title && <div className="site-footer-brand">{title}</div>}
          {description && <p>{description}</p>}
        </div>
        <div className="site-footer-links">
          {section?.linkHref && <SiteActionLink href={section.linkHref}>{section.linkLabel || "了解更多"} ↗</SiteActionLink>}
          {socials.map((item) => <SiteActionLink key={item.id} href={item.url}>{item.label}{!item.url.startsWith("mailto:") && (!item.url.startsWith("/") || isSiteMediaUrl(item.url)) && " ↗"}</SiteActionLink>)}
        </div>
      </div>
      <div className="site-container site-footer-bottom"><span>© {new Date().getFullYear()} {config.site.name}</span></div>
      </Reveal>
    </footer>
  );
}
