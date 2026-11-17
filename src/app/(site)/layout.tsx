import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { cookies } from "next/headers";
import { getSiteConfig } from "@/lib/server/content";
import { SiteEntrance } from "@/components/site/SiteEntrance";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNavigation } from "@/components/site/SiteNavigation";
import { SiteDocument } from "@/components/site/SiteDocument";
import { themeAccents } from "@/lib/theme";
import "./site.css";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const config = await getSiteConfig();
  return {
    title: { default: config.site.title, template: "%s · " + config.site.title },
    description: config.site.description,
    applicationName: config.site.title,
    openGraph: {
      type: "website",
      locale: "zh_CN",
      siteName: config.site.title,
      title: config.site.title,
      description: config.site.description,
      images: [{ url: config.site.avatar, width: 640, height: 640, alt: config.site.name + " 的头像" }],
    },
    twitter: { card: "summary", title: config.site.title, description: config.site.description, images: [config.site.avatar] },
  };
}

export default async function SiteLayout({ children }: { children: ReactNode }) {
  await connection();
  const [config, cookieStore] = await Promise.all([getSiteConfig(), cookies()]);
  const preference = cookieStore.get("site-theme")?.value;
  const theme = preference === "light" || preference === "dark" || preference === "system" ? preference : config.theme.mode;
  const accents = themeAccents(config.theme.accent);
  const style = {
    "--site-accent-light": accents.light,
    "--site-accent-dark": accents.dark,
    "--site-radius": config.theme.radius + "px",
  } as CSSProperties;

  return (
    <div className="site-shell" data-theme={theme} data-font={config.theme.font} data-background-active={config.background.type !== "none"} data-background-overlay={config.background.overlay ? "on" : "off"} style={style}>
      <noscript><style>{"[data-site-entrance] { display: none !important; }"}</style></noscript>
      <SiteDocument />
      <SiteEntrance background={config.background} name={config.site.name} />
      <SiteNavigation name={config.site.name} items={config.navigation} theme={theme} />
      {children}
      {config.homepage.footer?.enabled !== false && <SiteFooter config={config} />}
    </div>
  );
}
