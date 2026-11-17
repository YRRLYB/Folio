import { revisionsGet } from "@/lib/server/route-handlers";
export const runtime = "nodejs";
export const GET = async (request: Request, { params }: { params: Promise<{ id: string }> }) => revisionsGet(request, "projects", (await params).id);
