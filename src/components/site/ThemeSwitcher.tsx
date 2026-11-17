"use client";

import { useRef, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

export function ThemeSwitcher({ initialMode, preview = false }: { initialMode: ThemeMode; preview?: boolean }) {
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const ref = useRef<HTMLSelectElement>(null);

  function changeMode(next: ThemeMode) {
    setMode(next);
    const shell = ref.current?.closest<HTMLElement>(".site-shell");
    if (shell) shell.dataset.theme = next;
    if (!preview) {
      document.documentElement.dataset.siteTheme = next;
      document.cookie = `site-theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    }
  }

  return <label className="site-theme-control">
    <span className="sr-only">显示主题</span>
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true"><path d="M20.2 15.4A8.4 8.4 0 0 1 8.6 3.8a8.5 8.5 0 1 0 11.6 11.6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
    <select ref={ref} value={mode} onChange={(event) => changeMode(event.target.value as ThemeMode)}>
      <option value="system">跟随系统</option>
      <option value="light">浅色</option>
      <option value="dark">深色</option>
    </select>
    <svg className="site-theme-chevron" viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </label>;
}
