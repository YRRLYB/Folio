"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";

export function SiteDocument() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("site-qq-browser", /(?:M?QQBrowser)/i.test(navigator.userAgent));
    root.classList.add("site-document");
    document.body.classList.add("site-document");
    root.classList.toggle("site-home-document", pathname === "/");
    return () => {
      root.classList.remove("site-document", "site-home-document");
      root.classList.remove("site-qq-browser");
      document.body.classList.remove("site-document");
    };
  }, [pathname]);

  return null;
}
