export function safeSiteUrl(value: string | undefined, allowMailto = false): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) {
    if (trimmed.startsWith("//") || trimmed.includes("\\") || /[\x00-\x1f\x7f\s]/.test(trimmed)) return null;
    try {
      const url = new URL(trimmed, "https://site.invalid");
      return url.origin === "https://site.invalid" ? url.pathname + url.search + url.hash : null;
    } catch {
      return null;
    }
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
    if (allowMailto && url.protocol === "mailto:" && url.pathname.trim()) return url.href;
  } catch {
    return null;
  }
  return null;
}

export function isSiteMediaUrl(value: string) {
  const path = value.split(/[?#]/, 1)[0];
  return path === "/avatar.webp" || path.startsWith("/media/") || path.startsWith("/uploads/");
}
