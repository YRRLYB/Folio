import type { ReactNode } from "react";
import { isSiteMediaUrl, safeSiteUrl } from "@/lib/site-url";
import { RouteLink } from "./RouteLink";
import styles from "./transfer-button.module.css";

type Props = {
  href: string | undefined;
  children?: ReactNode;
  label?: string;
  description?: string;
  variant?: "primary" | "secondary" | "quiet" | "row";
  direction?: "forward" | "back";
  className?: string;
};

export function SiteTransferButton({ href, children, label, description, variant = "secondary", direction = "forward", className = "" }: Props) {
  const url = safeSiteUrl(href, true);
  if (!url) return null;
  const content = <>
    <span className={styles.copy}><span className={styles.label}>{children ?? label ?? "前往查看"}</span>{description ? <span className={styles.description}>{description}</span> : null}</span>
    <span className={styles.icon} aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none"><path d={direction === "back" ? "M19 12H5m6 6-6-6 6-6" : "M6 18 18 6M6 6h12v12"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
  </>;
  const classes = [styles.button, styles[variant], direction === "back" ? styles.back : "", className].filter(Boolean).join(" ");
  const attributes = { className: classes, "data-transfer-button": variant };
  return url.startsWith("/") && !isSiteMediaUrl(url)
    ? <RouteLink href={url} {...attributes}>{content}</RouteLink>
    : <a href={url} target={url.startsWith("mailto:") ? undefined : "_blank"} rel={url.startsWith("mailto:") ? undefined : "noopener noreferrer"} {...attributes}>{content}</a>;
}
