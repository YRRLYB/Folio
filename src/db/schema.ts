import {
  boolean,
  customType,
  integer,
  index,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

// Better Auth core tables. Property names are the adapter's model field names.
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const contentStatus = pgEnum("content_status", ["draft", "published", "archived"]);
export const contentKind = pgEnum("content_kind", ["post", "project", "page"]);

const contentBase = () => ({
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 220 }).notNull().unique(),
  title: text("title").notNull(),
  content: jsonb("content").$type<Record<string, unknown>>().notNull().default({ type: "doc", content: [] }),
  status: contentStatus("status").notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const posts = pgTable("posts", {
  ...contentBase(),
  excerpt: text("excerpt").notNull().default(""),
  coverImage: text("cover_image"),
  category: text("category"),
  tags: text("tags").array().notNull().default([]),
  readingMinutes: integer("reading_minutes").notNull().default(1),
  viewCount: integer("view_count").notNull().default(0),
  featured: boolean("featured").notNull().default(false),
});

export const postComments = pgTable("post_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  author: varchar("author", { length: 40 }).notNull(),
  content: text("content").notNull(),
  approved: boolean("approved").notNull().default(false),
  clientHash: varchar("client_hash", { length: 64 }).notNull(),
  createdAt: createdAt(),
}, (table) => [
  index("post_comments_post_approved_created_idx").on(table.postId, table.approved, table.createdAt),
  index("post_comments_client_created_idx").on(table.clientHash, table.createdAt),
]);

export const projects = pgTable("projects", {
  ...contentBase(),
  description: text("description").notNull().default(""),
  projectStatus: text("project_status").notNull().default("active"),
  coverImage: text("cover_image"),
  techStack: text("tech_stack").array().notNull().default([]),
  tags: text("tags").array().notNull().default([]),
  githubUrl: text("github_url"),
  demoUrl: text("demo_url"),
  projectDate: timestamp("project_date", { withTimezone: true }),
  featured: boolean("featured").notNull().default(false),
});

export const pages = pgTable("pages", {
  ...contentBase(),
  description: text("description").notNull().default(""),
});

export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  url: text("url").notNull().unique(),
  alt: text("alt").notNull().default(""),
  category: text("category").notNull().default("image"),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

export const mediaBlobs = pgTable("media_blobs", {
  mediaId: uuid("media_id").primaryKey().references(() => media.id, { onDelete: "cascade" }),
  data: bytea("data").notNull(),
});

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
});

export const navigation = pgTable("navigation", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: text("label").notNull(),
  href: text("href").notNull(),
  position: integer("position").notNull().default(0),
  visible: boolean("visible").notNull().default(true),
  external: boolean("external").notNull().default(false),
});

export const socialLinks = pgTable("social_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: text("label").notNull(),
  url: text("url").notNull(),
  icon: text("icon").notNull().default("link"),
  position: integer("position").notNull().default(0),
  visible: boolean("visible").notNull().default(true),
});

export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull(),
  updatedAt: updatedAt(),
});

export const backgroundSources = pgTable("background_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  endpoint: text("endpoint").notNull(),
  refresh: text("refresh").notNull().default("page"),
  opacity: real("opacity").notNull().default(0.3),
  blur: real("blur").notNull().default(8),
  overlay: boolean("overlay").notNull().default(true),
  active: boolean("active").notNull().default(false),
  createdAt: createdAt(),
});

export const revisions = pgTable("revisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: contentKind("kind").notNull(),
  resourceId: uuid("resource_id").notNull(),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
  createdAt: createdAt(),
});
