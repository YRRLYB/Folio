import { NextResponse } from "next/server";
import { z } from "zod";
import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { siteSettings, socialLinks } from "@/db/schema";
import { getSiteConfig, toSocialLink } from "@/lib/server/content";
import { apiError, guard, jsonBody } from "@/lib/server/studio";
import { safeSiteUrl } from "@/lib/site-url";

export const runtime = "nodejs";

const itemSchema = z.object({
  id: z.string().optional(), label: z.string().trim().min(1).max(100),
  url: z.string().trim().max(2048).refine((value) => Boolean(safeSiteUrl(value, true)), "请输入有效的站内路径、HTTP(S) 地址或 mailto: 邮箱地址"),
  kind: z.string().trim().min(1).max(80), order: z.number().int().min(0).max(1000), visible: z.boolean(),
});

export async function GET(request: Request) {
  try {
    const denied = await guard(request); if (denied) return denied;
    return NextResponse.json((await getSiteConfig()).social);
  } catch (error) { return apiError(error); }
}

export async function PUT(request: Request) {
  try {
    const denied = await guard(request); if (denied) return denied;
    const input = z.array(itemSchema).max(30).parse(await jsonBody(request));
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx.delete(socialLinks);
      if (input.length) await tx.insert(socialLinks).values(input.map((item) => ({ id: item.id && z.uuid().safeParse(item.id).success ? item.id : crypto.randomUUID(), label: item.label, url: item.url, icon: item.kind, position: item.order, visible: item.visible })));
      await tx.insert(siteSettings).values({ key: "social_initialized", value: { initialized: true } }).onConflictDoUpdate({ target: siteSettings.key, set: { value: { initialized: true }, updatedAt: new Date() } });
    });
    return NextResponse.json((await db.select().from(socialLinks).orderBy(asc(socialLinks.position))).map(toSocialLink));
  } catch (error) { return apiError(error); }
}
