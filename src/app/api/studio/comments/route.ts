import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { postComments, posts } from "@/db/schema";
import { apiError, guard } from "@/lib/server/studio";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const denied = await guard(request); if (denied) return denied;
    const params = new URL(request.url).searchParams;
    const rawOffset = Number(params.get("offset") || 0);
    const offset = Number.isSafeInteger(rawOffset) && rawOffset >= 0 ? Math.min(rawOffset, 100_000) : 0;
    const status = params.get("status") || "all";
    if (!["all", "pending", "approved"].includes(status)) return Response.json({ error: "无效的评论状态" }, { status: 400 });
    const rows = await getDb().select({ id: postComments.id, author: postComments.author, content: postComments.content, approved: postComments.approved, createdAt: postComments.createdAt, postTitle: posts.title, postSlug: posts.slug, postStatus: posts.status })
      .from(postComments).innerJoin(posts, eq(postComments.postId, posts.id))
      .where(status === "all" ? undefined : eq(postComments.approved, status === "approved"))
      .orderBy(desc(postComments.createdAt), desc(postComments.id)).limit(51).offset(offset);
    return Response.json({ comments: rows.slice(0, 50), hasMore: rows.length > 50 }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
