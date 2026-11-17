import { connection } from "next/server";
import { getGithubData, getSiteConfig, listPublishedPosts, listPublishedProjects } from "@/lib/server/content";
import { HomeSections } from "@/components/site/HomeSections";

export default async function HomePage() {
  await connection();
  const config = await getSiteConfig();
  const [posts, projects, github] = await Promise.all([
    listPublishedPosts(),
    listPublishedProjects(),
    config.github.username ? getGithubData(config.github.username) : Promise.resolve(null),
  ]);
  return <HomeSections config={config} posts={posts} projects={projects} github={github} />;
}
