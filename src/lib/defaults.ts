import type { Project, SiteConfig } from "@/lib/types";

// Change these starter values, or edit them later in Studio.
export const defaultSiteConfig: SiteConfig = {
  site: {
    title: "Your Blog",
    description: "一个记录文章、想法与作品的个人空间。",
    name: "Your Name",
    tagline: "记录想法，分享作品。",
    bio: "在工作台中编辑这段介绍，讲讲你自己。",
    status: "欢迎来到我的博客",
    interests: ["阅读", "创作"],
    focus: ["设计", "开发", "生活"],
    avatar: "/avatar.webp",
    avatarShape: "circle",
    avatarSize: 88,
  },
  theme: { accent: "#76594c", font: "sans", radius: 8, mode: "system" },
  background: { type: "none", endpoint: "", refresh: "page", opacity: 0.28, blur: 10, overlay: true },
  github: { username: "" },
  navigation: [
    { id: "home", label: "首页", href: "/", order: 0, visible: true, external: false },
    { id: "projects", label: "项目", href: "/projects", order: 1, visible: true, external: false },
    { id: "posts", label: "文章", href: "/posts", order: 2, visible: true, external: false },
    { id: "about", label: "关于", href: "/about", order: 3, visible: true, external: false },
    { id: "portal", label: "传送门", href: "/portal", order: 4, visible: true, external: false },
  ],
  social: [],
  homepage: {
    hero: { enabled: true, title: "Your Name", description: "在这里介绍自己，分享你的想法与作品。", order: 0 },
    projects: { enabled: true, title: "精选项目", description: "一些正在进行的创作。", order: 1 },
    github: { enabled: true, title: "GitHub", description: "", order: 2 },
    posts: { enabled: true, title: "最近文章", description: "想法、笔记与故事。", order: 3 },
    portal: { enabled: true, title: "其他入口", description: "", order: 4 },
    about: { enabled: false, title: "关于我", description: "", order: 5 },
    footer: { enabled: true, title: "保持联系", description: "", order: 6 },
  },
};

// A placeholder for the public demo when no database is configured.
export const legacyProjects: Project[] = [{
  id: "example-project", slug: "example-project", title: "示例项目",
  description: "在 Studio 中编辑或删除这个示例，添加你自己的项目。",
  content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "这里可以介绍项目的背景、过程和成果。" }] }] },
  status: "published", projectStatus: "active", featured: true, coverImage: null,
  techStack: [], tags: ["示例"], githubUrl: null, demoUrl: null, projectDate: null,
  publishedAt: null, createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z",
}];
