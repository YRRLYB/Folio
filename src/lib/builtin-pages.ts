import type { SitePage } from "@/lib/types";

// Reserved for compatibility with older installations; no document is seeded by default.
export const PHOTO_API_PAGE_ID = "59f6ec73-931a-4cb7-8f44-a39d8367f0b9";
export const PHOTO_API_WEBSITE = "https://example.com/";
export const defaultPhotoApiPage = {
  id: PHOTO_API_PAGE_ID,
  slug: "/api.html",
  title: "示例页面",
  description: "可以在工作台中创建自己的独立页面。",
  status: "draft" as const,
  content: { type: "doc", content: [] },
} satisfies Pick<SitePage, "id" | "slug" | "title" | "description" | "status" | "content">;

export function publicPageHref(page: Pick<SitePage, "id" | "slug">) {
  return publicPagePath(page).split("/").map(encodeURIComponent).join("/");
}

export function publicPagePath(page: Pick<SitePage, "slug">) {
  return page.slug.startsWith("/") ? page.slug : "/pages/" + page.slug;
}

export const pagePathAliasKey = (path: string) => "page_path_alias:" + path;

const reservedRoots = new Set([
  "api", "studio", "projects", "posts", "about", "portal", "github", "media", "uploads", "_next", ".well-known",
  "favicon.ico", "icon.png", "apple-icon.png", "avatar.webp", "robots.txt", "sitemap.xml", "manifest.webmanifest",
]);

export function pagePathError(value: string): string | null {
  if (!value.startsWith("/")) {
    return /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u.test(value) ? null : "请输入 /photo-api、/docs/photo 这样的站内路径";
  }
  const segments = value.slice(1).split("/");
  if (!segments.length || segments.some((segment) => !/^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u.test(segment))) {
    return "路径可包含字母、数字、连字符、下划线和点，用 / 分隔；不能包含空格、参数或空路径段";
  }
  if (reservedRoots.has(segments[0].toLowerCase())) return "这个路径已由网站功能或静态文件使用，请换一个路径";
  if (segments[0] === "pages" && segments.length !== 2) return "/pages 下请使用单层路径，或改用 /docs/photo 这样的自定义路径";
  return null;
}
