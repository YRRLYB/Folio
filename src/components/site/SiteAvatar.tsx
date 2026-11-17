"use client";

import { useState } from "react";

interface Props {
  src: string;
  name: string;
  size?: number;
  shape?: "circle" | "square" | "rounded";
  className?: string;
}

export function SiteAvatar({ src, name, size = 88, shape = "circle", className = "" }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc === src;
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <span className={"site-avatar site-avatar-" + shape + " " + className} style={{ width: size, height: size }}>
      {!failed && src ? <img src={src} alt={name + " 的头像"} width={size} height={size} onError={() => setFailedSrc(src)} /> : null}
      {failed || !src ? <span className="site-avatar-fallback" aria-label={name}>{initials}</span> : null}
    </span>
  );
}
