import { itemDelete, itemGet, itemPatch } from "@/lib/server/route-handlers";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export const GET = async (request: Request, { params }: Context) => itemGet(request, "posts", (await params).id);
export const PATCH = async (request: Request, { params }: Context) => itemPatch(request, "posts", (await params).id);
export const DELETE = async (request: Request, { params }: Context) => itemDelete(request, "posts", (await params).id);
