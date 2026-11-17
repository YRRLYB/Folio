"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ExternalLink, FileText, FolderKanban, ImageIcon, LayoutGrid, LogOut, Menu, Plus, Settings2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import type { Post, Project, SiteConfig, SitePage } from "@/lib/types";
import { ContentWorkspace, type Resource } from "./ContentWorkspace";
import { CommentsWorkspace } from "./CommentsWorkspace";
import { AuthenticationWorkspace } from "./AuthenticationWorkspace";
import { MediaWorkspace } from "./MediaWorkspace";
import { TaxonomyWorkspace } from "./TaxonomyWorkspace";
import { WebsiteWorkspace, type WebsiteSection } from "./WebsiteWorkspace";
import { readableDate, studioRequest } from "./client";
import styles from "./studio.module.css";

type Tab = "overview" | Resource | "media" | "taxonomy" | "comments" | "authentication" | WebsiteSection;
type Counts = { total: number; draft: number; published: number; archived: number };
type Overview = { posts: Counts; projects: Counts; pages: Counts; media: number };
const groups: { name: string; tabs: { id: Tab; label: string }[] }[] = [
  { name: "工作台", tabs: [{ id: "overview", label: "总览" }] },
  { name: "内容", tabs: [{ id: "posts", label: "文章" }, { id: "comments", label: "评论" }, { id: "projects", label: "项目" }, { id: "pages", label: "页面" }, { id: "taxonomy", label: "分类标签" }, { id: "media", label: "媒体" }] },
  { name: "网站", tabs: [{ id: "homepage", label: "首页" }, { id: "appearance", label: "外观" }, { id: "navigation", label: "导航" }, { id: "social", label: "社交" }, { id: "github", label: "GitHub" }] },
  { name: "系统", tabs: [{ id: "authentication", label: "账户安全" }] },
];
const allTabs = groups.flatMap((group) => group.tabs.map((item) => item.id));

async function getOverviewData() {
  const [counts, settings, posts, projects, pages] = await Promise.all([
    studioRequest<Overview>("overview"), studioRequest<SiteConfig>("settings"),
    studioRequest<Post[]>("posts"), studioRequest<Project[]>("projects"), studioRequest<SitePage[]>("pages"),
  ]);
  const recent = [
    ...posts.map((item) => ({ kind: "posts" as const, item })),
    ...projects.map((item) => ({ kind: "projects" as const, item })),
    ...pages.map((item) => ({ kind: "pages" as const, item })),
  ].sort((a, b) => new Date(b.item.updatedAt).getTime() - new Date(a.item.updatedAt).getTime()).slice(0, 5);
  return { counts, settings, recent };
}

export function StudioApp() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const tabRef = useRef<Tab>("overview");
  const dirtyRef = useRef(false);
  const createSerial = useRef(0);
  const reportDirty = useCallback((dirty: boolean) => { dirtyRef.current = dirty; }, []);
  const [createIntent, setCreateIntent] = useState<{ resource: Resource; token: number } | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [authError, setAuthError] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [recent, setRecent] = useState<{ kind: Resource; item: Post | Project | SitePage }[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true); setOverviewError("");
    try {
      const { counts, settings, recent } = await getOverviewData();
      setOverview(counts); setConfig(settings);
      setRecent(recent);
    } catch (caught) { setOverviewError(caught instanceof Error ? caught.message : "工作台加载失败"); }
    finally { setOverviewLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    void getOverviewData()
      .then(({ counts, settings, recent }) => { if (active) { setOverview(counts); setConfig(settings); setRecent(recent); } })
      .catch((caught) => { if (active) setOverviewError(caught instanceof Error ? caught.message : "工作台加载失败"); })
      .finally(() => { if (active) setOverviewLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const readTab = () => {
      const value = new URLSearchParams(window.location.search).get("tab") as Tab | null;
      const requested = value && allTabs.includes(value) ? value : "overview";
      if (requested !== tabRef.current && dirtyRef.current && !window.confirm("有尚未保存的修改，确定离开吗？")) {
        const url = new URL(window.location.href);
        if (tabRef.current === "overview") url.searchParams.delete("tab"); else url.searchParams.set("tab", tabRef.current);
        window.history.pushState({}, "", url.pathname + url.search);
        return;
      }
      tabRef.current = requested; dirtyRef.current = false; setTab(requested);
    };
    readTab(); window.addEventListener("popstate", readTab); return () => window.removeEventListener("popstate", readTab);
  }, []);
  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => { if (dirtyRef.current) { event.preventDefault(); event.returnValue = ""; } };
    const guardLink = (event: MouseEvent) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      const link = target instanceof Element ? target.closest("a[href]") : null;
      if (!link || link.getAttribute("target") === "_blank" || !link.closest("main")) return;
      if (dirtyRef.current && !window.confirm("有尚未保存的修改，确定离开吗？")) {
        event.preventDefault(); event.stopPropagation();
      } else dirtyRef.current = false;
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    document.addEventListener("click", guardLink, true);
    return () => { window.removeEventListener("beforeunload", warnBeforeLeaving); document.removeEventListener("click", guardLink, true); };
  }, []);
  const switchTab = (next: Tab) => {
    if (next === tab) { setMobileMenu(false); return true; }
    if (dirtyRef.current && !window.confirm("有尚未保存的修改，确定离开吗？")) return false;
    dirtyRef.current = false; tabRef.current = next;
    setTab(next); setMobileMenu(false); setCreateIntent(null);
    const url = new URL(window.location.href); if (next === "overview") url.searchParams.delete("tab"); else url.searchParams.set("tab", next);
    window.history.pushState({}, "", url.pathname + url.search);
    if (next === "overview") void loadOverview();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
  };
  const create = (next: Resource) => {
    if (next === tab && dirtyRef.current && !window.confirm("有尚未保存的修改，确定新建内容吗？")) return;
    if (next === tab) dirtyRef.current = false;
    if (switchTab(next)) { createSerial.current += 1; setCreateIntent({ resource: next, token: createSerial.current }); }
  };
  const signOut = async () => {
    if (dirtyRef.current && !window.confirm("有尚未保存的修改，确定退出吗？")) return;
    setAuthError("");
    try { const result = await authClient.signOut(); if (result.error) throw new Error(result.error.message || "退出失败"); router.replace("/studio/login"); router.refresh(); }
    catch (caught) { setAuthError(caught instanceof Error ? caught.message : "退出失败"); }
  };
  const contentTab = tab === "posts" || tab === "projects" || tab === "pages";
  const websiteTab = tab === "homepage" || tab === "appearance" || tab === "navigation" || tab === "social" || tab === "github";

  return <main id="main-content" className={styles.studioShell}>
    <header className={styles.shellHeader}><div className={styles.topLine}><Link className={styles.brand} href="/studio"><span className={styles.brandMark}>B<span>.</span></span><span className={styles.brandText}><strong>Your Blog</strong><small>Studio</small></span></Link><div className={styles.topActions}><span className={styles.ownerBadge}><span /> 创作工作室</span><Link className={styles.siteLink} href="/" target="_blank">查看网站 <ExternalLink size={15} /></Link><button type="button" className={styles.signOut} title="退出登录" aria-label="退出登录" onClick={() => void signOut()}><LogOut size={18} /></button><button type="button" className={styles.mobileMenuButton} aria-label="打开导航" aria-expanded={mobileMenu} onClick={() => setMobileMenu((open) => !open)}><Menu size={20} /></button></div></div>
      <nav className={[styles.topNav, mobileMenu ? styles.topNavOpen : ""].join(" ")} aria-label="Studio 导航">{groups.map((group) => <div className={styles.navGroup} key={group.name}><span className={styles.navGroupLabel}>{group.name}</span>{group.tabs.map((item) => <button type="button" className={[styles.navItem, tab === item.id ? styles.navItemActive : ""].join(" ")} key={item.id} aria-current={tab === item.id ? "page" : undefined} onClick={() => switchTab(item.id)}>{item.label}</button>)}</div>)}</nav></header>
    {authError && <div className={styles.errorNotice} role="alert">{authError}</div>}
    <div className={styles.shellBody}>
      {tab === "overview" && <section className={styles.workspace}><div className={styles.overviewHero}><div><span className={styles.eyebrow}>YOUR PERSONAL SPACE</span><h1>欢迎回来，{config?.site.name ?? "Your Blog"}<span className={styles.heroPeriod}>.</span></h1><p>你的内容与网站，都在这里。</p><div className={styles.heroActions}><button type="button" className={styles.primaryButton} onClick={() => create("posts")}><Plus size={17} /> 写一篇文章</button><button type="button" className={styles.secondaryButton} onClick={() => switchTab("homepage")}>编辑首页 <ArrowRight size={16} /></button></div></div><div className={styles.heroDecoration}><span className={styles.heroDecorationLine} /><span className={styles.heroDecorationLabel}>CREATE<br />CURATE<br />PUBLISH</span></div></div>
        {overviewError && <div className={styles.errorNotice} role="alert">{overviewError} <button type="button" onClick={() => void loadOverview()}>重试</button></div>}
        <div className={styles.metricStrip}>{[{ label: "文章", value: overview?.posts.total, detail: (overview?.posts.published ?? 0) + " 篇已发布", icon: FileText, target: "posts" as Tab }, { label: "项目", value: overview?.projects.total, detail: (overview?.projects.published ?? 0) + " 个已展示", icon: FolderKanban, target: "projects" as Tab }, { label: "页面", value: overview?.pages.total, detail: (overview?.pages.published ?? 0) + " 个已上线", icon: LayoutGrid, target: "pages" as Tab }, { label: "媒体资源", value: overview?.media, detail: "图片与视频", icon: ImageIcon, target: "media" as Tab }].map((metric) => <button type="button" className={styles.metric} key={metric.label} onClick={() => switchTab(metric.target)}><span className={styles.metricTop}><span>{metric.label}</span><metric.icon size={17} /></span><strong>{overviewLoading ? "—" : (metric.value ?? 0).toString().padStart(2, "0")}</strong><small>{metric.detail}</small></button>)}</div>
        <div className={styles.overviewLower}><div className={styles.recentBlock}><div className={styles.subsectionHeader}><div><span className={styles.eyebrow}>RECENT ACTIVITY</span><h2>最近更新</h2></div><button type="button" className={styles.textButton} onClick={() => switchTab("posts")}>查看内容 <ArrowRight size={15} /></button></div>{overviewLoading ? <div className={styles.skeletonRows}><i /><i /><i /></div> : recent.length ? <div className={styles.recentList}>{recent.map(({ kind, item }) => <button type="button" key={kind + item.id} onClick={() => switchTab(kind)}><span className={styles.recentKind}>{kind === "posts" ? "文章" : kind === "projects" ? "项目" : "页面"}</span><span className={styles.recentText}><strong>{item.title}</strong><small>{readableDate(item.updatedAt)}</small></span><span className={[styles.statusPill, styles[item.status]].join(" ")}>{item.status === "published" ? "已发布" : item.status === "archived" ? "已归档" : "草稿"}</span><ArrowRight size={16} /></button>)}</div> : <div className={styles.recentEmpty}>还没有内容。写下第一篇文章，或者添加一个项目。</div>}</div><div className={styles.quickBlock}><span className={styles.eyebrow}>QUICK ACCESS</span><h2>继续创作</h2><button type="button" onClick={() => create("posts")}><FileText size={18} /><span>新建文章<small>记录想法与过程</small></span><ArrowRight size={17} /></button><button type="button" onClick={() => create("projects")}><FolderKanban size={18} /><span>添加项目<small>展示你的作品</small></span><ArrowRight size={17} /></button><button type="button" onClick={() => switchTab("appearance")}><Settings2 size={18} /><span>调整外观<small>更新站点身份与主题</small></span><ArrowRight size={17} /></button><button type="button" onClick={() => switchTab("media")}><ImageIcon size={18} /><span>管理媒体<small>上传头像与背景</small></span><ArrowRight size={17} /></button></div></div>
      </section>}
      {contentTab && <ContentWorkspace key={tab + ":" + (createIntent?.resource === tab ? createIntent.token : 0)} resource={tab as Resource} createToken={createIntent?.resource === tab ? createIntent.token : 0} onDirtyChange={reportDirty} />}
      {tab === "media" && <MediaWorkspace />}
      {tab === "comments" && <CommentsWorkspace />}
      {tab === "taxonomy" && <TaxonomyWorkspace />}
      {tab === "authentication" && <AuthenticationWorkspace />}
      {websiteTab && <WebsiteWorkspace key={tab} section={tab as WebsiteSection} onOpenMedia={() => switchTab("media")} onDirtyChange={reportDirty} />}
    </div>
    <footer className={styles.shellFooter}><span>Your Blog Studio</span><span>让每一次发布都更自在。</span><Link href="/">返回网站 <ArrowRight size={14} /></Link></footer>
  </main>;
}
