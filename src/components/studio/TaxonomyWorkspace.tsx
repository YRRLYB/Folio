"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import type { TaxonomyCatalog, TaxonomyTerm } from "@/lib/types";
import { jsonRequest, studioRequest } from "./client";
import styles from "./studio.module.css";

type Kind = keyof TaxonomyCatalog;

export function TaxonomyWorkspace() {
  const [kind, setKind] = useState<Kind>("categories");
  const [catalog, setCatalog] = useState<TaxonomyCatalog>({ categories: [], tags: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try { setCatalog(await studioRequest<TaxonomyCatalog>("taxonomy")); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "词条加载失败"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    void studioRequest<TaxonomyCatalog>("taxonomy")
      .then((data) => { if (active) setCatalog(data); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "词条加载失败"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const terms = useMemo(() => catalog[kind].filter((term) => term.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [catalog, kind, query]);
  const changeKind = (next: Kind) => { setKind(next); setQuery(""); setEditing(null); setError(""); };
  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || busy || loading) return;
    setBusy(true); setError("");
    try {
      await studioRequest("taxonomy", jsonRequest("POST", { kind, name: name.trim() }));
      setName("");
      await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "创建失败"); }
    finally { setBusy(false); }
  };
  const rename = async (term: TaxonomyTerm) => {
    if (!editName.trim() || busy) return;
    setBusy(true); setError("");
    try {
      await studioRequest(`taxonomy/${kind}/${term.id}`, jsonRequest("PATCH", { name: editName.trim() }));
      setEditing(null);
      await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "重命名失败"); }
    finally { setBusy(false); }
  };
  const remove = async (term: TaxonomyTerm) => {
    if (term.usageCount || busy || !window.confirm(`删除「${term.name}」？`)) return;
    setBusy(true); setError("");
    try { await studioRequest(`taxonomy/${kind}/${term.id}`, { method: "DELETE" }); await refresh(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "删除失败"); }
    finally { setBusy(false); }
  };

  return <section className={styles.workspace}>
    <div className={styles.sectionHeader}><div><span className={styles.eyebrow}>CONTENT / TAXONOMY</span><h1>分类与标签</h1></div></div>
    <div className={styles.taxonomyToolbar}>
      <div className={styles.filterTabs} role="group" aria-label="词条类型">
        <button type="button" aria-pressed={kind === "categories"} onClick={() => changeKind("categories")}>文章分类 <span>{catalog.categories.length}</span></button>
        <button type="button" aria-pressed={kind === "tags"} onClick={() => changeKind("tags")}>内容标签 <span>{catalog.tags.length}</span></button>
      </div>
      <label className={styles.searchBox}><Search size={16} /><input aria-label="搜索词条" placeholder="搜索词条…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    </div>
    <form className={styles.taxonomyCreate} onSubmit={(event) => void create(event)}>
      <input className={styles.field} aria-label={`新建${kind === "categories" ? "分类" : "标签"}`} placeholder={kind === "categories" ? "新分类名称" : "新标签名称"} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
      <button type="submit" className={styles.primaryButton} disabled={!name.trim() || busy || loading}><Plus size={16} /> 添加{kind === "categories" ? "分类" : "标签"}</button>
    </form>
    {error && <div className={styles.errorNotice} role="alert">{error} <button type="button" onClick={() => void refresh()}>重试</button></div>}
    {loading ? <div className={styles.skeletonRows}><i /><i /><i /></div> : terms.length ? <div className={styles.taxonomyList}>{terms.map((term) => <div className={styles.taxonomyRow} key={term.id}>
      {editing === term.id ? <form className={styles.taxonomyRename} onSubmit={(event) => { event.preventDefault(); void rename(term); }}><input className={styles.field} aria-label="词条新名称" value={editName} maxLength={80} autoFocus onChange={(event) => setEditName(event.target.value)} /><button type="submit" title="保存名称" aria-label="保存名称" disabled={busy || !editName.trim()}><Check size={17} /></button><button type="button" title="取消" aria-label="取消" onClick={() => setEditing(null)}><X size={17} /></button></form> : <strong>{term.name}</strong>}
      <span className={styles.taxonomyUsage}>{term.usageCount} 处引用</span>
      {editing !== term.id && <div className={styles.taxonomyActions}><button type="button" title={`重命名${term.name}`} aria-label={`重命名${term.name}`} disabled={busy} onClick={() => { setEditing(term.id); setEditName(term.name); }}><Pencil size={16} /></button><button type="button" title={term.usageCount ? "先从内容中移除引用" : `删除${term.name}`} aria-label={`删除${term.name}`} disabled={busy || term.usageCount > 0} onClick={() => void remove(term)}><Trash2 size={16} /></button></div>}
    </div>)}</div> : <div className={styles.taxonomyEmpty}>{query ? "没有匹配的词条。" : kind === "categories" ? "还没有文章分类。" : "还没有内容标签。"}</div>}
  </section>;
}
