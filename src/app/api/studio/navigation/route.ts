import { NextResponse } from "next/server";
import { z } from "zod";
import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { navigation, siteSettings } from "@/db/schema";
import { getSiteConfig, toNavItem } from "@/lib/server/content";
import { apiError, guard, jsonBody } from "@/lib/server/studio";
import { safeSiteUrl } from "@/lib/site-url";

export const runtime = "nodejs";

const itemSchema = z.object({
  id: z.string().optional(), label: z.string().trim().min(1).max(100),
  href: z.string().trim().max(2048).refine((value) => Boolean(safeSiteUrl(value)), "请输入有效的站内路径或 HTTP(S) 地址"),
  order: z.number().int().min(0).max(1000), visible: z.boolean(), external: z.boolean(),
});

export async function GET(request: Request) {
  try {
    const denied = await guard(request); if (denied) return denied;
    return NextResponse.json((await getSiteConfig()).navigation);
  } catch (error) { return apiError(error); }
}

export async function PUT(request: Request) {
  try {
    const denied = await guard(request); if (denied) return denied;
    const input = z.array(itemSchema).max(30).parse(await jsonBody(request));
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx.delete(navigation);
      if (input.length) await tx.insert(navigation).values(input.map((item) => ({ id: item.id && z.uuid().safeParse(item.id).success ? item.id : crypto.randomUUID(), label: item.label, href: item.href, position: item.order, visible: item.visible, external: item.external })));
      await tx.insert(siteSettings).values({ key: "navigation_initialized", value: { initialized: true } }).onConflictDoUpdate({ target: siteSettings.key, set: { value: { initialized: true }, updatedAt: new Date() } });
    });
    return NextResponse.json((await db.select().from(navigation).orderBy(asc(navigation.position))).map(toNavItem));
  } catch (error) { return apiError(error); }
}
