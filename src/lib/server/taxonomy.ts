import "server-only";

import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { categories, posts, projects, revisions, tags } from "@/db/schema";
import type { TaxonomyCatalog } from "@/lib/types";
import { termSlug } from "@/lib/taxonomy";
import { ApiProblem, validId } from "@/lib/server/studio";

export const taxonomyKind = z.enum(["categories", "tags"]);
const nameSchema = z.string().trim().min(1).max(80);
type Kind = z.infer<typeof taxonomyKind>;

function snapshot(row: object) {
  return JSON.parse(JSON.stringify(row)) as Record<string, unknown>;
}

export async function listTaxonomy(): Promise<TaxonomyCatalog> {
  const db = getDb();
  const [categoryRows, tagRows, postRows, projectRows] = await Promise.all([
    db.select().from(categories).orderBy(categories.name),
    db.select().from(tags).orderBy(tags.name),
    db.select({ category: posts.category, tags: posts.tags }).from(posts),
    db.select({ tags: projects.tags }).from(projects),
  ]);
  const categoryUsage = new Map<string, number>();
  const tagUsage = new Map<string, number>();
  for (const post of postRows) {
    if (post.category) categoryUsage.set(post.category, (categoryUsage.get(post.category) ?? 0) + 1);
    for (const name of new Set(post.tags)) tagUsage.set(name, (tagUsage.get(name) ?? 0) + 1);
  }
  for (const project of projectRows) {
    for (const name of new Set(project.tags)) tagUsage.set(name, (tagUsage.get(name) ?? 0) + 1);
  }
  return {
    categories: categoryRows.map((row) => ({ ...row, usageCount: categoryUsage.get(row.name) ?? 0 })),
    tags: tagRows.map((row) => ({ ...row, usageCount: tagUsage.get(row.name) ?? 0 })),
  };
}

export async function createTerm(kind: Kind, raw: unknown) {
  const { name } = z.object({ name: nameSchema }).parse(raw);
  const db = getDb();
  const table = kind === "categories" ? categories : tags;
  const [existing] = await db.select({ id: table.id }).from(table).where(eq(table.name, name)).limit(1);
  if (existing) throw new ApiProblem(409, "该名称已存在");
  const [created] = await db.insert(table).values({ name, slug: termSlug(name) }).returning();
  return created;
}

export async function renameTerm(kind: Kind, id: string, raw: unknown) {
  validId(id);
  const { name } = z.object({ name: nameSchema }).parse(raw);
  const db = getDb();
  return db.transaction(async (tx) => {
    const table = kind === "categories" ? categories : tags;
    const [old] = await tx.select().from(table).where(eq(table.id, id)).limit(1);
    if (!old) throw new ApiProblem(404, "词条不存在");
    if (old.name === name) return old;
    const [existing] = await tx.select({ id: table.id }).from(table).where(eq(table.name, name)).limit(1);
    if (existing) throw new ApiProblem(409, "该名称已存在");
    const [saved] = await tx.update(table).set({ name, slug: termSlug(name) }).where(eq(table.id, id)).returning();
    if (kind === "categories") {
      const affected = await tx.select().from(posts).where(eq(posts.category, old.name));
      for (const row of affected) {
        const [updated] = await tx.update(posts).set({ category: name, updatedAt: new Date() }).where(eq(posts.id, row.id)).returning();
        await tx.insert(revisions).values({ kind: "post", resourceId: row.id, snapshot: snapshot(updated) });
      }
    } else {
      const affectedPosts = await tx.select().from(posts).where(sql`${old.name} = ANY(${posts.tags})`);
      const affectedProjects = await tx.select().from(projects).where(sql`${old.name} = ANY(${projects.tags})`);
      for (const row of affectedPosts) {
        const [updated] = await tx.update(posts).set({ tags: row.tags.map((tag) => tag === old.name ? name : tag), updatedAt: new Date() }).where(eq(posts.id, row.id)).returning();
        await tx.insert(revisions).values({ kind: "post", resourceId: row.id, snapshot: snapshot(updated) });
      }
      for (const row of affectedProjects) {
        const [updated] = await tx.update(projects).set({ tags: row.tags.map((tag) => tag === old.name ? name : tag), updatedAt: new Date() }).where(eq(projects.id, row.id)).returning();
        await tx.insert(revisions).values({ kind: "project", resourceId: row.id, snapshot: snapshot(updated) });
      }
    }
    return saved;
  });
}

export async function deleteTerm(kind: Kind, id: string) {
  validId(id);
  const db = getDb();
  return db.transaction(async (tx) => {
    const table = kind === "categories" ? categories : tags;
    const [term] = await tx.select().from(table).where(eq(table.id, id)).limit(1);
    if (!term) throw new ApiProblem(404, "词条不存在");
    const [used] = kind === "categories"
      ? await tx.select({ id: posts.id }).from(posts).where(eq(posts.category, term.name)).limit(1)
      : await tx.select({ id: posts.id }).from(posts).where(sql`${term.name} = ANY(${posts.tags})`).limit(1);
    const [usedByProject] = kind === "tags"
      ? await tx.select({ id: projects.id }).from(projects).where(sql`${term.name} = ANY(${projects.tags})`).limit(1)
      : [];
    if (used || usedByProject) throw new ApiProblem(409, "词条正在被内容使用，请先移除引用");
    await tx.delete(table).where(eq(table.id, id));
  });
}
