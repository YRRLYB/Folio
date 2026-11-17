import "server-only";

import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { backgroundSources, siteSettings } from "@/db/schema";
import { safeSiteUrl } from "@/lib/site-url";

export const backgroundFields = z.object({
  name: z.string().trim().min(1).max(120), type: z.enum(["local", "url", "api"]),
  endpoint: z.string().trim().min(1).max(2048), refresh: z.enum(["page", "session", "daily"]).default("page"),
  opacity: z.number().min(0).max(1).default(0.3), blur: z.number().min(0).max(64).default(8),
  overlay: z.boolean().default(true), active: z.boolean().default(false),
});

export const backgroundInput = backgroundFields.refine((value) => value.type === "local"
  ? value.endpoint.startsWith("/") && Boolean(safeSiteUrl(value.endpoint))
  : !value.endpoint.startsWith("/") && Boolean(safeSiteUrl(value.endpoint)), {
  message: "Local sources need a path; URL/API sources need an HTTP(S) URL", path: ["endpoint"],
});

type Transaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
type Source = typeof backgroundSources.$inferSelect;
const emptyBackground = { type: "none", endpoint: "", refresh: "page", opacity: 0.16, blur: 8, overlay: true };

export async function lockBackground(tx: Transaction) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext('site-background-settings'))`);
}

async function setBackground(tx: Transaction, source: Source | null) {
  await tx.update(backgroundSources).set({ active: false }).where(eq(backgroundSources.active, true));
  if (source) await tx.update(backgroundSources).set({ active: true }).where(eq(backgroundSources.id, source.id));
  const value = source ? { type: source.type, endpoint: source.endpoint, refresh: source.refresh, opacity: source.opacity, blur: source.blur, overlay: source.overlay } : emptyBackground;
  await tx.insert(siteSettings).values({ key: "background", value }).onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });
}

export async function createBackground(input: z.infer<typeof backgroundInput>) {
  return getDb().transaction(async (tx) => {
    await lockBackground(tx);
    const [source] = await tx.insert(backgroundSources).values({ ...input, active: false }).returning();
    if (input.active) await setBackground(tx, source);
    return { ...source, active: input.active };
  });
}

export async function updateBackground(id: string, input: Partial<z.infer<typeof backgroundFields>>) {
  return getDb().transaction(async (tx) => {
    await lockBackground(tx);
    const [previous] = await tx.select().from(backgroundSources).where(eq(backgroundSources.id, id)).limit(1);
    if (!previous) return null;
    const next = backgroundInput.parse({ ...previous, ...input });
    const [source] = await tx.update(backgroundSources).set({ ...input, active: false }).where(eq(backgroundSources.id, id)).returning();
    if (next.active) await setBackground(tx, source);
    else if (previous.active) await setBackground(tx, null);
    return { ...source, active: next.active };
  });
}

export async function deleteBackground(id: string) {
  return getDb().transaction(async (tx) => {
    await lockBackground(tx);
    const [source] = await tx.delete(backgroundSources).where(eq(backgroundSources.id, id)).returning();
    if (source?.active) await setBackground(tx, null);
    return source ?? null;
  });
}
