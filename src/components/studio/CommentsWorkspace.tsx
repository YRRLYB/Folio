"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { jsonRequest, studioRequest } from "./client";
import styles from "./studio.module.css";
import commentStyles from "./comments-workspace.module.css";

type Comment = { id: string; author: string; content: string; approved: boolean; createdAt: string; postTitle: string; postSlug: string; postStatus: string };
type CommentPage = { comments: Comment[]; hasMore: boolean };

export function CommentsWorkspace() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const endpoint = `comments?status=${filter}`;

  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try { const page = await studioRequest<CommentPage>(endpoint); setComments(page.comments); setMore(page.hasMore); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "评论加载失败"); }
    finally { setLoading(false); }
  }, [endpoint]);
  useEffect(() => {
    let active = true;
    void studioRequest<CommentPage>(endpoint).then((page) => { if (active) { setComments(page.comments); setMore(page.hasMore); } })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "评论加载失败"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [endpoint]);
  const changeFilter = (next: typeof filter) => {
    if (next === filter) return;
    setLoading(true); setError(""); setFilter(next);
  };
  const changeApproval = async (comment: Comment) => {
    setBusy(true); setError("");
    try {
      await studioRequest(`comments/${comment.id}`, jsonRequest("PATCH", { approved: !comment.approved }));
      await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "操作失败"); }
    finally { setBusy(false); }
  };
  const remove = async (comment: Comment) => {
    if (!window.confirm(`删除 ${comment.author} 的这条评论？`)) return;
    setBusy(true); setError("");
    try { await studioRequest(`comments/${comment.id}`, { method: "DELETE" }); await refresh(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "删除失败"); }
    finally { setBusy(false); }
  };
  const loadMore = async () => {
    setBusy(true); setError("");
    try {
      const page = await studioRequest<CommentPage>(`${endpoint}&offset=${comments.length}`);
      setComments((items) => [...items, ...page.comments]); setMore(page.hasMore);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "评论加载失败"); }
    finally { setBusy(false); }
  };

  return <section className={styles.workspace}>
    <div className={styles.sectionHeader}><div><span className={styles.eyebrow}>CONTENT / COMMENTS</span><h1>评论</h1><p>新评论需要通过审核才会显示在文章中。</p></div><button type="button" className={styles.secondaryButton} onClick={() => void refresh()} disabled={loading || busy}>刷新</button></div>
    <div className={styles.filterTabs} role="group" aria-label="评论状态">
      <button type="button" disabled={loading || busy} aria-pressed={filter === "all"} onClick={() => changeFilter("all")}>全部</button>
      <button type="button" disabled={loading || busy} aria-pressed={filter === "pending"} onClick={() => changeFilter("pending")}>待审核</button>
      <button type="button" disabled={loading || busy} aria-pressed={filter === "approved"} onClick={() => changeFilter("approved")}>已通过</button>
    </div>
    {error && <div className={styles.errorNotice} role="alert">{error} <button type="button" onClick={() => void refresh()}>重试</button></div>}
    {loading ? <div className={styles.skeletonRows}><i /><i /><i /></div> : comments.length ? <div className={commentStyles.list}>{comments.map((comment) => <article className={commentStyles.row} key={comment.id}>
      <div className={commentStyles.meta}><strong>{comment.author}</strong><time dateTime={comment.createdAt}>{new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(comment.createdAt))}</time><span className={comment.approved ? styles.published : styles.draft}>{comment.approved ? "已通过" : "待审核"}</span></div>
      <p className={commentStyles.body}>{comment.content}</p>
      <div className={commentStyles.actions}><span>文章：{comment.postTitle} {comment.postStatus !== "published" ? "（未发布）" : null}</span>{comment.postStatus === "published" ? <a href={`/posts/${encodeURIComponent(comment.postSlug)}`} target="_blank" rel="noreferrer">查看文章 <ExternalLink size={14} /></a> : null}<button type="button" className={styles.secondaryButton} disabled={busy} onClick={() => void changeApproval(comment)}>{comment.approved ? "撤回审核" : "通过审核"}</button><button type="button" className={styles.quietButton} disabled={busy} onClick={() => void remove(comment)}><Trash2 size={15} /> 删除</button></div>
    </article>)}</div> : <div className={styles.taxonomyEmpty}>{filter === "all" ? "还没有评论。" : "没有符合条件的评论。"}</div>}
    {more ? <button type="button" className={styles.secondaryButton} disabled={busy || loading} onClick={() => void loadMore()}>加载更多评论</button> : null}
  </section>;
}
