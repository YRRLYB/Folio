export type ContentStatus = "draft" | "published" | "archived";

export type RichNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RichNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
};

export type RichDocument = RichNode;

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: RichDocument;
  coverImage: string | null;
  category: string | null;
  tags: string[];
  readingMinutes: number;
  viewCount: number;
  status: ContentStatus;
  featured: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: RichDocument;
  coverImage: string | null;
  status: ContentStatus;
  projectStatus: string;
  featured: boolean;
  techStack: string[];
  tags: string[];
  githubUrl: string | null;
  demoUrl: string | null;
  projectDate: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SitePage {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: RichDocument;
  status: ContentStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaAsset {
  id: string;
  url: string;
  name: string;
  alt: string;
  category: string;
  mimeType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaxonomyTerm {
  id: string;
  name: string;
  slug: string;
  usageCount: number;
}

export interface TaxonomyCatalog {
  categories: TaxonomyTerm[];
  tags: TaxonomyTerm[];
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
  order: number;
  visible: boolean;
  external: boolean;
}

export interface SocialLink {
  id: string;
  label: string;
  url: string;
  kind: string;
  order: number;
  visible: boolean;
}

export interface HomeSection {
  enabled: boolean;
  title: string;
  description: string;
  order: number;
  image?: string;
  backgroundImage?: string;
  backgroundColor?: string;
  linkHref?: string;
  linkLabel?: string;
  motion?: "none" | "fade" | "rise";
}

export interface SiteConfig {
  site: {
    title: string;
    description: string;
    name: string;
    tagline: string;
    bio: string;
    status: string;
    interests: string[];
    focus: string[];
    avatar: string;
    avatarShape: "circle" | "square" | "rounded";
    avatarSize: number;
  };
  theme: {
    accent: string;
    font: string;
    radius: number;
    mode: "light" | "dark" | "system";
  };
  background: {
    type: "none" | "local" | "url" | "api";
    endpoint: string;
    refresh: "page" | "session" | "daily";
    opacity: number;
    blur: number;
    overlay: boolean;
  };
  github: { username: string };
  navigation: NavItem[];
  social: SocialLink[];
  homepage: Record<string, HomeSection>;
}

export interface GithubData {
  profile: {
    name: string | null;
    bio: string | null;
    avatarUrl: string;
    followers: number;
    publicRepos: number;
    htmlUrl: string;
  } | null;
  repositories: {
    name: string;
    description: string | null;
    htmlUrl: string;
    stargazersCount: number;
    forksCount: number;
    language: string | null;
    updatedAt: string;
  }[];
  contributions: { date: string; count: number; level: number }[];
  contributionTotal: number | null;
  contributionSource: "graphql" | "public" | null;
  events: { id: string; type: string; repoName: string; url: string; createdAt: string }[];
  unavailable: boolean;
}
