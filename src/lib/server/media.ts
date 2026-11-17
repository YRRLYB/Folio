import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { eq, sql } from "drizzle-orm";
import { getDb, hasDatabase } from "@/db";
import { media, mediaBlobs } from "@/db/schema";

const allowedMimeTypes = new Set([
  "image/png", "image/jpeg", "image/gif", "image/webp", "image/avif",
  "video/mp4", "video/webm",
]);
const legacyMimeTypes: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", gif: "image/gif", webp: "image/webp",
  avif: "image/avif", mp4: "video/mp4", webm: "video/webm",
};

async function readStoredMedia(mediaId: string, start?: number, length?: number): Promise<Buffer | null> {
  const db = getDb();
  if (start !== undefined && length !== undefined) {
    const [part] = await db.select({ data: sql<Buffer>`substring(${mediaBlobs.data} from ${start + 1} for ${length})` })
      .from(mediaBlobs).where(eq(mediaBlobs.mediaId, mediaId)).limit(1);
    return part?.data ?? null;
  }
  const [whole] = await db.select({ data: mediaBlobs.data })
    .from(mediaBlobs).where(eq(mediaBlobs.mediaId, mediaId)).limit(1);
  return whole?.data ?? null;
}

export async function serveMedia(url: string, request: Request): Promise<Response> {
  const [asset] = hasDatabase() ? await getDb()
    .select({
      id: media.id,
      mimeType: media.mimeType,
      updatedAt: media.updatedAt,
      storedId: mediaBlobs.mediaId,
      byteLength: sql<number | null>`octet_length(${mediaBlobs.data})`,
    })
    .from(media)
    .leftJoin(mediaBlobs, eq(mediaBlobs.mediaId, media.id))
    .where(eq(media.url, url))
    .limit(1) : [];
  if (!asset && (url.startsWith("/media/") || (hasDatabase() && url !== "/avatar.webp"))) {
    return new Response(null, { status: 404 });
  }

  const filename = url === "/avatar.webp" ? "avatar.webp" : url.startsWith("/uploads/") ? url.slice("/uploads/".length) : "";
  const storedId = asset?.storedId;
  if (!storedId && !/^(?:avatar\.webp|[a-f0-9-]+\.(?:png|jpg|gif|webp|avif|mp4|webm))$/.test(filename)) {
    return new Response(null, { status: 404 });
  }
  let localData: Buffer | undefined;
  if (!storedId) {
    try { localData = await readFile(join(process.cwd(), "public", ...(url === "/avatar.webp" ? [] : ["uploads"]), filename)); }
    catch { return new Response(null, { status: 404 }); }
  }
  const byteLength = storedId ? asset?.byteLength : localData?.length;
  if (byteLength == null) return new Response(null, { status: 404 });
  const mimeType = asset?.mimeType ?? legacyMimeTypes[filename.split(".").pop() ?? ""];
  if (!mimeType || !allowedMimeTypes.has(mimeType)) return new Response(null, { status: 404 });
  const etag = storedId ? `"${asset.id}-${asset.updatedAt.getTime()}"` : null;

  const headers = new Headers({
    "Content-Type": mimeType,
    "Content-Disposition": "inline",
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, no-cache",
  });
  if (etag) headers.set("ETag", etag);
  if (etag && request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });

  const range = request.headers.get("range");
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) {
      headers.set("Content-Range", `bytes */${byteLength}`);
      return new Response(null, { status: 416, headers });
    }
    const suffix = !match[1];
    const start = suffix ? Math.max(0, byteLength - Number(match[2])) : Number(match[1]);
    const end = suffix ? byteLength - 1 : match[2] ? Math.min(Number(match[2]), byteLength - 1) : byteLength - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= byteLength) {
      headers.set("Content-Range", `bytes */${byteLength}`);
      return new Response(null, { status: 416, headers });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${byteLength}`);
    headers.set("Content-Length", String(end - start + 1));
    if (request.method === "HEAD") return new Response(null, { status: 206, headers });
    const data = storedId ? await readStoredMedia(storedId, start, end - start + 1) : localData?.subarray(start, end + 1);
    return data ? new Response(Uint8Array.from(data), { status: 206, headers }) : new Response(null, { status: 404 });
  }

  headers.set("Content-Length", String(byteLength));
  if (request.method === "HEAD") return new Response(null, { headers });
  const data = storedId ? await readStoredMedia(storedId) : localData;
  return data ? new Response(Uint8Array.from(data), { headers }) : new Response(null, { status: 404 });
}
