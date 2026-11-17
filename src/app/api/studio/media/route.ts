import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { media, mediaBlobs } from "@/db/schema";
import { readMediaUpload } from "@/lib/server/media-upload";
import { apiError, guard, listMedia } from "@/lib/server/studio";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const denied = await guard(request); if (denied) return denied;
    return NextResponse.json(await listMedia());
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const denied = await guard(request); if (denied) return denied;
    const { form, file, data, mimeType } = await readMediaUpload(request);
    const id = crypto.randomUUID();
    const name = (String(form.get("name") ?? file.name).split(/[\\/]/).pop() ?? "Upload").trim().slice(0, 180);
    const category = String(form.get("category") ?? (mimeType.startsWith("video/") ? "video" : "image")).slice(0, 80);
    const alt = String(form.get("alt") ?? "").slice(0, 500);
    const row = await getDb().transaction(async (tx) => {
      const [saved] = await tx.insert(media).values({ id, name, url: "/media/" + id, category, alt, mimeType, size: data.length }).returning();
      await tx.insert(mediaBlobs).values({ mediaId: id, data });
      return saved;
    });
    return NextResponse.json({ ...row, createdAt: row.createdAt.toISOString() }, { status: 201 });
  } catch (error) { return apiError(error); }
}
