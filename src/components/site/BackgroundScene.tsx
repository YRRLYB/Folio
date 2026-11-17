"use client";

import { useEffect, useRef, useState } from "react";
import type { SiteConfig } from "@/lib/types";

type Background = SiteConfig["background"];

function safeImageUrl(value: string, base?: string): string | null {
  if (!base && value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value, base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

export function BackgroundScene({ background, onSettled }: { background: Background; onSettled?: () => void }) {
  const renderKey = background.type + ":" + background.endpoint + ":" + background.refresh;
  const [resolved, setResolved] = useState<{ key: string; image: string | null; ready: boolean }>({ key: renderKey, image: null, ready: false });
  const request = useRef(0);
  const settleImage = useRef<(image: HTMLImageElement | null) => void>(() => {});
  const current = resolved.key === renderKey ? resolved : { key: renderKey, image: null, ready: false };

  useEffect(() => {
    const generation = ++request.current;
    const controller = new AbortController();
    let objectUrl: string | null = null;
    let settled = false;
    let cacheUrl: string | null = null;
    let storage: Storage | null = null;
    const key = "site-background:" + background.endpoint + ":" + background.refresh + (background.refresh === "daily" ? ":" + new Date().toISOString().slice(0, 10) : "");
    try { storage = background.refresh === "daily" ? localStorage : sessionStorage; } catch { /* Storage can be disabled. */ }

    function finish(ready: boolean) {
      if (request.current !== generation || settled) return;
      settled = true;
      window.clearTimeout(timeout);
      setResolved((previous) => previous.key === renderKey ? { ...previous, ready, image: ready ? previous.image : null } : previous);
      if (ready && background.refresh !== "page" && cacheUrl) {
        try { storage?.setItem(key, cacheUrl); } catch { /* Storage can be disabled. */ }
      }
      onSettled?.();
    }

    // The entrance can finish earlier; a stalled image request must also settle itself.
    const timeout = window.setTimeout(() => { controller.abort(); finish(false); }, 10_000);
    settleImage.current = (image) => {
      if (!image) { finish(false); return; }
      if (typeof image.decode === "function") void image.decode().catch(() => {}).then(() => finish(image.naturalWidth > 0));
      else finish(image.naturalWidth > 0);
    };

    async function resolveImage() {
      if (background.type === "none" || !background.endpoint) { finish(false); return; }
      try {
        let source: string | null = null;
        if (background.refresh !== "page") {
          try { source = safeImageUrl(storage?.getItem(key) || ""); } catch { /* Storage can be disabled. */ }
        }
        if (!source && background.type === "api") {
          try {
            const response = await fetch(background.endpoint, { signal: controller.signal, cache: background.refresh === "page" ? "no-store" : "default" });
            if (!response.ok) throw new Error("Background request failed");
            if (response.headers.get("content-type")?.includes("application/json")) {
              const payload = await response.json();
              const candidate = typeof payload === "string" ? payload : payload?.url || payload?.image || payload?.data?.url;
              source = typeof candidate === "string" ? safeImageUrl(candidate, background.endpoint) : null;
            } else if (response.headers.get("content-type")?.startsWith("image/")) {
              // Display these exact bytes: requesting a random endpoint again can select a different image.
              const blob = await response.blob();
              if (controller.signal.aborted) return;
              objectUrl = URL.createObjectURL(blob);
              source = objectUrl;
              const redirected = safeImageUrl(response.url);
              cacheUrl = redirected && redirected !== background.endpoint ? redirected : null;
            } else {
              source = safeImageUrl(background.endpoint);
            }
          } catch {
            if (controller.signal.aborted) return;
            // Cross-origin image endpoints may allow img loading while blocking fetch.
            source = safeImageUrl(background.endpoint);
          }
        }
        if (!source) source = safeImageUrl(background.endpoint);
        if (!source || controller.signal.aborted || request.current !== generation) { finish(false); return; }
        if (!objectUrl) cacheUrl = source;
        setResolved({ key: renderKey, image: source, ready: false });
      } catch {
        finish(false);
      }
    }

    void resolveImage();
    return () => {
      request.current = generation + 1;
      controller.abort();
      window.clearTimeout(timeout);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [background.endpoint, background.refresh, background.type, renderKey, onSettled]);

  if (background.type === "none") return null;
  return (
    <div className={"site-background" + (current.ready ? " is-ready" : "")} aria-hidden="true" style={{ opacity: current.ready ? Math.min(Math.max(background.opacity, 0), 1) : 0, filter: "blur(" + background.blur + "px)" }}>
      {current.image ? <img key={current.image} src={current.image} alt="" fetchPriority="high" decoding="async" onLoad={(event) => settleImage.current(event.currentTarget)} onError={() => settleImage.current(null)} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} /> : null}
    </div>
  );
}
