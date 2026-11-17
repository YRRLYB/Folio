import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { backgroundSources } from "@/db/schema";
import { createBackground, backgroundInput } from "@/lib/server/backgrounds";
import { apiError, guard, jsonBody } from "@/lib/server/studio";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const denied = await guard(request); if (denied) return denied;
    return NextResponse.json(await getDb().select().from(backgroundSources).orderBy(asc(backgroundSources.createdAt)));
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const denied = await guard(request); if (denied) return denied;
    const input = backgroundInput.parse(await jsonBody(request));
    const source = await createBackground(input);
    return NextResponse.json(source, { status: 201 });
  } catch (error) { return apiError(error); }
}
