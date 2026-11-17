import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, guard, jsonBody } from "@/lib/server/studio";
import { createTerm, listTaxonomy, taxonomyKind } from "@/lib/server/taxonomy";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const denied = await guard(request); if (denied) return denied;
    return NextResponse.json(await listTaxonomy());
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const denied = await guard(request); if (denied) return denied;
    const raw = z.object({ kind: taxonomyKind, name: z.unknown() }).parse(await jsonBody(request));
    return NextResponse.json(await createTerm(raw.kind, { name: raw.name }), { status: 201 });
  } catch (error) { return apiError(error); }
}
