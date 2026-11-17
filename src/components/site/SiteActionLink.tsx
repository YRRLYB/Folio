import type { ReactNode } from "react";
import { isSiteMediaUrl, safeSiteUrl } from "@/lib/site-url";
import { RouteLink } from "./RouteLink";

export function SiteActionLink({ href, className, children }: { href: string | undefined; className?: string; children: ReactNode }) {
  const url = safeSiteUrl(href, true);
  if (!url) return null;
  if (url.startsWith("/") && !isSiteMediaUrl(url)) return <RouteLink href={url} className={className}>{children}</RouteLink>;
  return <a href={url} className={className} target={url.startsWith("mailto:") ? undefined : "_blank"} rel={url.startsWith("mailto:") ? undefined : "noopener noreferrer"}>{children}</a>;
}
