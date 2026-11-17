"use client";

import { useEffect, useRef, type ComponentProps } from "react";

// Keep the reserved image space stable, including when a remote image fails.
export function SiteMediaImage(props: ComponentProps<"img">) {
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = ref.current;
    if (image) image.style.visibility = image.complete && !image.naturalWidth ? "hidden" : "";
  }, [props.src]);

  return <img {...props} alt={props.alt ?? ""} ref={ref} onError={(event) => {
    event.currentTarget.style.visibility = "hidden";
    props.onError?.(event);
  }} onLoad={(event) => {
    const image = event.currentTarget;
    image.style.visibility = "";
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      image.animate([{ opacity: 0 }, { opacity: getComputedStyle(image).opacity }], { duration: 600, easing: "ease-out" });
    }
    props.onLoad?.(event);
  }} />;
}
