import { StudioApp } from "@/components/studio/StudioApp";
import { auth } from "@/lib/auth";
import { hasDatabase } from "@/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

export default async function StudioPage() {
  await connection();
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!hasDatabase() || !ownerEmail || !process.env.BETTER_AUTH_SECRET) redirect("/studio/login?setup=1");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.email.toLowerCase() !== ownerEmail) redirect("/studio/login");
  return <StudioApp />;
}
