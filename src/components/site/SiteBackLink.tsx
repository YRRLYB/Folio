import type { ReactNode } from "react";
import { SiteTransferButton } from "./SiteTransferButton";

export function SiteBackLink({ fallbackHref = "/projects", children = "返回项目" }: { fallbackHref?: string; children?: ReactNode }) {
  return <SiteTransferButton href={fallbackHref} variant="quiet" direction="back">{children}</SiteTransferButton>;
}
