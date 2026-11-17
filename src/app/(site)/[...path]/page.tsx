import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { PublicPageView } from "@/components/site/PublicPageView";
import { publicPageHref } from "@/lib/builtin-pages";
import { getPublicPageByPath } from "@/lib/server/content";

type Props = { params: Promise<{ path: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
  const { path } = await params;
  const page = await getPublicPageByPath("/" + path.join("/"));
  return page ? { title: page.title, description: page.description } : { title: "页面未找到" };
}

export default async function PublicPage({ params }: Props) {
  await connection();
  const { path } = await params;
  const page = await getPublicPageByPath("/" + path.join("/"));
  if (!page) notFound();
  const href = "/" + path.map(encodeURIComponent).join("/");
  if (publicPageHref(page) !== href) redirect(publicPageHref(page));
  return <PublicPageView page={page} />;
}
