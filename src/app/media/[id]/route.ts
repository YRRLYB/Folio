import { z } from "zod";
import { serveMedia } from "@/lib/server/media";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

async function respond(request: Request, { params }: Context) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response(null, { status: 404 });
  return serveMedia("/media/" + id, request);
}

export const GET = respond;
export const HEAD = respond;
