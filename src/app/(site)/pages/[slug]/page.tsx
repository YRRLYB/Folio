import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { getPublicPageByPath } from "@/lib/server/content";
import { PublicPageView } from "@/components/site/PublicPageView";
import { publicPageHref } from "@/lib/builtin-pages";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const page = await getPublicPageByPath("/pages/" + slug);
  return page ? { title: page.title, description: page.description } : { title: "页面未找到" };
}

export default async function PublicPage({ params }: Props) {
  await connection();
  const { slug } = await params;
  const page = await getPublicPageByPath("/pages/" + slug);
  if (!page) notFound();
  if (publicPageHref(page) !== "/pages/" + encodeURIComponent(slug)) redirect(publicPageHref(page));
  return <PublicPageView page={page} />;
}
