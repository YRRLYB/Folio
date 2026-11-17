import type { ReactNode } from "react";
import type { RichDocument, RichNode } from "@/lib/types";
import { safeSiteUrl } from "@/lib/site-url";
import { SiteTransferButton } from "./SiteTransferButton";
import "./rich-content.css";

export interface HeadingEntry { id: string; text: string; level: number }

function plainText(node: RichNode): string {
  return (node.text || "") + (node.content || []).map(plainText).join("");
}

function slug(text: string) {
  return text.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "section";
}

function headingLevel(node: RichNode) {
  const raw = Number(node.attrs?.level || 2);
  return Math.min(4, Math.max(2, raw));
}

export function extractHeadings(document: RichDocument): HeadingEntry[] {
  const headings: HeadingEntry[] = [];
  const duplicates = new Map<string, number>();
  function walk(nodes: RichNode[]) {
    for (const node of nodes) {
      if (node.type === "heading") {
        const text = plainText(node).trim();
        const base = slug(text);
        const index = (duplicates.get(base) || 0) + 1;
        duplicates.set(base, index);
        headings.push({ id: index === 1 ? base : base + "-" + index, text, level: headingLevel(node) });
      }
      if (node.content) walk(node.content);
    }
  }
  walk(document.content || []);
  return headings;
}

function safeUrl(value: unknown, media = false) {
  return typeof value === "string" ? safeSiteUrl(value, !media) : null;
}

function transferBlock(href: string, label: string, key: number | string): ReactNode {
  return <div key={key} className="site-rich-transfer"><SiteTransferButton href={href} label={label} /></div>;
}

function renderText(node: RichNode): ReactNode {
  let content: ReactNode = node.text || "";
  for (const mark of node.marks || []) {
    if (mark.type === "bold") content = <strong>{content}</strong>;
    else if (mark.type === "italic") content = <em>{content}</em>;
    else if (mark.type === "strike") content = <s>{content}</s>;
    else if (mark.type === "underline") content = <u>{content}</u>;
    else if (mark.type === "code") content = <code>{content}</code>;
    else if (mark.type === "link") {
      const href = safeUrl(mark.attrs?.href);
      if (href) content = <a href={href} rel={href.startsWith("http") ? "noopener noreferrer" : undefined} target={href.startsWith("http") ? "_blank" : undefined}>{content}</a>;
    }
  }
  return content;
}

function customBlock(kind: string, value: string, detail: string, key: number | string): ReactNode {
  if (kind === "gallery") {
    const images = value.split(/[,\n]/).map((item) => safeUrl(item.trim(), true)).filter((item): item is string => Boolean(item));
    return images.length ? <figure key={key} className="site-rich-gallery">{images.map((src, index) => <img key={src + index} src={src} alt={detail || "画廊图片 " + (index + 1)} loading="lazy" />)}{detail ? <figcaption>{detail}</figcaption> : null}</figure> : null;
  }
  if (kind === "notice") return <aside key={key} className="site-rich-notice"><p>{value}</p>{detail ? <small>{detail}</small> : null}</aside>;
  if (kind === "timeline") return <ol key={key} className="site-rich-timeline"><li><time>{value}</time>{detail ? <strong>{detail}</strong> : null}</li></ol>;
  if (kind === "project") {
    const slug = value.trim();
    return /^[\p{L}\p{N}_-]+$/u.test(slug) ? transferBlock("/projects/" + encodeURIComponent(slug), detail || slug, key) : <aside key={key} className="site-rich-notice">{detail || value}</aside>;
  }
  if (kind === "github") {
    const repo = value.trim();
    const href = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repo) ? "https://github.com/" + repo : safeUrl(repo);
    return href ? transferBlock(href, detail || repo, key) : <aside key={key} className="site-rich-notice">{detail || value}</aside>;
  }
  if (kind === "custom") return <aside key={key} className="site-rich-notice"><strong>{value || "自定义组件"}</strong>{detail ? <p>{detail}</p> : null}</aside>;
  if (kind === "video" || kind === "music") {
    const source = safeUrl(value, true);
    if (!source) return null;
    if (kind === "video") {
      const url = new URL(source, "https://youtube.com");
      if (["youtube.com", "www.youtube.com", "youtu.be", "www.youtube-nocookie.com"].includes(url.hostname)) {
        const id = url.hostname === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v") || url.pathname.split("/").pop();
        if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return <figure key={key} className="site-rich-video"><iframe src={"https://www.youtube-nocookie.com/embed/" + id} title={detail || "视频"} loading="lazy" allowFullScreen />{detail ? <figcaption>{detail}</figcaption> : null}</figure>;
      }
      if (/\.(mp4|webm|ogg)(?:[?#]|$)/i.test(source)) return <figure key={key}><video src={source} controls preload="metadata" style={{ width: "100%" }} />{detail ? <figcaption>{detail}</figcaption> : null}</figure>;
    }
    if (kind === "music" && /\.(mp3|m4a|ogg|wav|flac)(?:[?#]|$)/i.test(source)) return <figure key={key}><audio src={source} controls preload="metadata" style={{ width: "100%" }} />{detail ? <figcaption>{detail}</figcaption> : null}</figure>;
    return transferBlock(source, detail || (kind === "video" ? "观看视频" : "收听音乐"), key);
  }
  return <aside key={key} className="site-rich-notice"><strong>{kind}</strong><p>{detail || value}</p></aside>;
}

export function RichContent({ document, className = "" }: { document: RichDocument; className?: string }) {
  const headings = extractHeadings(document);
  let headingIndex = 0;

  function render(node: RichNode, key: number | string): ReactNode {
    const children = () => (node.content || []).map((child, index) => render(child, index));
    const attrs = node.attrs || {};
    switch (node.type) {
      case "doc": return <div key={key}>{children()}</div>;
      case "text": return <span key={key}>{renderText(node)}</span>;
      case "paragraph": return <p key={key}>{children()}</p>;
      case "heading": {
        const entry = headings[headingIndex++];
        const level = headingLevel(node);
        if (level === 3) return <h3 key={key} id={entry?.id}>{children()}</h3>;
        if (level === 4) return <h4 key={key} id={entry?.id}>{children()}</h4>;
        return <h2 key={key} id={entry?.id}>{children()}</h2>;
      }
      case "bulletList": case "taskList": return <ul key={key}>{children()}</ul>;
      case "orderedList": return <ol key={key} start={typeof attrs.start === "number" ? attrs.start : undefined}>{children()}</ol>;
      case "listItem": case "taskItem": return <li key={key}>{children()}</li>;
      case "blockquote": return <blockquote key={key}>{children()}</blockquote>;
      case "codeBlock": return <pre key={key} data-language={typeof attrs.language === "string" ? attrs.language : undefined}><code>{plainText(node)}</code></pre>;
      case "hardBreak": return <br key={key} />;
      case "horizontalRule": return <hr key={key} />;
      case "transferButton": return <div className="site-rich-transfer" key={key}><SiteTransferButton href={typeof attrs.href === "string" ? attrs.href : undefined} variant={attrs.variant === "primary" ? "primary" : "secondary"} label={typeof attrs.label === "string" ? attrs.label : "前往查看"} /></div>;
      case "image": {
        const src = safeUrl(attrs.src, true);
        if (!src) return null;
        const alt = typeof attrs.alt === "string" ? attrs.alt : "文章图片";
        const caption = typeof attrs.caption === "string" ? attrs.caption : null;
        return <figure key={key}><img src={src} alt={alt} loading="lazy" />{caption ? <figcaption>{caption}</figcaption> : null}</figure>;
      }
      case "gallery": {
        const images = Array.isArray(attrs.images) ? attrs.images : [];
        return <figure key={key} className="site-rich-gallery">{images.map((item: unknown, index: number) => { const data = typeof item === "object" && item ? item as Record<string, unknown> : {}; const src = safeUrl(typeof item === "string" ? item : data.src || data.url, true); return src ? <img key={index} src={src} alt={typeof data.alt === "string" ? data.alt : "画廊图片"} loading="lazy" /> : null; })}</figure>;
      }
      case "notice": return <aside key={key} className="site-rich-notice">{typeof attrs.title === "string" ? <strong>{attrs.title}</strong> : null}{children()}</aside>;
      case "customBlock": return customBlock(typeof attrs.kind === "string" ? attrs.kind : "custom", typeof attrs.value === "string" ? attrs.value : "", typeof attrs.detail === "string" ? attrs.detail : "", key);
      case "timeline": {
        const items = Array.isArray(attrs.items) ? attrs.items : [];
        return items.length ? <ol key={key} className="site-rich-timeline">{items.map((item: unknown, index: number) => { const data = typeof item === "object" && item ? item as Record<string, unknown> : {}; return <li key={index}>{typeof data.date === "string" ? <time>{data.date}</time> : null}<strong>{typeof data.title === "string" ? data.title : ""}</strong>{typeof data.description === "string" ? <p>{data.description}</p> : null}</li>; })}</ol> : <ol key={key}>{children()}</ol>;
      }
      case "video": {
        const src = safeUrl(attrs.src || attrs.url, true);
        return src ? <figure key={key}><video src={src} controls preload="metadata" style={{ width: "100%" }} /></figure> : null;
      }
      case "music": {
        const src = safeUrl(attrs.src || attrs.url, true);
        return src ? <figure key={key}><audio src={src} controls preload="metadata" style={{ width: "100%" }} /></figure> : null;
      }
      case "youtube": {
        const source = safeUrl(attrs.src || attrs.url, true);
        if (!source) return null;
        const url = new URL(source, "https://youtube.com");
        if (!["youtube.com", "www.youtube.com", "youtu.be", "www.youtube-nocookie.com"].includes(url.hostname)) return null;
        const videoId = url.hostname === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v") || url.pathname.split("/").pop();
        return videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId) ? <figure key={key} className="site-rich-video"><iframe src={"https://www.youtube-nocookie.com/embed/" + videoId} title={typeof attrs.title === "string" ? attrs.title : "视频"} loading="lazy" allowFullScreen /></figure> : null;
      }
      case "project": case "github": case "link": {
        const projectSlug = typeof attrs.slug === "string" && /^[a-zA-Z0-9_-]+$/.test(attrs.slug) ? "/projects/" + attrs.slug : null;
        const repo = typeof attrs.repo === "string" && /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(attrs.repo) ? "https://github.com/" + attrs.repo : null;
        const href = safeUrl(attrs.href || attrs.url || (node.type === "project" ? projectSlug : node.type === "github" ? repo : null));
        const label = typeof attrs.title === "string" ? attrs.title : node.type === "github" ? "查看 GitHub 项目" : "查看链接";
        return href ? transferBlock(href, label, key) : <div key={key} className="site-rich-embed">{children()}</div>;
      }
      case "custom": case "customComponent": return <aside key={key} className="site-rich-notice">{typeof attrs.title === "string" ? <strong>{attrs.title}</strong> : null}{typeof attrs.description === "string" ? <p>{attrs.description}</p> : children()}</aside>;
      default: return <div key={key}>{children()}</div>;
    }
  }

  return <div className={"site-rich-content " + className}>{(document.content || []).map((node, index) => render(node, index))}</div>;
}

export function TableOfContents({ headings }: { headings: HeadingEntry[] }) {
  if (!headings.length) return null;
  return <nav className="site-toc" aria-label="文章目录"><span className="site-toc-title">本文目录</span>{headings.map((entry) => <a key={entry.id} href={"#" + entry.id} data-level={entry.level}>{entry.text}</a>)}</nav>;
}
