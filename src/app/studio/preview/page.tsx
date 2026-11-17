import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { hasDatabase } from "@/db";
import { auth } from "@/lib/auth";
import { getGithubData, getSiteConfig, listPublishedPosts, listPublishedProjects } from "@/lib/server/content";
import { StudioSitePreview } from "@/components/studio/StudioSitePreview";
import "../../(site)/site.css";

export default async function StudioPreviewPage() {
  await connection();
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!hasDatabase() || !ownerEmail || !process.env.BETTER_AUTH_SECRET) redirect("/studio/login?setup=1");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.email.toLowerCase() !== ownerEmail) redirect("/studio/login");
  const config = await getSiteConfig();
  const [posts, projects, github] = await Promise.all([
    listPublishedPosts(),
    listPublishedProjects(),
    config.github.username ? getGithubData(config.github.username) : Promise.resolve(null),
  ]);
  return <StudioSitePreview initialConfig={config} posts={posts} projects={projects} github={github} />;
}
