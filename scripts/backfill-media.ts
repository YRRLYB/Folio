import "dotenv/config";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { eq, like } from "drizzle-orm";
import { getDb } from "../src/db";
import { media, mediaBlobs } from "../src/db/schema";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to backfill media");

async function main() {
  const db = getDb();
  const assets = await db.select({
    id: media.id,
    url: media.url,
    size: media.size,
    storedId: mediaBlobs.mediaId,
  }).from(media).leftJoin(mediaBlobs, eq(mediaBlobs.mediaId, media.id)).where(like(media.url, "/uploads/%"));

  let copied = 0;
  let missing = 0;
  for (const asset of assets) {
    if (asset.storedId) continue;
    const filename = asset.url.slice("/uploads/".length);
    if (!/^[a-f0-9-]+\.(png|jpg|gif|webp|avif|mp4|webm)$/.test(filename)) {
      console.warn("Skipping unexpected upload path:", asset.url);
      missing++;
      continue;
    }
    try {
      const bytes = await readFile(join(process.cwd(), "public", "uploads", filename));
      if (bytes.length !== asset.size) {
        console.warn("Skipping file with different size:", asset.url);
        missing++;
        continue;
      }
      await db.insert(mediaBlobs).values({ mediaId: asset.id, data: bytes }).onConflictDoNothing({ target: mediaBlobs.mediaId });
      copied++;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      console.warn("Original file unavailable:", asset.url);
      missing++;
    }
  }
  console.log(`Media backfill complete: ${copied} copied, ${missing} unavailable.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
