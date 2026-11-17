import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, hasDatabase } from "@/db";
import { posts } from "@/db/schema";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  if (!z.uuid().safeParse(postId).success) return new Response(null, { status: 404 });
  if (!hasDatabase()) return new Response(null, { status: 503 });
  const origin = request.headers.get("origin");
  const allowed = [request.url, process.env.BETTER_AUTH_URL, process.env.NEXT_PUBLIC_SITE_URL]
    .filter((value): value is string => Boolean(value))
    .some((value) => { try { return new URL(value).origin === origin; } catch { return false; } });
  if (!origin || !allowed) return new Response(null, { status: 403 });
  try {
    const [post] = await getDb().update(posts)
      .set({ viewCount: sql`${posts.viewCount} + 1` })
      .where(and(eq(posts.id, postId), eq(posts.status, "published")))
      .returning({ viewCount: posts.viewCount });
    return post ? Response.json(post, { headers: { "Cache-Control": "no-store" } }) : new Response(null, { status: 404 });
  } catch (error) {
    console.error("Post view count failed", error);
    return new Response(null, { status: 500 });
  }
}
