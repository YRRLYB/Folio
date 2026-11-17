"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { NavItem } from "@/lib/types";
import { RouteLink } from "./RouteLink";
import { ThemeSwitcher, type ThemeMode } from "./ThemeSwitcher";

interface Props {
  name: string;
  items: NavItem[];
  theme: ThemeMode;
  preview?: boolean;
}

export function SiteNavigation({ name, items, theme, preview = false }: Props) {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const navigation = items.filter((item) => item.visible).sort((a, b) => a.order - b.order);
  const isCurrent = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href + "/"));

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpenPath(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <header className="site-header">
      <div className="site-header-inner site-container">
        <RouteLink href="/" className="site-brand" aria-label={name + "，返回首页"}>
          <span>{name}</span>
        </RouteLink>
        <nav className="site-desktop-nav" aria-label="主导航">
          {navigation.map((item) => (
            item.external ? (
              <a key={item.id} href={item.href} target="_blank" rel="noopener noreferrer" className="site-nav-link">
                {item.label}<span className="site-external-mark" aria-hidden="true">↗</span>
              </a>
            ) : (
              <RouteLink key={item.id} href={item.href} className="site-nav-link" aria-current={isCurrent(item.href) ? "page" : undefined}>
                {item.label}
              </RouteLink>
            )
          ))}
        </nav>
        <ThemeSwitcher key={theme} initialMode={theme} preview={preview} />
        <button className="site-menu-toggle" type="button" aria-expanded={open} aria-controls="site-mobile-menu" aria-label={open ? "关闭导航菜单" : "打开导航菜单"} onClick={() => setOpenPath(open ? null : pathname)}>
          <span /><span />
        </button>
      </div>
      <nav id="site-mobile-menu" className={"site-mobile-menu" + (open ? " is-open" : "")} aria-label="移动端导航" inert={!open}>
        <div className="site-container site-mobile-menu-inner">
          {navigation.map((item) => (
            item.external ? (
              <a key={item.id} href={item.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpenPath(null)}>
                {item.label}<span aria-hidden="true">↗</span>
              </a>
            ) : (
              <RouteLink key={item.id} href={item.href} aria-current={isCurrent(item.href) ? "page" : undefined} onClick={() => setOpenPath(null)}>
                {item.label}
              </RouteLink>
            )
          ))}
        </div>
      </nav>
    </header>
  );
}
