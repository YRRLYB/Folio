import { RouteLink } from "@/components/site/RouteLink";

export default function SiteNotFound() {
  return <div className="site-container site-loading-page"><span className="site-kicker">404</span><h1 className="site-page-title">这里没有内容<span className="site-accent">.</span></h1><p className="site-page-subtitle">页面可能已经移动，或者尚未发布。</p><RouteLink href="/" className="site-primary-link" style={{ marginTop: 32 }}>返回首页 <span aria-hidden="true">↗</span></RouteLink></div>;
}
