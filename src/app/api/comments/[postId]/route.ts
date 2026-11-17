import { createHash } from "node:crypto";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, hasDatabase } from "@/db";
import { postComments, posts } from "@/db/schema";

export const runtime = "nodejs";
type Context = { params: Promise<{ postId: string }> };
const input = z.object({
  author: z.string().trim().min(1).max(40),
  content: z.string().trim().min(1).max(2000),
  website: z.string().max(0).optional(),
});
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

async function readBody(request: Request): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let body = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 12_000) { await reader.cancel(); return null; }
    body += decoder.decode(value, { stream: true });
  }
  return body + decoder.decode();
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const urls = [request.url, process.env.BETTER_AUTH_URL, process.env.NEXT_PUBLIC_SITE_URL].filter((url): url is string => Boolean(url));
  return urls.some((url) => { try { return new URL(url).origin === origin; } catch { return false; } });
}

export async function GET(request: Request, { params }: Context) {
  const { postId } = await params;
  if (!z.uuid().safeParse(postId).success) return json({ error: "文章不存在" }, 404);
  if (!hasDatabase()) return json({ error: "评论暂不可用" }, 503);
  try {
    const db = getDb();
    const [post] = await db.select({ id: posts.id }).from(posts).where(and(eq(posts.id, postId), eq(posts.status, "published"))).limit(1);
    if (!post) return json({ error: "文章不存在" }, 404);
    const parsed = Number(new URL(request.url).searchParams.get("offset") || 0);
    const offset = Number.isSafeInteger(parsed) && parsed >= 0 ? Math.min(parsed, 100_000) : 0;
    const rows = await db.select({ id: postComments.id, author: postComments.author, content: postComments.content, createdAt: postComments.createdAt })
      .from(postComments).where(and(eq(postComments.postId, postId), eq(postComments.approved, true)))
      .orderBy(desc(postComments.createdAt), desc(postComments.id)).limit(21).offset(offset);
    return json({ comments: rows.slice(0, 20), hasMore: rows.length > 20 });
  } catch (error) {
    console.error("Comments read failed", error);
    return json({ error: "评论加载失败，请稍后重试" }, 500);
  }
}

export async function POST(request: Request, { params }: Context) {
  const { postId } = await params;
  if (!z.uuid().safeParse(postId).success) return json({ error: "文章不存在" }, 404);
  if (!hasDatabase()) return json({ error: "评论暂不可用" }, 503);
  if (!isSameOrigin(request)) return json({ error: "请求来源无效" }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return json({ error: "请求格式不正确" }, 415);
  if (Number(request.headers.get("content-length")) > 12_000) return json({ error: "评论过长" }, 413);
  try {
    const body = await readBody(request);
    if (body === null) return json({ error: "评论过长" }, 413);
    let value: unknown;
    try { value = JSON.parse(body); } catch { return json({ error: "请求格式不正确" }, 400); }
    const parsed = input.safeParse(value);
    if (!parsed.success) return json({ error: "请填写昵称（最多 40 字）和评论（最多 2000 字）" }, 400);
    const db = getDb();
    // nginx overwrites x-real-ip; avoid retaining the address itself.
    const address = request.headers.get("x-real-ip")?.trim().slice(0, 100) || "unknown";
    const clientHash = createHash("sha256").update((process.env.BETTER_AUTH_SECRET || "local-comments") + ":" + address).digest("hex");
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${clientHash}))`);
      const [post] = await tx.select({ id: posts.id }).from(posts).where(and(eq(posts.id, postId), eq(posts.status, "published"))).limit(1);
      if (!post) return "missing" as const;
      const [count] = await tx.select({ value: sql<number>`count(*)::int` }).from(postComments)
        .where(and(eq(postComments.clientHash, clientHash), gte(postComments.createdAt, new Date(Date.now() - 10 * 60_000))));
      if (count.value >= 3) return "limited" as const;
      await tx.insert(postComments).values({ postId, author: parsed.data.author, content: parsed.data.content, clientHash });
      return "ok" as const;
    });
    if (result === "missing") return json({ error: "文章不存在" }, 404);
    if (result === "limited") return json({ error: "评论太频繁，请稍后再试" }, 429);
    return json({ message: "评论已提交，审核通过后显示。" }, 201);
  } catch (error) {
    console.error("Comment submission failed", error);
    return json({ error: "评论提交失败，请稍后重试" }, 500);
  }
}
