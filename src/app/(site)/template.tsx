"use client";

import { useLayoutEffect, type ReactNode } from "react";

export default function SiteTemplate({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    // Reset only explicit link navigation. Browser back/forward can keep its
    // restored position, and links with a fragment keep their anchor target.
    if (document.documentElement.dataset.routeScrollTop) {
      window.scrollTo({ top: 0, behavior: "instant" });
      delete document.documentElement.dataset.routeScrollTop;
    }
  }, []);

  return <main id="main-content" className="site-page-enter">{children}</main>;
}
