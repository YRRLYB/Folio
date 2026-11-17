"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";
import type { MediaAsset, SiteConfig } from "@/lib/types";
import { jsonRequest, studioRequest } from "./client";
import styles from "./studio.module.css";

type Background = SiteConfig["background"];
type Source = Background & { id: string; name: string; type: "local" | "url" | "api"; active: boolean };
type SourceDraft = Omit<Source, "id"> & { id?: string };

export function BackgroundSources({ background, assets, onActivated, hasUnsavedBackground }: { background: Background; assets: MediaAsset[]; onActivated: (value: Background) => void; hasUnsavedBackground: boolean }) {
  const [sources, setSources] = useState<Source[]>([]);
  const [editing, setEditing] = useState<SourceDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    try { setSources(await studioRequest<Source[]>("backgrounds")); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "无法加载背景来源"); }
  }, []);
  useEffect(() => {
    let active = true;
    void studioRequest<Source[]>("backgrounds")
      .then((items) => { if (active) setSources(items); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "无法加载背景来源"); });
    return () => { active = false; };
  }, []);
  const update = <K extends keyof SourceDraft>(key: K, value: SourceDraft[K]) => setEditing((current) => current ? { ...current, [key]: value } : current);
  const fresh = () => setEditing({ name: "新背景", type: background.type === "none" ? "url" : background.type, endpoint: background.endpoint, refresh: background.refresh, opacity: background.opacity, blur: background.blur, overlay: background.overlay, active: false });
  const mayReplaceBackground = () => !hasUnsavedBackground || window.confirm("当前背景设置尚未保存。继续会用背景来源替换这些修改，确定继续吗？");
  const save = async () => {
    if (!editing || busy) return;
    if (!editing.name.trim() || !editing.endpoint.trim()) { setError("请填写来源名称和地址。"); return; }
    if ((editing.active || (editing.id && sources.find((item) => item.id === editing.id)?.active)) && !mayReplaceBackground()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const payload = { name: editing.name.trim(), type: editing.type, endpoint: editing.endpoint.trim(), refresh: editing.refresh, opacity: editing.opacity, blur: editing.blur, overlay: editing.overlay, active: editing.active };
      const source = editing.id ? await studioRequest<Source>("backgrounds/" + editing.id, jsonRequest("PATCH", payload)) : await studioRequest<Source>("backgrounds", jsonRequest("POST", payload));
      if (source.active) onActivated({ type: source.type, endpoint: source.endpoint, refresh: source.refresh, opacity: source.opacity, blur: source.blur, overlay: source.overlay });
      else if (editing.id && sources.find((item) => item.id === editing.id)?.active) onActivated({ type: "none", endpoint: "", refresh: "page", opacity: 0.16, blur: 8, overlay: true });
      setEditing(null); setNotice("背景来源已保存。"); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "保存失败"); }
    finally { setBusy(false); }
  };
  const activate = async (source: Source) => {
    if (!mayReplaceBackground()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await studioRequest<Source>("backgrounds/" + source.id, jsonRequest("PATCH", { active: true }));
      onActivated({ type: source.type, endpoint: source.endpoint, refresh: source.refresh, opacity: source.opacity, blur: source.blur, overlay: source.overlay });
      setNotice("已启用「" + source.name + "」。"); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "启用失败"); }
    finally { setBusy(false); }
  };
  const remove = async (source: Source) => {
    if (!window.confirm("永久删除背景来源「" + source.name + "」？")) return;
    if (source.active && !mayReplaceBackground()) return;
    setBusy(true); setError("");
    try { await studioRequest("backgrounds/" + source.id, { method: "DELETE" }); if (source.active) onActivated({ type: "none", endpoint: "", refresh: "page", opacity: 0.16, blur: 8, overlay: true }); setNotice("背景来源已删除。"); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "删除失败"); }
    finally { setBusy(false); }
  };
  return <div className={styles.backgroundSources}>
    <div className={styles.panelLabel}>背景来源库 <button type="button" className={styles.textButton} onClick={fresh}><Plus size={14} /> 保存新来源</button></div>
    <p>保存多组图片或 API 地址，需要时直接切换。</p>
    {error && <div className={styles.errorNotice} role="alert">{error}</div>}{notice && <div className={styles.successNotice} role="status">{notice}</div>}
    {sources.length ? <div className={styles.sourceList}>{sources.map((source) => <div className={styles.sourceRow} key={source.id}><span className={styles.sourceType}>{source.type.toUpperCase()}</span><span className={styles.sourceText}><strong>{source.name}</strong><small>{source.endpoint}</small></span>{source.active ? <span className={styles.sourceActive}>使用中</span> : <button type="button" disabled={busy} onClick={() => void activate(source)}>使用</button>}<button type="button" disabled={busy} onClick={() => setEditing({ ...source })}>编辑</button><button type="button" disabled={busy} title="删除背景来源" aria-label={"删除" + source.name} onClick={() => void remove(source)}><Trash2 size={14} /></button></div>)}</div> : <div className={styles.sourceEmpty}>尚未保存背景来源。</div>}
    {editing && <div className={styles.sourceEditor}><div className={styles.sourceEditorHead}><strong>{editing.id ? "编辑背景来源" : "新背景来源"}</strong><button type="button" title="关闭" aria-label="关闭" onClick={() => setEditing(null)}><X size={16} /></button></div><div className={styles.formGrid}><label className={styles.fieldLabel}>名称<input className={styles.field} value={editing.name} onChange={(event) => update("name", event.target.value)} /></label><label className={styles.fieldLabel}>类型<select className={styles.field} value={editing.type} onChange={(event) => update("type", event.target.value as SourceDraft["type"])}><option value="local">本地图片</option><option value="url">图片 URL</option><option value="api">API</option></select></label></div><label className={styles.fieldLabel}>地址<input className={styles.field} value={editing.endpoint} placeholder={editing.type === "local" ? "/uploads/…" : "https://…"} onChange={(event) => update("endpoint", event.target.value)} /></label>{editing.type === "local" && assets.length > 0 && <label className={styles.fieldLabel}>从媒体库选择<select className={styles.field} value="" onChange={(event) => { if (event.target.value) update("endpoint", event.target.value); }}><option value="">选择图片…</option>{assets.map((asset) => <option key={asset.id} value={asset.url}>{asset.name}</option>)}</select></label>}<div className={styles.formGrid}><label className={styles.fieldLabel}>刷新策略<select className={styles.field} value={editing.refresh} onChange={(event) => update("refresh", event.target.value as SourceDraft["refresh"])}><option value="page">每次打开</option><option value="session">每次会话</option><option value="daily">每天</option></select></label><label className={styles.fieldLabel}>模糊（px）<input className={styles.field} type="number" min="0" max="64" value={editing.blur} onChange={(event) => update("blur", Number(event.target.value))} /></label></div><label className={styles.fieldLabel}>透明度 {Math.round(editing.opacity * 100)}%<input className={styles.rangeInput} type="range" min="0" max="1" step="0.01" value={editing.opacity} onChange={(event) => update("opacity", Number(event.target.value))} /></label><div className={styles.sourceOptions}><label className={styles.inlineCheck}><input type="checkbox" checked={editing.overlay} onChange={(event) => update("overlay", event.target.checked)} /> 阅读遮罩</label><label className={styles.inlineCheck}><input type="checkbox" checked={editing.active} onChange={(event) => update("active", event.target.checked)} /> 保存并启用</label></div><button type="button" className={styles.primaryButton} disabled={busy} onClick={() => void save()}><Check size={15} /> 保存来源</button></div>}
  </div>;
}
