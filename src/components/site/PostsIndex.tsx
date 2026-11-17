"use client";

import { useMemo, useState } from "react";
import type { Post } from "@/lib/types";
import { EmptyContent, PostRow } from "./ContentList";

export function PostsIndex({ posts }: { posts: Post[] }) {
  const [category, setCategory] = useState("all");
  const [tag, setTag] = useState("all");
  const categories = useMemo(() => [...new Set(posts.map((post) => post.category).filter((item): item is string => Boolean(item)))], [posts]);
  const tags = useMemo(() => [...new Set(posts.flatMap((post) => post.tags))], [posts]);
  const filtered = posts.filter((post) => (category === "all" || post.category === category) && (tag === "all" || post.tags.includes(tag)));

  return <>
    {categories.length || tags.length ? <div className="site-post-filters">
      {categories.length ? <div className="site-filter-categories" role="group" aria-label="按分类筛选">
        <button type="button" aria-pressed={category === "all"} onClick={() => setCategory("all")}>全部</button>
        {categories.map((item) => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
      </div> : null}
      {tags.length ? <label className="site-filter-tag">标签 <select value={tag} onChange={(event) => setTag(event.target.value)}><option value="all">全部标签</option>{tags.map((item) => <option key={item} value={item}>{item}</option>)}</select></label> : null}
    </div> : null}
    <p className="site-filter-label" aria-live="polite">{filtered.length ? "共 " + filtered.length + " 篇文章" : "暂无匹配文章"}</p>
    {filtered.length ? <div className="site-post-list">{filtered.map((post) => <PostRow key={post.id} post={post} />)}</div> : <EmptyContent title="没有找到匹配的文章" description="可以切换分类或标签继续浏览。" />}
  </>;
}
