import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { PublicPageView } from "@/components/site/PublicPageView";
import { getPublicPageByPath } from "@/lib/server/content";
import { publicPageHref } from "@/lib/builtin-pages";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const page = await getPublicPageByPath("/api.html");
  return page ? { title: page.title, description: page.description } : { title: "页面未找到" };
}

export default async function ApiDocsPage() {
  await connection();
  const page = await getPublicPageByPath("/api.html");
  if (!page) notFound();
  if (publicPageHref(page) !== "/api.html") redirect(publicPageHref(page));
  return <PublicPageView page={page} />;
}
