import "server-only";

import { and, desc, eq, asc, inArray } from "drizzle-orm";
import { getDb, hasDatabase } from "@/db";
import { navigation, pages, posts, projects, siteSettings, socialLinks } from "@/db/schema";
import { defaultSiteConfig, legacyProjects } from "@/lib/defaults";
import type { GithubData, NavItem, Post, Project, RichDocument, SiteConfig, SitePage, SocialLink } from "@/lib/types";
import { getGithubContributions } from "@/lib/server/github-contributions";
import { pagePathAliasKey, PHOTO_API_PAGE_ID, publicPageHref } from "@/lib/builtin-pages";
import { projectSlugAliasKey } from "@/lib/project-links";

const iso = (date: Date | null) => date?.toISOString() ?? null;

export function toPost(row: typeof posts.$inferSelect): Post {
  return { ...row, content: row.content as RichDocument, publishedAt: iso(row.publishedAt), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

export function toProject(row: typeof projects.$inferSelect): Project {
  return { ...row, content: row.content as RichDocument, projectDate: iso(row.projectDate), publishedAt: iso(row.publishedAt), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

export function toPage(row: typeof pages.$inferSelect): SitePage {
  return { ...row, content: row.content as RichDocument, publishedAt: iso(row.publishedAt), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

export function toNavItem(row: typeof navigation.$inferSelect): NavItem {
  return { id: row.id, label: row.label, href: row.href, order: row.position, visible: row.visible, external: row.external };
}

export function toSocialLink(row: typeof socialLinks.$inferSelect): SocialLink {
  return { id: row.id, label: row.label, url: row.url, kind: row.icon, order: row.position, visible: row.visible };
}

export async function getSiteConfig(): Promise<SiteConfig> {
  if (!hasDatabase()) return defaultSiteConfig;
  const db = getDb();
  const [settings, navRows, socialRows] = await Promise.all([
    db.select().from(siteSettings),
    db.select().from(navigation).orderBy(asc(navigation.position)),
    db.select().from(socialLinks).orderBy(asc(socialLinks.position)),
  ]);
  const values = Object.fromEntries(settings.map(({ key, value }) => [key, value]));
  return {
    site: { ...defaultSiteConfig.site, ...values.site },
    theme: { ...defaultSiteConfig.theme, ...values.theme },
    background: { ...defaultSiteConfig.background, ...values.background },
    github: { ...defaultSiteConfig.github, ...values.github },
    homepage: { ...defaultSiteConfig.homepage, ...values.homepage },
    navigation: values.navigation_initialized ? navRows.map(toNavItem) : defaultSiteConfig.navigation,
    social: values.social_initialized ? socialRows.map(toSocialLink) : defaultSiteConfig.social,
  } as SiteConfig;
}

export async function listPublishedPosts(): Promise<Post[]> {
  if (!hasDatabase()) return [];
  const rows = await getDb().select().from(posts).where(eq(posts.status, "published")).orderBy(desc(posts.publishedAt), desc(posts.createdAt));
  return rows.map(toPost);
}

export async function getPublishedPost(slug: string): Promise<Post | null> {
  if (!hasDatabase()) return null;
  const [row] = await getDb().select().from(posts).where(and(eq(posts.slug, slug), eq(posts.status, "published"))).limit(1);
  return row ? toPost(row) : null;
}

export async function listPublishedProjects(): Promise<Project[]> {
  if (!hasDatabase()) return legacyProjects;
  const rows = await getDb().select().from(projects).where(eq(projects.status, "published")).orderBy(desc(projects.projectDate), desc(projects.publishedAt));
  if (rows.length) return rows.map(toProject);
  return await shouldUseLegacyProjects() ? legacyProjects : [];
}

export async function getPublishedProject(slug: string): Promise<Project | null> {
  if (!hasDatabase()) return legacyProjects.find((project) => project.slug === slug) ?? null;
  const [row] = await getDb().select().from(projects).where(and(eq(projects.slug, slug), eq(projects.status, "published"))).limit(1);
  if (row) return toProject(row);
  const [alias] = await getDb().select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, projectSlugAliasKey(slug))).limit(1);
  const projectId = alias?.value.projectId;
  if (typeof projectId === "string") {
    const [renamed] = await getDb().select().from(projects).where(and(eq(projects.id, projectId), eq(projects.status, "published"))).limit(1);
    if (renamed) return toProject(renamed);
  }
  return await shouldUseLegacyProjects() ? legacyProjects.find((project) => project.slug === slug) ?? null : null;
}

export async function getPhotoApiPage() {
  if (!hasDatabase()) return null;
  const [row] = await getDb().select().from(pages).where(eq(pages.id, PHOTO_API_PAGE_ID)).limit(1);
  // Once a database exists, deleting or unpublishing a page is authoritative.
  return row?.status === "published" ? toPage(row) : null;
}

async function shouldUseLegacyProjects() {
  const db = getDb();
  const [anyProject, initialized] = await Promise.all([
    db.select({ id: projects.id }).from(projects).limit(1),
    db.select({ key: siteSettings.key }).from(siteSettings).where(eq(siteSettings.key, "legacy_projects_initialized")).limit(1),
  ]);
  return anyProject.length === 0 && initialized.length === 0;
}

export type PublicPageContent = Pick<SitePage, "id" | "slug" | "title" | "description" | "content">;

export async function getPublicPage(slug: string): Promise<PublicPageContent | null> {
  return getPublicPageByPath(slug.startsWith("/") ? slug : "/pages/" + slug);
}

export async function getPublicPageByPath(path: string): Promise<PublicPageContent | null> {
  const href = path.split("/").map(encodeURIComponent).join("/");
  const photoCompatibilityPath = path === "/api.html" || path === "/pages/photo-api-docs";
  if (!hasDatabase()) return null;
  const db = getDb();
  const legacySlug = /^\/pages\/([^/]+)$/.exec(path)?.[1];
  const candidates = legacySlug ? [path, legacySlug] : [path];
  const rows = await db.select().from(pages).where(inArray(pages.slug, candidates));
  const row = rows.find((item) => item.slug === path) ?? rows[0];
  // An unpublished page must never fall through to an alias or the default.
  if (row) return row.status === "published" ? toPage(row) : null;
  const [alias] = await db.select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, pagePathAliasKey(href))).limit(1);
  if (typeof alias?.value.pageId === "string") {
    const [renamed] = await db.select().from(pages).where(and(eq(pages.id, alias.value.pageId), eq(pages.status, "published"))).limit(1);
    return renamed ? toPage(renamed) : null;
  }
  return photoCompatibilityPath ? getPhotoApiPage() : null;
}

export async function getPageProjectHref(page: PublicPageContent): Promise<string | null> {
  const href = publicPageHref(page);
  const project = (await listPublishedProjects()).find((item) => {
    const path = item.demoUrl?.split(/[?#]/, 1)[0];
    return path === href || (page.id === PHOTO_API_PAGE_ID && path === "/api.html");
  });
  return project ? "/projects/" + encodeURIComponent(project.slug) : null;
}

type GithubProfile = { name: string | null; bio: string | null; avatar_url: string; followers: number; public_repos: number; html_url: string };
type GithubRepo = { name: string; description: string | null; html_url: string; stargazers_count: number; forks_count: number; language: string | null; updated_at: string };
type GithubEvent = { id: string; type: string; repo: { name: string }; created_at: string };
const emptyGithubData = (): GithubData => ({ profile: null, repositories: [], contributions: [], contributionTotal: null, contributionSource: null, events: [], unavailable: true });

async function githubJson<T>(url: string, token?: string): Promise<T | null> {
  try {
    const request = (withToken: boolean) => fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(withToken && token ? { Authorization: "Bearer " + token } : {}),
      },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    let response = await request(Boolean(token));
    if (token && (response.status === 401 || response.status === 403)) response = await request(false);
    return response.ok ? (await response.json() as T) : null;
  } catch {
    return null;
  }
}

export async function getGithubData(username: string): Promise<GithubData> {
  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(username)) return emptyGithubData();
  const token = process.env.GITHUB_TOKEN;
  const base = "https://api.github.com/users/" + encodeURIComponent(username);
  const [profile, repos, events, calendar] = await Promise.all([
    githubJson<GithubProfile>(base, token),
    githubJson<GithubRepo[]>(base + "/repos?sort=updated&per_page=6&type=owner", token),
    githubJson<GithubEvent[]>(base + "/events/public?per_page=6", token),
    getGithubContributions(username, token),
  ]);
  const result: GithubData = {
    profile: profile ? { name: profile.name, bio: profile.bio, avatarUrl: profile.avatar_url, followers: profile.followers, publicRepos: profile.public_repos, htmlUrl: profile.html_url } : null,
    repositories: (repos ?? []).map((repo) => ({ name: repo.name, description: repo.description, htmlUrl: repo.html_url, stargazersCount: repo.stargazers_count, forksCount: repo.forks_count, language: repo.language, updatedAt: repo.updated_at })),
    events: (events ?? []).map((event) => ({ id: event.id, type: event.type, repoName: event.repo.name, url: "https://github.com/" + event.repo.name, createdAt: event.created_at })),
    contributions: calendar?.days ?? [],
    contributionTotal: calendar?.total ?? null,
    contributionSource: calendar?.source ?? null,
    unavailable: !profile,
  };
  return result;
}
