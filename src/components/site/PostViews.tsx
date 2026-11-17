"use client";

import { useEffect, useState } from "react";

// A tab counts a post once every 30 minutes. This is an approximate view count,
// not a count of unique people; no persistent visitor identifier is collected.
export function PostViews({ postId, initialCount }: { postId: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let started = false;
    let active = true;
    let timer = 0;
    const key = "post-view:" + postId;
    const countVisit = () => {
      if (started || document.visibilityState !== "visible") return;
      try {
        if (Date.now() - Number(sessionStorage.getItem(key) || 0) < 30 * 60_000) return;
      } catch { /* Counting still works if storage is disabled. */ }
      started = true;
      // Delay until after hydration, so development Strict Mode does not count twice.
      timer = window.setTimeout(() => {
        void fetch(`/api/posts/${encodeURIComponent(postId)}/view`, { method: "POST" })
          .then(async (response) => {
            if (!response.ok) return;
            const data: { viewCount: number } = await response.json();
            try { sessionStorage.setItem(key, String(Date.now())); } catch { /* Storage can be disabled. */ }
            if (active) setCount(data.viewCount);
          }).catch(() => { /* The article remains readable if counting fails. */ });
      }, 0);
    };
    countVisit();
    document.addEventListener("visibilitychange", countVisit);
    return () => { active = false; window.clearTimeout(timer); document.removeEventListener("visibilitychange", countVisit); };
  }, [postId]);

  return <span>{count.toLocaleString("zh-CN")} 次浏览</span>;
}
