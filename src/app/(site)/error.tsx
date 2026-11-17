"use client";

import { useEffect } from "react";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <div className="site-container site-loading-page"><span className="site-kicker">Something went wrong</span><h1 className="site-page-title">页面暂时无法显示<span className="site-accent">.</span></h1><p className="site-page-subtitle">请稍后重试。</p><button type="button" className="site-primary-link" style={{ border: 0, cursor: "pointer", marginTop: 32 }} onClick={reset}>重新加载 <span aria-hidden="true">↗</span></button></div>;
}
