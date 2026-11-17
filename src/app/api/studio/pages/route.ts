import { collectionGet, collectionPost } from "@/lib/server/route-handlers";
export const runtime = "nodejs";
export const GET = (request: Request) => collectionGet(request, "pages");
export const POST = (request: Request) => collectionPost(request, "pages");
