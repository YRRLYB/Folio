import { revisionRestore } from "@/lib/server/route-handlers";
export const runtime = "nodejs";
export const POST = async (request: Request, { params }: { params: Promise<{ id: string; revisionId: string }> }) => {
  const { id, revisionId } = await params;
  return revisionRestore(request, "pages", id, revisionId);
};
