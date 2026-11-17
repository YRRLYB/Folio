import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { backgroundSources } from "@/db/schema";
import { updateBackground, deleteBackground, backgroundFields } from "@/lib/server/backgrounds";
import { apiError, guard, jsonBody, validId } from "@/lib/server/studio";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const denied = await guard(request); if (denied) return denied;
    const [row] = await getDb().select().from(backgroundSources).where(eq(backgroundSources.id, validId((await params).id))).limit(1);
    return row ? NextResponse.json(row) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const denied = await guard(request); if (denied) return denied;
    const id = validId((await params).id);
    const input = backgroundFields.partial().parse(await jsonBody(request));
    const row = await updateBackground(id, input);
    return row ? NextResponse.json(row) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const denied = await guard(request); if (denied) return denied;
    const row = await deleteBackground(validId((await params).id));
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (error) { return apiError(error); }
}
