"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import type { MouseEvent } from "react";

type Props = React.ComponentProps<typeof Link>;

export function RouteLink({ href, onClick, target, ...props }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const navigationTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    // A saved old path can redirect back to the current pathname. Navigation
    // completion must restore the page even when the pathname does not change.
    if (!isPending) {
      delete document.documentElement.dataset.routeLeaving;
      delete document.documentElement.dataset.routeScrollTop;
    }
  }, [pathname, isPending]);

  useEffect(() => () => {
    if (navigationTimer.current !== undefined) {
      window.clearTimeout(navigationTimer.current);
      delete document.documentElement.dataset.routeLeaving;
      delete document.documentElement.dataset.routeScrollTop;
    }
  }, []);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      target === "_blank" ||
      typeof href !== "string" ||
      !href.startsWith("/") ||
      href.startsWith("//") ||
      href.split(/[?#]/)[0] === pathname
    ) {
      return;
    }

    if (props.scroll !== false && !href.includes("#")) {
      document.documentElement.dataset.routeScrollTop = "true";
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    event.preventDefault();
    window.clearTimeout(navigationTimer.current);
    document.documentElement.dataset.routeLeaving = "true";
    navigationTimer.current = window.setTimeout(() => {
      navigationTimer.current = undefined;
      startTransition(() => router.push(href, { scroll: props.scroll }));
    }, 170);
  }

  return <Link href={href} target={target} onClick={handleClick} {...props} />;
}
