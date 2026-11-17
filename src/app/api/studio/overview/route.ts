import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { media, pages, posts, projects } from "@/db/schema";
import { apiError, guard } from "@/lib/server/studio";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const denied = await guard(request); if (denied) return denied;
    const db = getDb();
    const [postRows, projectRows, pageRows, mediaRows] = await Promise.all([
      db.select({ status: posts.status }).from(posts), db.select({ status: projects.status }).from(projects),
      db.select({ status: pages.status }).from(pages), db.select({ id: media.id }).from(media),
    ]);
    const counts = (rows: { status: "draft" | "published" | "archived" }[]) => ({
      total: rows.length, draft: rows.filter((row) => row.status === "draft").length,
      published: rows.filter((row) => row.status === "published").length,
      archived: rows.filter((row) => row.status === "archived").length,
    });
    return NextResponse.json({ posts: counts(postRows), projects: counts(projectRows), pages: counts(pageRows), media: mediaRows.length });
  } catch (error) { return apiError(error); }
}
