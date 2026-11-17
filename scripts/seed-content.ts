import "dotenv/config";
import { stat } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { media, navigation, posts, projects, siteSettings, socialLinks } from "../src/db/schema";
import { defaultSiteConfig, legacyProjects } from "../src/lib/defaults";
import { registerTerms } from "../src/lib/taxonomy";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to seed content");

async function main() {
  const db = getDb();
  const avatarSize = (await stat(new URL("../public/avatar.webp", import.meta.url))).size;
  await db.transaction(async (tx) => {
    for (const key of ["site", "theme", "background", "github", "homepage"] as const) {
      await tx.insert(siteSettings).values({ key, value: defaultSiteConfig[key] as Record<string, unknown> }).onConflictDoNothing();
    }
    const [projectMarker] = await tx.select({ key: siteSettings.key }).from(siteSettings).where(eq(siteSettings.key, "legacy_projects_initialized")).limit(1);
    if (!projectMarker) {
      const example = legacyProjects[0];
      await tx.insert(projects).values({ slug: example.slug, title: example.title, description: example.description, content: example.content, status: "published", projectStatus: example.projectStatus, featured: true, tags: example.tags, publishedAt: new Date() }).onConflictDoNothing({ target: projects.slug });
      await tx.insert(siteSettings).values({ key: "legacy_projects_initialized", value: { initialized: true } }).onConflictDoNothing();
    }
    const [postMarker] = await tx.select({ key: siteSettings.key }).from(siteSettings).where(eq(siteSettings.key, "example_post_initialized")).limit(1);
    if (!postMarker) {
      await tx.insert(posts).values({
        slug: "hello-world", title: "欢迎来到你的博客", excerpt: "这是一篇示例文章，可以在 Studio 中编辑或删除。",
        content: { type: "doc", content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "从这里开始" }] },
          { type: "paragraph", content: [{ type: "text", text: "欢迎来到你的新空间。在 Studio 中写下自己的故事，并替换这篇示例文章。" }] },
        ] },
        status: "published", publishedAt: new Date(), category: "示例", tags: ["开始"], readingMinutes: 1,
      }).onConflictDoNothing({ target: posts.slug });
      await tx.insert(siteSettings).values({ key: "example_post_initialized", value: { initialized: true } }).onConflictDoNothing();
    }
    await registerTerms(tx, "示例", ["示例", "开始"]);
    await tx.insert(media).values({ name: "默认头像", url: "/avatar.webp", alt: "默认头像", category: "avatar", mimeType: "image/webp", size: avatarSize }).onConflictDoNothing({ target: media.url });
    const [navMarker] = await tx.select({ key: siteSettings.key }).from(siteSettings).where(eq(siteSettings.key, "navigation_initialized")).limit(1);
    if (!navMarker) {
      const [existing] = await tx.select({ id: navigation.id }).from(navigation).limit(1);
      if (!existing) await tx.insert(navigation).values(defaultSiteConfig.navigation.map(item => ({ label: item.label, href: item.href, position: item.order, visible: item.visible, external: item.external })));
      await tx.insert(siteSettings).values({ key: "navigation_initialized", value: { initialized: true } }).onConflictDoNothing();
    }
    const [socialMarker] = await tx.select({ key: siteSettings.key }).from(siteSettings).where(eq(siteSettings.key, "social_initialized")).limit(1);
    if (!socialMarker) {
      const [existing] = await tx.select({ id: socialLinks.id }).from(socialLinks).limit(1);
      if (!existing && defaultSiteConfig.social.length) await tx.insert(socialLinks).values(defaultSiteConfig.social.map(item => ({ label: item.label, url: item.url, icon: item.kind, position: item.order, visible: item.visible })));
      await tx.insert(siteSettings).values({ key: "social_initialized", value: { initialized: true } }).onConflictDoNothing();
    }
  });
  console.log("Initial configuration and example content are ready.");
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(() => closeDb());
