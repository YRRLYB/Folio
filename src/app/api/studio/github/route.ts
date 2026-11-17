import { NextResponse } from "next/server";
import { getGithubData, getSiteConfig } from "@/lib/server/content";
import { apiError, guard } from "@/lib/server/studio";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const denied = await guard(request);
    if (denied) return denied;
    const { username } = (await getSiteConfig()).github;
    return NextResponse.json(username ? await getGithubData(username) : null);
  } catch (error) { return apiError(error); }
}
