import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const runtime = "nodejs";
const handlers = toNextJsHandler(auth);

function configured() {
  return Boolean(process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_URL && process.env.OWNER_EMAIL);
}

export async function GET(request: Request) {
  if (!configured()) return Response.json({ error: "Authentication not configured" }, { status: 503 });
  return handlers.GET(request);
}

export async function POST(request: Request) {
  if (!configured()) return Response.json({ error: "Authentication not configured" }, { status: 503 });
  return handlers.POST(request);
}
