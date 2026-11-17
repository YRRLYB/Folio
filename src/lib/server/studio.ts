import "server-only";

import { and, desc, eq, inArray, like, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@/db";
import { media, pages, posts, projects, revisions, siteSettings } from "@/db/schema";
import { auth } from "@/lib/auth";
import { toPage, toPost, toProject } from "@/lib/server/content";
import { safeSiteUrl } from "@/lib/site-url";
import { registerTerms } from "@/lib/taxonomy";
import { projectSlugAliasKey } from "@/lib/project-links";
import { pagePathAliasKey, pagePathError, PHOTO_API_PAGE_ID, publicPageHref } from "@/lib/builtin-pages";

export type Resource = "posts" | "projects" | "pages";
const kindMap = { posts: "post", projects: "project", pages: "page" } as const;
const statusSchema = z.enum(["draft", "published", "archived"]);
const httpUrl = z.url().refine((url) => url.startsWith("https://") || url.startsWith("http://"));
const siteOrHttpUrl = z.string().trim().max(2048).refine((url) => Boolean(safeSiteUrl(url)), "Use a site path or HTTP(S) URL");
const richDoc = z.object({ type: z.literal("doc"), content: z.array(z.unknown()).optional() }).passthrough();
const slugField = z.string().trim().min(1).max(220).regex(/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u);
const pagePathField = z.string().trim().min(1).max(220)
  .transform((value) => value.length > 1 ? value.replace(/\/+$/, "") : value)
  .superRefine((value, context) => {
    const message = pagePathError(value);
    if (message) context.addIssue({ code: "custom", message });
  });
const dateField = z.iso.datetime({ offset: true }).nullable();
const common = {
  title: z.string().trim().min(1).max(220),
  slug: slugField.optional(),
  content: richDoc.optional(),
  status: statusSchema.optional(),
};
export const postInput = z.object({
  ...common,
  excerpt: z.string().max(1200).optional(),
  coverImage: z.string().max(2048).nullable().optional(),
  category: z.string().trim().min(1).max(80).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(20).transform((values) => [...new Set(values)]).optional(),
  readingMinutes: z.number().int().min(1).max(300).optional(),
  featured: z.boolean().optional(),
});
export const projectInput = z.object({
  ...common,
  description: z.string().max(1200).optional(),
  coverImage: z.string().max(2048).nullable().optional(),
  projectStatus: z.string().trim().min(1).max(80).optional(),
  techStack: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(20).transform((values) => [...new Set(values)]).optional(),
  githubUrl: httpUrl.nullable().optional(),
  demoUrl: siteOrHttpUrl.nullable().optional(),
  projectDate: dateField.optional(),
  featured: z.boolean().optional(),
});
export const pageInput = z.object({
  ...common,
  slug: pagePathField.optional(),
  description: z.string().max(1200).optional(),
});

export class ApiProblem extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function guard(request: Request): Promise<Response | null> {
  if (!hasDatabase()) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!ownerEmail) return NextResponse.json({ error: "OWNER_EMAIL is not configured" }, { status: 503 });
  if (request.method !== "GET" && request.method !== "HEAD") {
    const origin = request.headers.get("origin");
    const allowed = [new URL(request.url).origin];
    if (process.env.BETTER_AUTH_URL) allowed.push(new URL(process.env.BETTER_AUTH_URL).origin);
    if (!origin || !allowed.includes(origin)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.email.toLowerCase() !== ownerEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function jsonBody(request: Request): Promise<unknown> {
  const raw = await request.text();
  if (raw.length > 1_000_000) throw new ApiProblem(413, "Request body too large");
  try { return JSON.parse(raw) as unknown; }
  catch { throw new ApiProblem(400, "Invalid JSON body"); }
}

export function apiError(error: unknown): Response {
  if (error instanceof ApiProblem) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid fields", details: error.flatten() }, { status: 400 });
  const code = (error as { code?: string; cause?: { code?: string } })?.code ?? (error as { cause?: { code?: string } })?.cause?.code;
  if (code === "23505") return NextResponse.json({ error: "Slug or URL already exists" }, { status: 409 });
  console.error("Studio API error", error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export function validId(id: string): string {
  if (!z.uuid().safeParse(id).success) throw new ApiProblem(400, "Invalid ID");
  return id;
}

function slugify(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 180) || crypto.randomUUID();
}

function publishTime(status: "draft" | "published" | "archived" | undefined, old?: Date | null) {
  return status === "published" ? old ?? new Date() : old ?? null;
}

function revisionValues(resource: Resource, resourceId: string, row: unknown) {
  return { kind: kindMap[resource], resourceId, snapshot: JSON.parse(JSON.stringify(row)) as Record<string, unknown> };
}

type Transaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
async function rememberProjectSlug(tx: Transaction, previous: typeof projects.$inferSelect, current: typeof projects.$inferSelect) {
  if (previous.slug === current.slug) return;
  const value = { projectId: current.id };
  await tx.insert(siteSettings).values({ key: projectSlugAliasKey(previous.slug), value })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });
}

async function assertPagePathAvailable(tx: Transaction, slug: string, pageId: string) {
  const error = pagePathError(slug);
  if (error) throw new ApiProblem(400, error);
  const href = publicPageHref({ id: pageId, slug });
  if ((href === "/api.html" || href === "/pages/photo-api-docs") && pageId !== PHOTO_API_PAGE_ID) {
    throw new ApiProblem(409, "这个路径已作为图库页面的入口使用，请换一个路径");
  }
  // Serialize equivalent legacy and explicit paths (/pages/name and name).
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${href}))`);
  const path = decodeURIComponent(href);
  const legacySlug = /^\/pages\/([^/]+)$/.exec(path)?.[1];
  const matches = await tx.select({ id: pages.id }).from(pages).where(inArray(pages.slug, legacySlug ? [path, legacySlug] : [path]));
  if (matches.some((row) => row.id !== pageId)) throw new ApiProblem(409, "这个页面路径已被使用，请换一个路径");
  const [alias] = await tx.select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, pagePathAliasKey(href))).limit(1);
  if (alias?.value.pageId && alias.value.pageId !== pageId) throw new ApiProblem(409, "这个路径是其他页面的旧入口，请换一个路径");
}

async function rememberPagePath(tx: Transaction, previous: typeof pages.$inferSelect, current: typeof pages.$inferSelect) {
  const oldHref = publicPageHref(previous);
  const href = publicPageHref(current);
  if (oldHref === href) return;
  const value = { pageId: current.id };
  await tx.insert(siteSettings).values({ key: pagePathAliasKey(oldHref), value })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });
  const aliases = await tx.select().from(siteSettings).where(like(siteSettings.key, "page_path_alias:%"));
  const oldPaths = new Set(aliases.filter((alias) => alias.value.pageId === current.id).map((alias) => alias.key.slice("page_path_alias:".length)));
  oldPaths.add(oldHref);
  if (current.id === PHOTO_API_PAGE_ID) {
    oldPaths.add("/api.html");
    oldPaths.add("/pages/photo-api-docs");
  }
  // Keep the editable project entry in sync without touching project slugs.
  const projectRows = await tx.select().from(projects);
  for (const project of projectRows) {
    if (!project.demoUrl?.startsWith("/") || project.demoUrl.startsWith("//")) continue;
    const url = new URL(project.demoUrl, "https://site.invalid");
    if (!oldPaths.has(url.pathname)) continue;
    const demoUrl = href + url.search + url.hash;
    if (demoUrl === project.demoUrl) continue;
    const [saved] = await tx.update(projects).set({ demoUrl, updatedAt: new Date() }).where(eq(projects.id, project.id)).returning();
    await tx.insert(revisions).values(revisionValues("projects", project.id, saved));
  }
}

export async function listResource(resource: Resource) {
  const db = getDb();
  if (resource === "posts") return (await db.select().from(posts).orderBy(desc(posts.updatedAt))).map(toPost);
  if (resource === "projects") return (await db.select().from(projects).orderBy(desc(projects.updatedAt))).map(toProject);
  return (await db.select().from(pages).orderBy(desc(pages.updatedAt))).map(toPage);
}

export async function getResource(resource: Resource, id: string) {
  validId(id);
  const db = getDb();
  if (resource === "posts") {
    const [row] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
    return row ? toPost(row) : null;
  }
  if (resource === "projects") {
    const [row] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return row ? toProject(row) : null;
  }
  const [row] = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
  return row ? toPage(row) : null;
}

export async function createResource(resource: Resource, raw: unknown) {
  const db = getDb();
  if (resource === "posts") {
    const input = postInput.parse(raw);
    const row = await db.transaction(async (tx) => {
      const [saved] = await tx.insert(posts).values({ ...input, slug: input.slug ?? slugify(input.title), publishedAt: publishTime(input.status) }).returning();
      await registerTerms(tx, saved.category, saved.tags);
      await tx.insert(revisions).values(revisionValues(resource, saved.id, saved));
      return saved;
    });
    return toPost(row);
  }
  if (resource === "projects") {
    const input = projectInput.parse(raw);
    const row = await db.transaction(async (tx) => {
      const [saved] = await tx.insert(projects).values({ ...input, slug: input.slug ?? slugify(input.title), projectDate: input.projectDate ? new Date(input.projectDate) : null, publishedAt: publishTime(input.status) }).returning();
      await registerTerms(tx, null, saved.tags);
      await tx.insert(revisions).values(revisionValues(resource, saved.id, saved));
      return saved;
    });
    return toProject(row);
  }
  const input = pageInput.parse(raw);
  const row = await db.transaction(async (tx) => {
    const id = crypto.randomUUID();
    const slug = input.slug ?? "/" + slugify(input.title);
    await assertPagePathAvailable(tx, slug, id);
    const [saved] = await tx.insert(pages).values({ ...input, id, slug, publishedAt: publishTime(input.status) }).returning();
    await tx.insert(revisions).values(revisionValues(resource, saved.id, saved));
    return saved;
  });
  return toPage(row);
}

export async function updateResource(resource: Resource, id: string, raw: unknown, draftOnly = false) {
  validId(id);
  const db = getDb();
  if (resource === "posts") {
    const input = postInput.partial().parse(raw);
    if (draftOnly && input.status !== "draft") throw new ApiProblem(400, "Autosave requires draft status");
    const [old] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
    if (!old) return null;
    const row = await db.transaction(async (tx) => {
      const [saved] = await tx.update(posts).set({ ...input, publishedAt: publishTime(input.status, old.publishedAt), updatedAt: new Date() }).where(draftOnly ? and(eq(posts.id, id), eq(posts.status, "draft")) : eq(posts.id, id)).returning();
      if (!saved) throw new ApiProblem(409, "内容状态已变化，请重新打开后再保存");
      await registerTerms(tx, saved.category, saved.tags);
      await tx.insert(revisions).values(revisionValues(resource, id, saved));
      return saved;
    });
    return toPost(row);
  }
  if (resource === "projects") {
    const input = projectInput.partial().parse(raw);
    if (draftOnly && input.status !== "draft") throw new ApiProblem(400, "Autosave requires draft status");
    const [old] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (!old) return null;
    const row = await db.transaction(async (tx) => {
      const [saved] = await tx.update(projects).set({ ...input, projectDate: input.projectDate === undefined ? old.projectDate : input.projectDate ? new Date(input.projectDate) : null, publishedAt: publishTime(input.status, old.publishedAt), updatedAt: new Date() }).where(draftOnly ? and(eq(projects.id, id), eq(projects.status, "draft")) : eq(projects.id, id)).returning();
      if (!saved) throw new ApiProblem(409, "内容状态已变化，请重新打开后再保存");
      await rememberProjectSlug(tx, old, saved);
      await registerTerms(tx, null, saved.tags);
      await tx.insert(revisions).values(revisionValues(resource, id, saved));
      return saved;
    });
    return toProject(row);
  }
  const input = pageInput.partial().parse(raw);
  if (draftOnly && input.status !== "draft") throw new ApiProblem(400, "Autosave requires draft status");
  const [old] = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
  if (!old) return null;
  const row = await db.transaction(async (tx) => {
    await assertPagePathAvailable(tx, input.slug ?? old.slug, id);
    const [saved] = await tx.update(pages).set({ ...input, publishedAt: publishTime(input.status, old.publishedAt), updatedAt: new Date() }).where(draftOnly ? and(eq(pages.id, id), eq(pages.status, "draft")) : eq(pages.id, id)).returning();
    if (!saved) throw new ApiProblem(409, "内容状态已变化，请重新打开后再保存");
    await rememberPagePath(tx, old, saved);
    await tx.insert(revisions).values(revisionValues(resource, id, saved));
    return saved;
  });
  return toPage(row);
}

export async function deleteResource(resource: Resource, id: string) {
  validId(id);
  const db = getDb();
  return db.transaction(async (tx) => {
    const deleted = resource === "posts" ? await tx.delete(posts).where(eq(posts.id, id)).returning({ id: posts.id })
      : resource === "projects" ? await tx.delete(projects).where(eq(projects.id, id)).returning({ id: projects.id })
      : await tx.delete(pages).where(eq(pages.id, id)).returning({ id: pages.id });
    if (deleted.length) await tx.delete(revisions).where(and(eq(revisions.kind, kindMap[resource]), eq(revisions.resourceId, id)));
    if (deleted.length && resource === "pages") {
      const aliases = await tx.select().from(siteSettings).where(like(siteSettings.key, "page_path_alias:%"));
      const keys = aliases.filter((alias) => alias.value.pageId === id).map((alias) => alias.key);
      if (keys.length) await tx.delete(siteSettings).where(inArray(siteSettings.key, keys));
    }
    return deleted.length > 0;
  });
}

export async function listRevisions(resource: Resource, id: string) {
  validId(id);
  return getDb().select().from(revisions).where(and(eq(revisions.kind, kindMap[resource]), eq(revisions.resourceId, id))).orderBy(desc(revisions.createdAt));
}

export async function restoreRevision(resource: Resource, id: string, revisionId: string) {
  validId(id); validId(revisionId);
  const db = getDb();
  const [revision] = await db.select().from(revisions).where(and(eq(revisions.id, revisionId), eq(revisions.kind, kindMap[resource]), eq(revisions.resourceId, id))).limit(1);
  if (!revision) return null;
  const snapshot = revision.snapshot;
  const publishedAt = typeof snapshot.publishedAt === "string" ? new Date(snapshot.publishedAt) : null;
  if (resource === "posts") {
    const input = postInput.partial().parse(snapshot);
    const row = await db.transaction(async (tx) => {
      const [saved] = await tx.update(posts).set({ ...input, publishedAt, updatedAt: new Date() }).where(eq(posts.id, id)).returning();
      if (saved) await registerTerms(tx, saved.category, saved.tags);
      if (saved) await tx.insert(revisions).values(revisionValues(resource, id, saved));
      return saved;
    });
    return row ? toPost(row) : null;
  }
  if (resource === "projects") {
    const input = projectInput.partial().parse(snapshot);
    const row = await db.transaction(async (tx) => {
      const [old] = await tx.select().from(projects).where(eq(projects.id, id)).limit(1);
      const [saved] = await tx.update(projects).set({ ...input, projectDate: input.projectDate ? new Date(input.projectDate) : null, publishedAt, updatedAt: new Date() }).where(eq(projects.id, id)).returning();
      if (saved && old) await rememberProjectSlug(tx, old, saved);
      if (saved) await registerTerms(tx, null, saved.tags);
      if (saved) await tx.insert(revisions).values(revisionValues(resource, id, saved));
      return saved;
    });
    return row ? toProject(row) : null;
  }
  const input = pageInput.partial().parse(snapshot);
  const row = await db.transaction(async (tx) => {
    const [old] = await tx.select().from(pages).where(eq(pages.id, id)).limit(1);
    if (!old) return null;
    await assertPagePathAvailable(tx, input.slug ?? old.slug, id);
    const [saved] = await tx.update(pages).set({ ...input, publishedAt, updatedAt: new Date() }).where(eq(pages.id, id)).returning();
    if (saved) await rememberPagePath(tx, old, saved);
    if (saved) await tx.insert(revisions).values(revisionValues(resource, id, saved));
    return saved;
  });
  return row ? toPage(row) : null;
}

export async function listMedia() {
  return getDb().select().from(media).orderBy(desc(media.createdAt));
}
