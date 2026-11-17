import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { media, mediaBlobs } from "@/db/schema";
import { readMediaUpload } from "@/lib/server/media-upload";
import { apiError, ApiProblem, guard, jsonBody, validId } from "@/lib/server/studio";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const denied = await guard(request); if (denied) return denied;
    const [row] = await getDb().select().from(media).where(eq(media.id, validId((await params).id))).limit(1);
    return row ? NextResponse.json(row) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const denied = await guard(request); if (denied) return denied;
    const input = z.object({ name: z.string().trim().min(1).max(180).optional(), alt: z.string().max(500).optional(), category: z.string().trim().min(1).max(80).optional() }).parse(await jsonBody(request));
    const [row] = await getDb().update(media).set({ ...input, updatedAt: new Date() }).where(eq(media.id, validId((await params).id))).returning();
    return row ? NextResponse.json(row) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) { return apiError(error); }
}

export async function PUT(request: Request, { params }: Context) {
  try {
    const denied = await guard(request); if (denied) return denied;
    const id = validId((await params).id);
    const { data, mimeType } = await readMediaUpload(request);
    const row = await getDb().transaction(async (tx) => {
      const [old] = await tx.select().from(media).where(eq(media.id, id)).limit(1);
      if (!old) return null;
      if (old.mimeType.startsWith("image/") !== mimeType.startsWith("image/")) {
        throw new ApiProblem(415, "Replacement must keep the same media kind");
      }
      if (!old.url.startsWith("/media/") && !old.url.startsWith("/uploads/") && old.url !== "/avatar.webp") {
        throw new ApiProblem(400, "This media URL cannot be replaced in place");
      }
      const [saved] = await tx.update(media).set({ mimeType, size: data.length, updatedAt: new Date() }).where(eq(media.id, id)).returning();
      await tx.insert(mediaBlobs).values({ mediaId: id, data }).onConflictDoUpdate({ target: mediaBlobs.mediaId, set: { data } });
      return saved;
    });
    return row ? NextResponse.json(row) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const denied = await guard(request); if (denied) return denied;
    const id = validId((await params).id);
    const db = getDb();
    const [existing] = await db.select({ url: media.url }).from(media).where(eq(media.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.url === "/avatar.webp") {
      return NextResponse.json({ error: "内置头像不能删除；请替换文件或在站点外观中选择其他头像。" }, { status: 409 });
    }
    const [row] = await db.delete(media).where(eq(media.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const filename = row.url.startsWith("/uploads/") ? row.url.slice("/uploads/".length) : "";
    if (/^[a-f0-9-]+\.(png|jpg|gif|webp|avif|mp4|webm)$/.test(filename)) {
      await unlink(join(process.cwd(), "public", "uploads", filename)).catch(() => {});
    }
    return new Response(null, { status: 204 });
  } catch (error) { return apiError(error); }
}
