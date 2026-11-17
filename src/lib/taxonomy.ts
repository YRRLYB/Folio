import { createHash } from "node:crypto";
import type { getDb } from "@/db";
import { categories, tags } from "@/db/schema";

type Transaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

export function termSlug(name: string) {
  const base = name.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 60) || "term";
  return `${base}-${createHash("sha256").update(name).digest("hex").slice(0, 10)}`;
}

export async function registerTerms(tx: Transaction, category?: string | null, names?: string[]) {
  if (category) await tx.insert(categories).values({ name: category, slug: termSlug(category) }).onConflictDoNothing();
  if (names?.length) {
    await tx.insert(tags).values([...new Set(names)].map((name) => ({ name, slug: termSlug(name) }))).onConflictDoNothing();
  }
}
