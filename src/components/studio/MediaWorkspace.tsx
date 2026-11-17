"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, ImageIcon, Plus, RefreshCw, Search, Trash2, UploadCloud, X } from "lucide-react";
import type { MediaAsset } from "@/lib/types";
import { jsonRequest, readableDate, studioRequest } from "./client";
import styles from "./studio.module.css";

const categories = [
  { value: "all", label: "全部" }, { value: "image", label: "图片" },
  { value: "avatar", label: "头像" }, { value: "background", label: "背景" },
  { value: "gallery", label: "画廊" }, { value: "video", label: "视频" },
  { value: "other", label: "其他" },
];

function formatSize(bytes: number) { return bytes >= 1024 * 1024 ? (bytes / 1024 / 1024).toFixed(1) + " MB" : Math.max(1, Math.round(bytes / 1024)) + " KB"; }
function previewUrl(asset: MediaAsset) { return asset.url + (asset.url.includes("?") ? "&" : "?") + "v=" + encodeURIComponent(asset.updatedAt); }

export function MediaWorkspace() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [name, setName] = useState("");
  const [alt, setAlt] = useState("");
  const [category, setCategory] = useState("image");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    void studioRequest<MediaAsset[]>("media")
      .then((items) => { if (active) setAssets(items); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "媒体加载失败"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const choose = (asset: MediaAsset) => { setSelected(asset); setName(asset.name); setAlt(asset.alt); setCategory(asset.category); setNotice(""); };
  const uploadFiles = async (files: FileList | File[]) => {
    if (!files.length) return;
    setError(""); setNotice(""); setBusy(true);
    const results: MediaAsset[] = [];
    for (const [index, file] of Array.from(files).entries()) {
      setUploading("正在上传 " + (index + 1) + " / " + files.length + " · " + file.name);
      try {
        const form = new FormData(); form.set("file", file);
        form.set("category", filter !== "all" ? filter : file.type.startsWith("video/") ? "video" : "image");
        results.push(await studioRequest<MediaAsset>("media", { method: "POST", body: form }));
      } catch (caught) { setError("上传「" + file.name + "」失败：" + (caught instanceof Error ? caught.message : "未知错误")); }
    }
    if (results.length) { setAssets((current) => [...results.reverse(), ...current]); choose(results[0]); setNotice("已上传 " + results.length + " 个文件。"); }
    setUploading(""); setBusy(false);
    if (fileInput.current) fileInput.current.value = "";
  };
  const save = async () => {
    if (!selected || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const updated = await studioRequest<MediaAsset>("media/" + selected.id, jsonRequest("PATCH", { name: name.trim(), alt: alt.trim(), category }));
      setAssets((current) => current.map((item) => item.id === updated.id ? updated : item)); setSelected(updated); setNotice("媒体信息已保存。");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "保存失败"); }
    finally { setBusy(false); }
  };
  const replace = async (file: File) => {
    if (!selected || busy || !window.confirm(`替换「${selected.name}」的文件内容？所有引用该地址的页面都会更新。`)) {
      if (replaceInput.current) replaceInput.current.value = "";
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const form = new FormData(); form.set("file", file);
      const updated = await studioRequest<MediaAsset>("media/" + selected.id, { method: "PUT", body: form });
      setAssets((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSelected(updated);
      setNotice("文件已替换，引用地址保持不变。");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "替换失败"); }
    finally { setBusy(false); if (replaceInput.current) replaceInput.current.value = ""; }
  };
  const remove = async () => {
    if (!selected || !window.confirm("永久删除「" + selected.name + "」？正在引用它的页面可能会失去图片。")) return;
    setBusy(true); setError("");
    try { await studioRequest("media/" + selected.id, { method: "DELETE" }); setAssets((current) => current.filter((item) => item.id !== selected.id)); setSelected(null); setNotice("媒体已删除。"); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "删除失败"); }
    finally { setBusy(false); }
  };
  const copyUrl = async () => {
    if (!selected) return;
    try { await navigator.clipboard.writeText(new URL(selected.url, window.location.origin).href); setNotice("链接已复制。"); }
    catch { setError("无法访问剪贴板，请从下方手动复制链接。"); }
  };
  const visible = assets.filter((asset) => (filter === "all" || asset.category === filter) && asset.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));

  return <section className={styles.workspace}>
    <div className={styles.sectionHeader}><div><span className={styles.eyebrow}>LIBRARY / ASSETS</span><h1>媒体库</h1><p>收集网站的图片、背景与视频，统一管理与引用。</p></div><button type="button" className={styles.primaryButton} onClick={() => fileInput.current?.click()} disabled={busy}><Plus size={17} /> 上传文件</button></div>
    <input ref={fileInput} className={styles.visuallyHidden} type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/avif,video/mp4,video/webm" multiple onChange={(event) => { if (event.target.files) void uploadFiles(event.target.files); }} />
    <input ref={replaceInput} className={styles.visuallyHidden} type="file" accept={selected?.mimeType.startsWith("video/") ? "video/mp4,video/webm" : "image/png,image/jpeg,image/gif,image/webp,image/avif"} onChange={(event) => { const file = event.target.files?.[0]; if (file) void replace(file); }} />
    <div className={styles.listTools}><label className={styles.searchBox}><Search size={17} /><input aria-label="搜索媒体" placeholder="搜索文件名…" value={query} onChange={(event) => setQuery(event.target.value)} /></label><div className={styles.filterTabs} role="group" aria-label="媒体分类">{categories.map((item) => <button type="button" key={item.value} aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label}</button>)}</div></div>
    {error && <div className={styles.errorNotice} role="alert">{error}</div>}{notice && <div className={styles.successNotice} role="status">{notice}</div>}
    <div className={styles.mediaLayout}><div className={styles.mediaContent}><div className={[styles.dropZone, dragging ? styles.dropZoneActive : ""].join(" ")} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { event.preventDefault(); if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); void uploadFiles(event.dataTransfer.files); }}>
      {uploading ? <div className={styles.uploadStatus}><UploadCloud size={23} /><span>{uploading}</span></div> : <><UploadCloud size={22} /><span>拖放文件到此处上传</span><small>PNG、JPG、WebP、AVIF、GIF、MP4、WebM · 图片上限 15 MB，视频上限 50 MB</small></>}
    </div>
    {loading ? <div className={styles.skeletonGrid}><i /><i /><i /><i /></div> : visible.length ? <div className={styles.mediaGrid}>{visible.map((asset) => <button type="button" key={asset.id} className={[styles.mediaTile, selected?.id === asset.id ? styles.mediaTileSelected : ""].join(" ")} onClick={() => choose(asset)}><span className={styles.mediaThumb}>{asset.mimeType.startsWith("image/") ? <img src={previewUrl(asset)} alt={asset.alt || asset.name} loading="lazy" /> : asset.mimeType.startsWith("video/") ? <video src={previewUrl(asset)} muted preload="metadata" /> : <ImageIcon size={24} />}</span><span className={styles.mediaTileText}><strong>{asset.name}</strong><small>{asset.category} · {formatSize(asset.size)}</small></span></button>)}</div> : <div className={styles.emptyState}><div className={styles.emptyIcon}><ImageIcon size={24} /></div><h2>{query || filter !== "all" ? "没有匹配的文件" : "媒体库还是空的"}</h2><p>{query || filter !== "all" ? "试试其他关键词或分类。" : "上传头像、封面或背景，马上就能在网站中使用。"}</p></div>}</div>
    {selected && <aside className={styles.mediaInspector}><div className={styles.mediaInspectorHead}><span>文件详情</span><button type="button" title="关闭详情" aria-label="关闭详情" onClick={() => setSelected(null)}><X size={18} /></button></div><div className={styles.mediaInspectorPreview}>{selected.mimeType.startsWith("image/") ? <img src={previewUrl(selected)} alt={selected.alt || selected.name} /> : <video src={previewUrl(selected)} controls />}</div><div className={styles.mediaFact}><span>格式</span><strong>{selected.mimeType}</strong></div><div className={styles.mediaFact}><span>大小</span><strong>{formatSize(selected.size)}</strong></div><div className={styles.mediaFact}><span>上传于</span><strong>{readableDate(selected.createdAt)}</strong></div><label className={styles.fieldLabel}>文件名<input className={styles.field} value={name} onChange={(event) => setName(event.target.value)} /></label><label className={styles.fieldLabel}>替代文字<input className={styles.field} value={alt} placeholder="描述图片内容" onChange={(event) => setAlt(event.target.value)} /></label><label className={styles.fieldLabel}>分类<select className={styles.field} value={category} onChange={(event) => setCategory(event.target.value)}>{categories.filter((item) => item.value !== "all").map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label><label className={styles.fieldLabel}>引用地址<input className={styles.field} readOnly value={selected.url} onFocus={(event) => event.target.select()} /></label><div className={styles.mediaInspectorActions}><button type="button" className={styles.secondaryButton} onClick={() => void copyUrl()}><Copy size={15} /> 复制链接</button><button type="button" className={styles.primaryButton} disabled={busy} onClick={() => void save()}><Check size={15} /> 保存</button></div>{(selected.url.startsWith("/media/") || selected.url.startsWith("/uploads/") || selected.url === "/avatar.webp") && <button type="button" className={`${styles.secondaryButton} ${styles.mediaReplaceButton}`} disabled={busy} onClick={() => replaceInput.current?.click()}><RefreshCw size={15} /> 替换文件</button>}{selected.url !== "/avatar.webp" && <button type="button" className={styles.dangerText} disabled={busy} onClick={() => void remove()}><Trash2 size={15} /> 删除文件</button>}</aside>}
    </div>
  </section>;
}
