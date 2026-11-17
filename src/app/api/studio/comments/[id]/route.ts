import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { postComments } from "@/db/schema";
import { apiError, guard, jsonBody, validId } from "@/lib/server/studio";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const denied = await guard(request); if (denied) return denied;
    const id = validId((await params).id);
    const body = await jsonBody(request);
    if (!body || typeof body !== "object" || !("approved" in body) || typeof body.approved !== "boolean") return Response.json({ error: "无效的审核状态" }, { status: 400 });
    const [updated] = await getDb().update(postComments).set({ approved: body.approved }).where(eq(postComments.id, id)).returning({ id: postComments.id, approved: postComments.approved });
    return updated ? Response.json(updated) : Response.json({ error: "评论不存在" }, { status: 404 });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const denied = await guard(request); if (denied) return denied;
    const id = validId((await params).id);
    const [deleted] = await getDb().delete(postComments).where(eq(postComments.id, id)).returning({ id: postComments.id });
    return deleted ? new Response(null, { status: 204 }) : Response.json({ error: "评论不存在" }, { status: 404 });
  } catch (error) { return apiError(error); }
}
