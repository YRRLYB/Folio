import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { backgroundSources, siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSiteConfig } from "@/lib/server/content";
import { apiError, ApiProblem, guard, jsonBody } from "@/lib/server/studio";
import { safeSiteUrl } from "@/lib/site-url";
import { lockBackground } from "@/lib/server/backgrounds";

export const runtime = "nodejs";

const site = z.object({
  title: z.string().max(200), description: z.string().max(1000), name: z.string().max(120),
  tagline: z.string().max(250), bio: z.string().max(3000), status: z.string().max(160),
  interests: z.array(z.string().max(80)).max(20), focus: z.array(z.string().max(80)).max(20),
  avatar: z.string().max(2048), avatarShape: z.enum(["circle", "square", "rounded"]),
  avatarSize: z.number().int().min(24).max(512),
}).partial();
const theme = z.object({
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/), font: z.string().max(100),
  radius: z.number().min(0).max(40), mode: z.enum(["light", "dark", "system"]),
}).partial();
const background = z.object({
  type: z.enum(["none", "local", "url", "api"]), endpoint: z.string().max(2048),
  refresh: z.enum(["page", "session", "daily"]), opacity: z.number().min(0).max(1),
  blur: z.number().min(0).max(64), overlay: z.boolean(),
}).partial();
const homepageSection = z.object({
  enabled: z.boolean(), title: z.string().max(200), description: z.string().max(500), order: z.number().int().min(0).max(100),
  image: z.string().trim().max(2048).refine((value) => !value || Boolean(safeSiteUrl(value))),
  backgroundImage: z.string().trim().max(2048).refine((value) => !value || Boolean(safeSiteUrl(value))),
  backgroundColor: z.string().trim().refine((value) => !value || /^#[0-9a-fA-F]{6}$/.test(value)),
  linkHref: z.string().trim().max(2048).refine((value) => !value || Boolean(safeSiteUrl(value, true))),
  linkLabel: z.string().trim().max(100),
  motion: z.enum(["none", "fade", "rise"]),
}).partial();
const bodySchema = z.object({
  site: site.optional(), theme: theme.optional(), background: background.optional(),
  github: z.object({ username: z.string().refine((name) => name === "" || /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(name)) }).partial().optional(),
  homepage: z.record(z.string(), homepageSection).optional(),
});

export async function GET(request: Request) {
  try {
    const denied = await guard(request);
    if (denied) return denied;
    return NextResponse.json(await getSiteConfig());
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const denied = await guard(request);
    if (denied) return denied;
    const patch = bodySchema.parse(await jsonBody(request));
    const current = await getSiteConfig();
    const values: { key: string; value: Record<string, unknown> }[] = [];
    for (const key of ["site", "theme", "background", "github", "homepage"] as const) {
      if (patch[key] === undefined) continue;
      const value = key === "homepage"
        ? Object.fromEntries(Object.entries(patch.homepage ?? {}).map(([name, section]) => [name, { ...current.homepage[name], ...section }]).concat(Object.entries(current.homepage).filter(([name]) => !(name in (patch.homepage ?? {})))))
        : { ...current[key], ...patch[key] } as Record<string, unknown>;
      if (key === "background") {
        const source = value as typeof current.background;
        if (source.type === "local" && (!source.endpoint.startsWith("/") || !safeSiteUrl(source.endpoint))) throw new ApiProblem(400, "Local background requires a valid site path");
        if ((source.type === "url" || source.type === "api") && (source.endpoint.startsWith("/") || !safeSiteUrl(source.endpoint))) throw new ApiProblem(400, "Background URL must use HTTP(S)");
      }
      values.push({ key, value });
    }
    await getDb().transaction(async (tx) => {
      if (patch.background) await lockBackground(tx);
      for (const { key, value } of values) {
        await tx.insert(siteSettings).values({ key, value }).onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });
        if (key === "background" && JSON.stringify(value) !== JSON.stringify(current.background)) {
          await tx.update(backgroundSources).set({ active: false }).where(eq(backgroundSources.active, true));
        }
      }
    });
    return NextResponse.json(await getSiteConfig());
  } catch (error) { return apiError(error); }
}
