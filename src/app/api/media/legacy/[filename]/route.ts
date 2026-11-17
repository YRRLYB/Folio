import { serveMedia } from "@/lib/server/media";

export const runtime = "nodejs";
type Context = { params: Promise<{ filename: string }> };

async function respond(request: Request, { params }: Context) {
  const { filename } = await params;
  if (filename !== "avatar.webp" && !/^[a-f0-9-]+\.(png|jpg|gif|webp|avif|mp4|webm)$/.test(filename)) {
    return new Response(null, { status: 404 });
  }
  return serveMedia(filename === "avatar.webp" ? "/avatar.webp" : "/uploads/" + filename, request);
}

export const GET = respond;
export const HEAD = respond;
