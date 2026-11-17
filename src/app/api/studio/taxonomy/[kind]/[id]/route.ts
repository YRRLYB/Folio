import { NextResponse } from "next/server";
import { apiError, guard, jsonBody } from "@/lib/server/studio";
import { deleteTerm, renameTerm, taxonomyKind } from "@/lib/server/taxonomy";

export const runtime = "nodejs";
type Context = { params: Promise<{ kind: string; id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const denied = await guard(request); if (denied) return denied;
    const { kind, id } = await params;
    return NextResponse.json(await renameTerm(taxonomyKind.parse(kind), id, await jsonBody(request)));
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const denied = await guard(request); if (denied) return denied;
    const { kind, id } = await params;
    await deleteTerm(taxonomyKind.parse(kind), id);
    return new Response(null, { status: 204 });
  } catch (error) { return apiError(error); }
}
