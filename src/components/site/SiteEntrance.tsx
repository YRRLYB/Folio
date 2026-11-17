"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SiteConfig } from "@/lib/types";
import { BackgroundScene } from "@/components/site/BackgroundScene";
import styles from "./site-entrance.module.css";

function waitForImage(image: HTMLImageElement, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const complete = () => {
      image.removeEventListener("load", loaded);
      image.removeEventListener("error", complete);
      signal.removeEventListener("abort", complete);
      resolve();
    };
    const loaded = () => { if (typeof image.decode === "function") void image.decode().catch(() => {}).then(complete); else complete(); };
    if (signal.aborted) { complete(); return; }
    signal.addEventListener("abort", complete, { once: true });
    if (image.complete) { loaded(); return; }
    image.addEventListener("load", loaded, { once: true });
    image.addEventListener("error", complete, { once: true });
  });
}

export function SiteEntrance({ background, name }: { background: SiteConfig["background"]; name: string }) {
  const [phase, setPhase] = useState<"loading" | "leaving" | "done">("loading");
  const overlay = useRef<HTMLDivElement>(null);
  const backgroundReady = useRef(false);
  const backgroundComplete = useRef<(() => void) | null>(null);
  const enter = useRef<() => void>(() => {});
  const onBackgroundSettled = useCallback(() => {
    backgroundReady.current = true;
    backgroundComplete.current?.();
  }, []);

  useEffect(() => {
    const element = overlay.current;
    const shell = element?.closest<HTMLElement>(".site-shell");
    if (!element || !shell) return;
    const controller = new AbortController();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animations: Animation[] = [];
    const inertElements: { element: HTMLElement; inert: boolean }[] = [];
    let finished = false;
    let started = false;
    let minimum = 0;
    let deadline = 0;
    let dismissal = 0;

    function restoreContent() {
      for (const item of inertElements) item.element.inert = item.inert;
    }

    function finish() {
      if (finished) return;
      finished = true;
      window.clearTimeout(minimum);
      window.clearTimeout(deadline);
      controller.abort();
      restoreContent();
      if (element?.contains(document.activeElement)) (document.activeElement as HTMLElement | null)?.blur();
      setPhase(reducedMotion ? "done" : "leaving");
      if (!reducedMotion && started) {
        const targets = shell!.querySelectorAll<HTMLElement>(".site-hero-topline, .site-hero-main, .site-hero-bottom");
        targets.forEach((target, index) => {
          animations.push(target.animate([
            { opacity: 0, transform: "translateY(18px)" },
            { opacity: 1, transform: "translateY(0)" },
          ], { duration: 760, delay: 100 + index * 65, easing: "cubic-bezier(.16, 1, .3, 1)", fill: "backwards" }));
        });
      }
      dismissal = window.setTimeout(() => setPhase("done"), reducedMotion ? 0 : 680);
    }

    enter.current = finish;
    const preventScroll = (event: Event) => { if (!finished) event.preventDefault(); };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
      else if (!finished && ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End"].includes(event.key)) event.preventDefault();
    };
    element.addEventListener("wheel", preventScroll, { passive: false });
    element.addEventListener("touchmove", preventScroll, { passive: false });
    window.addEventListener("keydown", escape);

    const frame = window.requestAnimationFrame(() => {
      started = true;
      for (const child of shell.children) {
        if (child instanceof HTMLElement && /^(HEADER|MAIN|FOOTER)$/.test(child.tagName)) {
          inertElements.push({ element: child, inert: child.inert });
          child.inert = true;
        }
      }
      const images = Array.from(shell.querySelectorAll<HTMLImageElement>("img")).filter((image) => {
        if (image.closest(".site-background")) return false;
        const rect = image.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom >= 0 && rect.width > 0;
      });
      const backgroundLoaded = new Promise<void>((resolve) => {
        if (backgroundReady.current) resolve();
        else backgroundComplete.current = resolve;
      });
      const briefPause = new Promise<void>((resolve) => { minimum = window.setTimeout(resolve, reducedMotion ? 0 : 480); });
      void Promise.all([backgroundLoaded, briefPause, ...images.map((image) => waitForImage(image, controller.signal))]).then(() => {
        if (!controller.signal.aborted) finish();
      });
      // Remote backgrounds should never hold the page indefinitely.
      deadline = window.setTimeout(finish, 4_500);
    });

    return () => {
      finished = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(minimum);
      window.clearTimeout(deadline);
      window.clearTimeout(dismissal);
      window.removeEventListener("keydown", escape);
      element.removeEventListener("wheel", preventScroll);
      element.removeEventListener("touchmove", preventScroll);
      backgroundComplete.current = null;
      controller.abort();
      restoreContent();
      animations.forEach((animation) => animation.cancel());
    };
  }, []);

  return <>
    <BackgroundScene background={background} onSettled={onBackgroundSettled} />
    <div ref={overlay} className={styles.overlay} data-site-entrance={phase} hidden={phase === "done"} aria-hidden={phase !== "loading"}>
      <div className={styles.center} role="status" aria-live="polite">
        <svg className={styles.spark} width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true"><path d="M17 2C17 12 12 17 2 17C12 17 17 22 17 32C17 22 22 17 32 17C22 17 17 12 17 2Z" stroke="currentColor" strokeWidth="1.3" /></svg>
        <p className={styles.name}>{name}</p>
        <span className={styles.track} aria-hidden="true"><span /></span>
        <p className={styles.caption}>正在准备画面</p>
      </div>
      <button type="button" className={styles.skip} tabIndex={phase === "loading" ? 0 : -1} onClick={() => enter.current()}>直接进入 <span aria-hidden="true">↗</span></button>
    </div>
  </>;
}
