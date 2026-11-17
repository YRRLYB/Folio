"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function HomeScroll({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const home = ref.current;
    if (!home) return;
    const desktop = window.matchMedia("(min-width: 951px) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let releaseTimer = 0;
    let locked = false;
    let animating = false;
    let wheelTotal = 0;
    let lastWheel = 0;

    const headerHeight = () => document.querySelector<HTMLElement>(".site-header")?.offsetHeight ?? 66;
    const unlock = () => {
      locked = false;
      wheelTotal = 0;
      delete document.documentElement.dataset.homeScrolling;
    };
    const release = () => {
      window.clearTimeout(releaseTimer);
      // A trackpad gesture can continue after arriving. Consume its remaining
      // momentum before accepting another gesture, so one swipe means one page.
      releaseTimer = window.setTimeout(() => { if (!animating) unlock(); }, 220);
    };
    const cancel = () => {
      cancelAnimationFrame(frame);
      animating = false;
      window.clearTimeout(releaseTimer);
      unlock();
    };
    const moveTo = (panel: HTMLElement, top: number, focus = false) => {
      cancel();
      const start = window.scrollY;
      const destination = Math.max(0, Math.min(top, document.documentElement.scrollHeight - window.innerHeight));
      if (reducedMotion.matches || Math.abs(destination - start) < 1) {
        window.scrollTo({ top: destination, behavior: "instant" });
        if (focus) panel.focus({ preventScroll: true });
        return;
      }
      locked = true;
      animating = true;
      document.documentElement.dataset.homeScrolling = "true";
      const startedAt = performance.now();
      const duration = Math.min(900, Math.max(560, Math.abs(destination - start) * .25 + 600));
      const tick = (now: number) => {
        const progress = Math.min((now - startedAt) / duration, 1);
        // Smooth acceleration and a still landing, with no overshoot or second
        // transform animation competing with the actual document scroll.
        const eased = progress * progress * progress * (progress * (progress * 6 - 15) + 10);
        window.scrollTo({ top: start + (destination - start) * eased, behavior: "instant" });
        if (progress < 1) frame = requestAnimationFrame(tick);
        else {
          animating = false;
          if (focus) panel.focus({ preventScroll: true });
          release();
        }
      };
      frame = requestAnimationFrame(tick);
    };
    const onWheel = (event: WheelEvent) => {
      if (!desktop.matches || reducedMotion.matches || document.documentElement.classList.contains("site-qq-browser") || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || document.querySelector('[data-site-entrance="loading"]')) return;
      if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable=true], [role=dialog]")) return;
      if (locked) {
        event.preventDefault();
        release();
        return;
      }
      // Charts and long content retain native scrolling inside their own area.
      for (let element = event.target instanceof Element ? event.target : null; element && element !== home; element = element.parentElement) {
        if (element.scrollHeight > element.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(element).overflowY)) return;
      }
      const header = headerHeight();
      const height = window.innerHeight - header;
      const panels = [...home.querySelectorAll<HTMLElement>(".site-home-panel")];
      const index = panels.findIndex((panel) => {
        const rect = panel.getBoundingClientRect();
        return rect.top <= header + 4 && rect.bottom > header + 4;
      });
      if (index < 0) return;
      const direction = Math.sign(event.deltaY);
      const next = panels[index + direction];
      if (!direction || !next) return;
      const rect = panels[index].getBoundingClientRect();
      // Never skip the middle of a section that needs more than one screen.
      if (rect.height > height + 4 && (direction > 0 ? rect.bottom > window.innerHeight + 4 : rect.top < header - 4)) return;
      event.preventDefault();
      const now = performance.now();
      if (now - lastWheel > 200 || Math.sign(wheelTotal) !== direction) wheelTotal = 0;
      lastWheel = now;
      wheelTotal += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
      if (Math.abs(wheelTotal) < 32) return;
      const top = window.scrollY + next.getBoundingClientRect().top - header;
      moveTo(next, direction < 0 ? top + Math.max(0, next.offsetHeight - height) : top);
    };
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-home-target]") : null;
      if (!link?.dataset.homeTarget) return;
      const panel = document.getElementById(link.dataset.homeTarget);
      if (!panel || !home.contains(panel)) return;
      event.preventDefault();
      moveTo(panel, window.scrollY + panel.getBoundingClientRect().top - headerHeight(), true);
    };

    home.addEventListener("click", onClick);
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("pointerdown", cancel);
    window.addEventListener("keydown", cancel);
    window.addEventListener("resize", cancel);
    reducedMotion.addEventListener("change", cancel);
    return () => {
      cancel();
      home.removeEventListener("click", onClick);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointerdown", cancel);
      window.removeEventListener("keydown", cancel);
      window.removeEventListener("resize", cancel);
      reducedMotion.removeEventListener("change", cancel);
    };
  }, []);

  return <div className="site-home" ref={ref}>{children}</div>;
}
