"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { GithubData, Post, Project, SiteConfig } from "@/lib/types";
import { BackgroundScene } from "@/components/site/BackgroundScene";
import { HomeSections } from "@/components/site/HomeSections";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNavigation } from "@/components/site/SiteNavigation";
import { themeAccents } from "@/lib/theme";

export function StudioSitePreview({ initialConfig, posts, projects, github }: { initialConfig: SiteConfig; posts: Post[]; projects: Project[]; github: GithubData | null }) {
  const [config, setConfig] = useState(initialConfig);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const data: unknown = event.data;
      if (!data || typeof data !== "object" || !("type" in data) || data.type !== "studio-preview-config" || !("config" in data)) return;
      setConfig(data.config as SiteConfig);
    };
    window.addEventListener("message", receive);
    window.parent.postMessage({ type: "studio-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", receive);
  }, []);

  const accents = themeAccents(config.theme.accent);
  const style = { "--site-accent-light": accents.light, "--site-accent-dark": accents.dark, "--site-radius": config.theme.radius + "px" } as CSSProperties;
  return <div className="site-shell" data-theme={config.theme.mode} data-font={config.theme.font} data-background-active={config.background.type !== "none"} data-background-overlay={config.background.overlay ? "on" : "off"} style={style} onClickCapture={(event) => { if (event.target instanceof Element && event.target.closest("a")) event.preventDefault(); }}>
    <BackgroundScene background={config.background} />
    <SiteNavigation name={config.site.name} items={config.navigation} theme={config.theme.mode} preview />
    <main id="main-content" className="site-page-enter"><HomeSections config={config} posts={posts} projects={projects} github={config.github.username === initialConfig.github.username ? github : null} /></main>
    {config.homepage.footer?.enabled !== false && <SiteFooter config={config} />}
  </div>;
}
