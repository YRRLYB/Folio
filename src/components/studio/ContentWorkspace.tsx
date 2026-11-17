"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Archive, Check, ChevronRight, Clock3, ExternalLink, Eye, FilePenLine, History, Plus, Search, Trash2, X } from "lucide-react";
import type { ContentStatus, MediaAsset, Post, Project, RichDocument, SitePage, TaxonomyCatalog } from "@/lib/types";
import { RichContent } from "@/components/site/RichContent";
import { BlockEditor } from "./BlockEditor";
import { jsonRequest, readableDate, studioRequest } from "./client";
import styles from "./studio.module.css";
import { publicPageHref, publicPagePath } from "@/lib/builtin-pages";

export type Resource = "posts" | "projects" | "pages";
type ContentItem = Post | Project | SitePage;
type Revision = { id: string; createdAt: string; snapshot: Partial<ContentItem> };
type Draft = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  content: RichDocument;
  coverImage: string;
  category: string;
  tags: string[];
  techStack: string[];
  readingMinutes: number;
  githubUrl: string;
  demoUrl: string;
  projectDate: string;
  projectStatus: string;
  featured: boolean;
  status: ContentStatus;
};

const labels: Record<Resource, { title: string; singular: string; empty: string; publicBase: string }> = {
  posts: { title: "文章", singular: "文章", empty: "写下第一篇文章，让想法有一个安放的地方。", publicBase: "/posts" },
  projects: { title: "项目", singular: "项目", empty: "添加第一个项目，展示你正在创造的事物。", publicBase: "/projects" },
  pages: { title: "页面", singular: "页面", empty: "创建独立页面，补全个人空间的内容。", publicBase: "/pages" },
};
const blankDoc: RichDocument = { type: "doc", content: [{ type: "paragraph" }] };

function toDraft(item?: ContentItem, resource?: Resource): Draft {
  const post = item as Post | undefined;
  const project = item as Project | undefined;
  const page = item as SitePage | undefined;
  return {
    id: item?.id, title: item?.title ?? "", slug: item && resource === "pages" ? publicPagePath(item) : item?.slug ?? "",
    description: post?.excerpt ?? project?.description ?? page?.description ?? "",
    content: item?.content ?? blankDoc,
    coverImage: (post?.coverImage ?? project?.coverImage) || "",
    category: post?.category ?? "", tags: post?.tags ?? project?.tags ?? [],
    techStack: project?.techStack ?? [], readingMinutes: post?.readingMinutes ?? 3,
    githubUrl: project?.githubUrl ?? "", demoUrl: project?.demoUrl ?? "",
    projectDate: project?.projectDate ? project.projectDate.slice(0, 10) : "",
    projectStatus: project?.projectStatus ?? "进行中", featured: (post?.featured ?? project?.featured) || false,
    status: item?.status ?? "draft",
  };
}

function serializeDraft(draft: Draft, resource: Resource, status: ContentStatus) {
  const common = { title: draft.title.trim(), slug: draft.slug.trim() || undefined, content: draft.content, status };
  if (resource === "posts") return { ...common, excerpt: draft.description.trim(), coverImage: draft.coverImage.trim() || null, category: draft.category.trim() || null, tags: draft.tags, readingMinutes: Number(draft.readingMinutes) || 1, featured: draft.featured };
  if (resource === "projects") return { ...common, description: draft.description.trim(), coverImage: draft.coverImage.trim() || null, projectStatus: draft.projectStatus.trim() || "进行中", techStack: draft.techStack, tags: draft.tags, githubUrl: draft.githubUrl.trim() || null, demoUrl: draft.demoUrl.trim() || null, projectDate: draft.projectDate ? new Date(draft.projectDate + "T00:00:00.000Z").toISOString() : null, featured: draft.featured };
  return { ...common, description: draft.description.trim() };
}

export function ContentWorkspace({ resource, createToken = 0, onDirtyChange }: { resource: Resource; createToken?: number; onDirtyChange?: (dirty: boolean) => void }) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [catalog, setCatalog] = useState<TaxonomyCatalog>({ categories: [], tags: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContentStatus | "all">("all");
  const [draft, setDraft] = useState<Draft | null>(() => createToken > 0 ? toDraft() : null);
  const [tagText, setTagText] = useState("");
  const [techText, setTechText] = useState("");
  const [changed, setChanged] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [editorVersion, setEditorVersion] = useState(0);
  const [preview, setPreview] = useState(false);
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [revisionBusy, setRevisionBusy] = useState(false);
  const draftRef = useRef(draft);
  const changedRef = useRef(false);
  const editVersionRef = useRef(0);
  const savedVersionRef = useRef(0);
  const sessionRef = useRef(0);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const manualBusyRef = useRef(false);

  const markChanged = useCallback((value: boolean) => { changedRef.current = value; setChanged(value); }, []);
  const beginDraft = useCallback((next: Draft | null) => {
    sessionRef.current += 1;
    draftRef.current = next;
    setTagText(next?.tags.join(", ") ?? "");
    setTechText(next?.techStack.join(", ") ?? "");
    editVersionRef.current = 0;
    savedVersionRef.current = 0;
    setDraft(next);
    markChanged(false);
    setEditorVersion((value) => value + 1);
  }, [markChanged]);

  useEffect(() => { onDirtyChange?.(changed || busy || autoSaving); }, [changed, busy, autoSaving, onDirtyChange]);

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (changedRef.current || manualBusyRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try { setItems(await studioRequest<ContentItem[]>(resource)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "加载失败"); }
    finally { setLoading(false); }
  }, [resource]);

  useEffect(() => {
    let active = true;
    void studioRequest<ContentItem[]>(resource)
      .then((items) => { if (active) setItems(items); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "加载失败"); })
      .finally(() => { if (active) setLoading(false); });
    void studioRequest<MediaAsset[]>("media")
      .then((items) => { if (active) setAssets(items); })
      .catch(() => { if (active) setAssets([]); });
    if (resource !== "pages") void studioRequest<TaxonomyCatalog>("taxonomy")
      .then((data) => { if (active) setCatalog(data); })
      .catch(() => {});
    return () => { active = false; };
  }, [resource]);

  const autoSave = useCallback((): Promise<boolean> => {
    const session = sessionRef.current;
    const request = async () => {
      const current = draftRef.current;
      if (session !== sessionRef.current || manualBusyRef.current || !changedRef.current || !current?.id || current.status !== "draft" || !current.title.trim()) return true;
      const version = editVersionRef.current;
      setAutoSaving(true);
      try {
        await studioRequest<ContentItem>(`${resource}/${current.id}`, {
          ...jsonRequest("PATCH", serializeDraft(current, resource, "draft")),
          headers: { "X-Studio-Draft-Autosave": "1" },
        });
        if (session === sessionRef.current) {
          savedVersionRef.current = Math.max(savedVersionRef.current, version);
          markChanged(editVersionRef.current > savedVersionRef.current);
          setError("");
          setMessage("草稿已自动保存。");
        }
        return true;
      } catch (caught) {
        if (session === sessionRef.current) setError(caught instanceof Error ? `自动保存失败：${caught.message}` : "自动保存失败，请手动保存");
        return false;
      } finally {
        if (session === sessionRef.current) setAutoSaving(false);
      }
    };
    const queued = saveQueueRef.current.then(request, request);
    saveQueueRef.current = queued.then(() => undefined, () => undefined);
    return queued;
  }, [markChanged, resource]);

  useEffect(() => {
    if (!changed || !draft?.id || draft.status !== "draft" || !draft.title.trim()) return;
    const timer = window.setTimeout(() => { void autoSave(); }, 1500);
    return () => window.clearTimeout(timer);
  }, [autoSave, changed, draft]);

  useEffect(() => {
    const flushWhenHidden = () => { if (document.visibilityState === "hidden") void autoSave(); };
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => document.removeEventListener("visibilitychange", flushWhenHidden);
  }, [autoSave]);

  const filtered = useMemo(() => items.filter((item) => (statusFilter === "all" || item.status === statusFilter) && (item.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()) || item.slug.toLocaleLowerCase().includes(query.toLocaleLowerCase()))), [items, query, statusFilter]);
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    const current = draftRef.current;
    if (!current) return;
    const next = { ...current, [key]: value };
    draftRef.current = next;
    editVersionRef.current += 1;
    setDraft(next);
    markChanged(true);
    setMessage("");
  };
  const openItem = async (item: ContentItem) => {
    setError("");
    try { beginDraft(toDraft(await studioRequest<ContentItem>(`${resource}/${item.id}`), resource)); setMessage(""); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "打开失败"); }
  };
  const closeEditor = async () => {
    if (manualBusyRef.current) return;
    if (changedRef.current && draftRef.current?.id && draftRef.current.status === "draft") {
      await autoSave();
      if (changedRef.current) return;
    }
    if (changedRef.current && !window.confirm("有尚未保存的修改，确定离开吗？")) return;
    beginDraft(null); setPreview(false); setRevisionsOpen(false);
  };
  const save = async (status: ContentStatus) => {
    if (!draftRef.current || manualBusyRef.current) return;
    manualBusyRef.current = true;
    setBusy(true); setError(""); setMessage("");
    try {
      await saveQueueRef.current;
      const current = draftRef.current;
      if (!current) return;
      if (!current.title.trim()) { setError("请先填写标题"); return; }
      const session = sessionRef.current;
      const version = editVersionRef.current;
      const item = await studioRequest<ContentItem>(current.id ? `${resource}/${current.id}` : resource, jsonRequest(current.id ? "PATCH" : "POST", serializeDraft(current, resource, status)));
      if (session !== sessionRef.current) return;
      savedVersionRef.current = Math.max(savedVersionRef.current, version);
      const saved = toDraft(item, resource);
      const next = editVersionRef.current === version ? saved : { ...draftRef.current!, id: item.id, status: item.status, slug: draftRef.current!.slug || item.slug };
      draftRef.current = next;
      setDraft(next);
      if (editVersionRef.current === version) {
        setTagText(saved.tags.join(", "));
        setTechText(saved.techStack.join(", "));
      }
      markChanged(editVersionRef.current > savedVersionRef.current);
      setMessage(status === "published" ? "已发布，公开页面现已更新。" : status === "archived" ? "已归档。" : "草稿已保存。");
      if (resource !== "pages") void studioRequest<TaxonomyCatalog>("taxonomy").then(setCatalog).catch(() => {});
      await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "保存失败"); }
    finally { manualBusyRef.current = false; setBusy(false); }
  };
  const archive = async (item: ContentItem) => {
    if (!window.confirm(`将「${item.title}」归档？`)) return;
    try { await studioRequest(`${resource}/${item.id}`, jsonRequest("PATCH", { status: "archived" })); await refresh(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "归档失败"); }
  };
  const remove = async (item: ContentItem) => {
    if (!window.confirm(`永久删除「${item.title}」？此操作无法撤销。`)) return;
    if (manualBusyRef.current) return;
    manualBusyRef.current = true;
    setBusy(true);
    try { await saveQueueRef.current; await studioRequest(`${resource}/${item.id}`, { method: "DELETE" }); beginDraft(null); await refresh(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "删除失败"); }
    finally { manualBusyRef.current = false; setBusy(false); }
  };
  const showRevisions = async () => {
    if (!draft?.id) return;
    setRevisionBusy(true); setError(""); setRevisionsOpen(true);
    try { setRevisions(await studioRequest<Revision[]>(`${resource}/${draft.id}/revisions`)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "无法读取版本记录"); }
    finally { setRevisionBusy(false); }
  };
  const restore = async (revisionId: string) => {
    if (!draft?.id || !window.confirm(changedRef.current ? "恢复此版本？当前未保存的修改会丢失。" : "恢复此版本？当前内容会保存在新的版本记录中。")) return;
    if (manualBusyRef.current) return;
    manualBusyRef.current = true;
    setBusy(true); setRevisionBusy(true); setError("");
    try {
      await saveQueueRef.current;
      const item = await studioRequest<ContentItem>(`${resource}/${draft.id}/revisions/${revisionId}/restore`, { method: "POST" });
      beginDraft(toDraft(item, resource)); setRevisionsOpen(false); setMessage("版本已恢复。"); await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "恢复失败"); }
    finally { manualBusyRef.current = false; setBusy(false); setRevisionBusy(false); }
  };

  return <section className={styles.workspace}>
    {!draft ? <>
      <div className={styles.sectionHeader}><div><span className={styles.eyebrow}>CONTENT / {resource.toUpperCase()}</span><h1>{labels[resource].title}</h1><p>在这里整理、创作并发布你的{labels[resource].title}。</p></div><button type="button" className={styles.primaryButton} onClick={() => { beginDraft(toDraft()); setError(""); }}><Plus size={17} /> 新建{labels[resource].singular}</button></div>
      <div className={styles.listTools}><label className={styles.searchBox}><Search size={17} /><input aria-label="搜索内容" placeholder="搜索标题或链接…" value={query} onChange={(event) => setQuery(event.target.value)} /></label><div className={styles.filterTabs} role="group" aria-label="按状态筛选">{(["all", "published", "draft", "archived"] as const).map((status) => <button type="button" key={status} aria-pressed={statusFilter === status} onClick={() => setStatusFilter(status)}>{({ all: "全部", published: "已发布", draft: "草稿", archived: "已归档" })[status]}</button>)}</div></div>
      {error && <div className={styles.errorNotice} role="alert">{error} <button type="button" onClick={() => void refresh()}>重试</button></div>}
      {loading ? <div className={styles.skeletonRows}><i /><i /><i /></div> : filtered.length ? <div className={styles.contentList}>{filtered.map((item) => <div className={styles.contentRow} key={item.id}>
        <button type="button" className={styles.rowMain} onClick={() => void openItem(item)}><span className={styles.rowIcon}><FilePenLine size={19} /></span><span className={styles.rowText}><strong>{item.title}</strong><small>{resource === "pages" ? publicPageHref(item) : "/" + item.slug} · 更新于 {readableDate(item.updatedAt)}</small></span></button>
        <span className={`${styles.statusPill} ${styles[item.status]}`}>{({ draft: "草稿", published: "已发布", archived: "已归档" })[item.status]}</span>
        <div className={styles.rowActions}>{item.status === "published" && <a href={resource === "pages" ? publicPageHref(item) : `${labels[resource].publicBase}/${encodeURIComponent(item.slug)}`} target="_blank" rel="noreferrer" title="查看公开页面" aria-label={`查看${item.title}`}><ExternalLink size={17} /></a>}<button type="button" title="归档" aria-label={`归档${item.title}`} onClick={() => void archive(item)}><Archive size={17} /></button><button type="button" title="删除" aria-label={`删除${item.title}`} onClick={() => void remove(item)}><Trash2 size={17} /></button><button type="button" title="编辑" aria-label={`编辑${item.title}`} onClick={() => void openItem(item)}><ChevronRight size={18} /></button></div>
      </div>)}</div> : <div className={styles.emptyState}><div className={styles.emptyIcon}><FilePenLine size={24} /></div><h2>{query || statusFilter !== "all" ? "没有匹配的内容" : `还没有${labels[resource].title}`}</h2><p>{query || statusFilter !== "all" ? "试试其他关键词或状态。" : labels[resource].empty}</p>{!query && statusFilter === "all" && <button type="button" className={styles.textButton} onClick={() => beginDraft(toDraft())}>开始创建 <ChevronRight size={15} /></button>}</div>}
    </> : <>
      <div className={styles.editorTop}><button type="button" className={styles.backButton} onClick={() => void closeEditor()}><ArrowLeft size={17} /> 返回{labels[resource].title}</button><div className={styles.editorTopActions}>{draft.id && <button type="button" className={styles.quietButton} onClick={() => void showRevisions()}><History size={16} /> 版本记录</button>}<button type="button" className={styles.quietButton} onClick={() => setPreview(true)}><Eye size={16} /> 预览</button><button type="button" className={styles.secondaryButton} disabled={busy} onClick={() => void save("draft")}>保存草稿</button><button type="button" className={styles.primaryButton} disabled={busy} onClick={() => void save("published")}><Check size={16} /> {draft.status === "published" ? "更新发布" : "发布"}</button></div></div>
      <div className={styles.editorHeading}><span className={styles.eyebrow}>{draft.id ? "EDIT CONTENT" : "NEW CONTENT"} <span className={styles.unsavedDot}>{autoSaving ? "· 自动保存中" : changed ? "· 未保存" : draft.id ? "· 已保存" : ""}</span></span><input className={styles.titleInput} aria-label="标题" placeholder={`无标题${labels[resource].singular}`} value={draft.title} onChange={(event) => update("title", event.target.value)} /><textarea className={styles.excerptInput} aria-label="摘要" rows={2} placeholder="写一句简洁的介绍…" value={draft.description} onChange={(event) => update("description", event.target.value)} /></div>
      {error && <div className={styles.errorNotice} role="alert">{error}</div>}{message && <div className={styles.successNotice} role="status">{message}</div>}
      <div className={styles.editorLayout}><div className={styles.editorMain}><div className={styles.panelLabel}>正文内容</div><BlockEditor key={`${draft.id ?? "new"}:${editorVersion}`} value={draft.content} assets={assets} onChange={(content) => update("content", content as RichDocument)} /></div><div className={styles.inspector}><div className={styles.panelLabel}>发布设置</div><label className={styles.fieldLabel}>{resource === "pages" ? "页面路径" : "链接标识"}<input className={styles.field} value={draft.slug} placeholder={resource === "pages" ? "/photo-api 或 /docs/photo" : "自动由标题生成"} onChange={(event) => update("slug", event.target.value)} /><small>{resource === "pages" ? "输入以 / 开头的公开路径；留空由标题生成。修改后旧地址自动跳转，关联的项目入口同步更新。" : resource === "projects" ? "修改后，原来的项目地址仍会跳转到新地址。" : "仅使用字母、数字和连字符"}</small></label>
        {resource !== "pages" && <label className={styles.fieldLabel}>封面图片 URL<input className={styles.field} type="url" value={draft.coverImage} placeholder="https://… 或 /uploads/…" onChange={(event) => update("coverImage", event.target.value)} /></label>}
        {resource !== "pages" && assets.some((asset) => asset.mimeType.startsWith("image/")) && <label className={styles.fieldLabel}>从媒体库选择封面<select className={styles.field} value="" onChange={(event) => { if (event.target.value) update("coverImage", event.target.value); }}><option value="">选择图片…</option>{assets.filter((asset) => asset.mimeType.startsWith("image/")).map((asset) => <option value={asset.url} key={asset.id}>{asset.name}</option>)}</select></label>}
        {draft.coverImage && resource !== "pages" && <img className={styles.coverPreview} src={draft.coverImage} alt="封面预览" />}
        {resource === "posts" && <><label className={styles.fieldLabel}>分类<input className={styles.field} list="studio-category-options" value={draft.category} placeholder="例如：开发日志" onChange={(event) => update("category", event.target.value)} /><datalist id="studio-category-options">{catalog.categories.map((term) => <option value={term.name} key={term.id} />)}</datalist></label><label className={styles.fieldLabel}>预计阅读时间（分钟）<input className={styles.field} type="number" min="1" max="300" value={draft.readingMinutes} onChange={(event) => update("readingMinutes", Number(event.target.value))} /></label></>}
        {resource !== "pages" && <><label className={styles.fieldLabel}>标签<input className={styles.field} value={tagText} placeholder="用逗号分隔" onChange={(event) => { setTagText(event.target.value); update("tags", event.target.value.split(",").map((part) => part.trim()).filter(Boolean)); }} /></label>{catalog.tags.length > 0 && <div className={styles.termSuggestions} aria-label="已有标签">{catalog.tags.slice(0, 12).map((term) => <button type="button" key={term.id} aria-pressed={draft.tags.includes(term.name)} onClick={() => { const next = draft.tags.includes(term.name) ? draft.tags.filter((name) => name !== term.name) : [...draft.tags, term.name]; setTagText(next.join(", ")); update("tags", next); }}>{term.name}</button>)}</div>}</>}
        {resource === "projects" && <><label className={styles.fieldLabel}>技术栈<input className={styles.field} value={techText} placeholder="TypeScript, React" onChange={(event) => { setTechText(event.target.value); update("techStack", event.target.value.split(",").map((part) => part.trim()).filter(Boolean)); }} /></label><label className={styles.fieldLabel}>项目状态<input className={styles.field} value={draft.projectStatus} onChange={(event) => update("projectStatus", event.target.value)} /></label><label className={styles.fieldLabel}>项目日期<input className={styles.field} type="date" value={draft.projectDate} onChange={(event) => update("projectDate", event.target.value)} /></label><label className={styles.fieldLabel}>GitHub URL<input className={styles.field} type="url" value={draft.githubUrl} placeholder="https://github.com/…" onChange={(event) => update("githubUrl", event.target.value)} /></label><label className={styles.fieldLabel}>项目入口地址<input className={styles.field} type="text" value={draft.demoUrl} placeholder="https://… 或 /api.html" onChange={(event) => update("demoUrl", event.target.value)} /><small>控制公开项目页中“打开项目 / 访问网站”的去向。</small>{draft.demoUrl.trim().startsWith("/") && <small>站内独立页面的正文与路径可在 <Link href="/studio?tab=pages">页面管理</Link> 中编辑。</small>}</label></>}
        {resource !== "pages" && <label className={styles.switchLine}><span>设为精选内容<small>在首页优先展示</small></span><input type="checkbox" checked={draft.featured} onChange={(event) => update("featured", event.target.checked)} /></label>}
        {draft.id && <button type="button" className={styles.dangerText} onClick={() => void remove({ id: draft.id!, title: draft.title } as ContentItem)}><Trash2 size={15} /> 删除这篇{labels[resource].singular}</button>}
      </div></div>
    </>}
    {preview && draft && <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreview(false); }}><div className={styles.previewModal} role="dialog" aria-modal="true" aria-label="内容预览"><div className={styles.modalHeader}><span>发布预览 · 当前编辑内容</span><button type="button" title="关闭预览" aria-label="关闭预览" onClick={() => setPreview(false)}><X size={20} /></button></div><article className={styles.previewArticle}>{draft.coverImage && <img className={styles.previewCover} src={draft.coverImage} alt="封面" />}<div className={styles.previewMeta}>{labels[resource].singular} · {draft.category || "未分类"}</div><h1>{draft.title || "无标题"}</h1><p className={styles.previewDescription}>{draft.description}</p><div className={styles.previewBody}><RichContent document={draft.content} /></div></article></div></div>}
    {revisionsOpen && <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRevisionsOpen(false); }}><div className={styles.revisionModal} role="dialog" aria-modal="true" aria-label="版本记录"><div className={styles.modalHeader}><span>版本记录</span><button type="button" title="关闭版本记录" aria-label="关闭版本记录" onClick={() => setRevisionsOpen(false)}><X size={20} /></button></div><p>每次保存和发布都会产生一个可恢复的版本。</p>{revisionBusy ? <div className={styles.skeletonRows}><i /><i /></div> : revisions.length ? <div className={styles.revisionList}>{revisions.map((revision) => <div key={revision.id}><Clock3 size={16} /><span><strong>{readableDate(revision.createdAt)}</strong><small>{revision.snapshot.title || "无标题"} · {revision.snapshot.status === "published" ? "已发布" : revision.snapshot.status === "archived" ? "已归档" : "草稿"}</small></span><button type="button" onClick={() => void restore(revision.id)}>恢复</button></div>)}</div> : <p>还没有版本记录。</p>}</div></div>}
  </section>;
}
