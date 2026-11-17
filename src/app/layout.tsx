import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Your Blog",
  description: "记录文章、想法与作品的个人空间。",
  applicationName: "Your Blog",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const preference = (await cookies()).get("site-theme")?.value;
  const theme = preference === "light" || preference === "dark" || preference === "system" ? preference : "system";
  return (
    <html lang="zh-CN" data-site-theme={theme} suppressHydrationWarning>
      <body>
        <a className="skip-link" href="#main-content">跳到主要内容</a>
        {children}
      </body>
    </html>
  );
}
