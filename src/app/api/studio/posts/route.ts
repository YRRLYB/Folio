import { collectionGet, collectionPost } from "@/lib/server/route-handlers";
export const runtime = "nodejs";
export const GET = (request: Request) => collectionGet(request, "posts");
export const POST = (request: Request) => collectionPost(request, "posts");
