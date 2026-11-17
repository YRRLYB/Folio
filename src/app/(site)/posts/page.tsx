import type { Metadata } from "next";
import { connection } from "next/server";
import { listPublishedPosts } from "@/lib/server/content";
import { PostsIndex } from "@/components/site/PostsIndex";

export const metadata: Metadata = { title: "文章", description: "文章与笔记。" };

export default async function PostsPage() {
  await connection();
  const posts = await listPublishedPosts();

  return (
    <div className="site-container">
      <header className="site-page-intro">
        <h1 className="site-page-title">文章</h1>
      </header>
      <div className="site-page-content">
        {posts.length ? <PostsIndex posts={posts} /> : <p className="site-empty">还没有发布文章。</p>}
      </div>
    </div>
  );
}
