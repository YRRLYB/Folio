"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export function Reveal({ children, className = "", motion = "rise" }: { children: ReactNode; className?: string; motion?: "none" | "fade" | "rise" }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || !window.IntersectionObserver || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.08, rootMargin: "0px 0px 40px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const style = motion === "none" ? { opacity: 1, transform: "none", transition: "none" } : motion === "fade" ? { transform: "none" } : undefined;
  return <div ref={ref} className={"site-reveal " + (visible ? "is-visible " : "") + className} style={style}>{children}</div>;
}
