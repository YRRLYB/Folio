"use client";

import { useEffect, useState } from "react";
import styles from "./post-comments.module.css";

type Comment = { id: string; author: string; content: string; createdAt: string };
type CommentsResponse = { comments: Comment[]; hasMore: boolean };

export function PostComments({ postId }: { postId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const endpoint = `/api/comments/${encodeURIComponent(postId)}`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(endpoint, { signal: controller.signal }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "评论加载失败");
      return data as CommentsResponse;
    }).then((data) => { setComments(data.comments); setMore(data.hasMore); })
      .catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "评论加载失败"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [endpoint]);

  const loadMore = async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch(`${endpoint}?offset=${comments.length}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "评论加载失败");
      setComments((previous) => [...previous, ...data.comments]); setMore(data.hasMore);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "评论加载失败"); }
    finally { setBusy(false); }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !author.trim() || !content.trim()) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ author, content, website }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "评论提交失败");
      setContent(""); setMessage(data.message);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "评论提交失败"); }
    finally { setBusy(false); }
  };

  return <section className={styles.comments} aria-labelledby="post-comments-title">
    <h2 id="post-comments-title">评论</h2>
    <p className={styles.hint}>分享你的想法，评论通过审核后显示。</p>
    <form className={styles.form} onSubmit={(event) => void submit(event)}>
      <label>昵称<input value={author} onChange={(event) => setAuthor(event.target.value)} required maxLength={40} autoComplete="nickname" /></label>
      <label>评论<textarea value={content} onChange={(event) => setContent(event.target.value)} required maxLength={2000} rows={5} /></label>
      <label className={styles.honeypot} aria-hidden="true">网站<input value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" /></label>
      <button type="submit" disabled={busy || !author.trim() || !content.trim()}>{busy ? "请稍候…" : "提交评论"}</button>
    </form>
    {message ? <p className={styles.message} role="status">{message}</p> : null}
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    <div className={styles.list} aria-live="polite">
      {loading ? <p className={styles.hint}>正在加载评论…</p> : comments.length ? comments.map((comment) => <article className={styles.comment} key={comment.id}>
        <div><strong>{comment.author}</strong><time dateTime={comment.createdAt}>{new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric" }).format(new Date(comment.createdAt))}</time></div>
        <p>{comment.content}</p>
      </article>) : !error ? <p className={styles.hint}>还没有评论，欢迎留下第一条。</p> : null}
      {more ? <button className={styles.more} type="button" disabled={busy} onClick={() => void loadMore()}>加载更多评论</button> : null}
    </div>
  </section>;
}
